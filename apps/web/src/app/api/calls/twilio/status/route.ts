import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Twilio StatusCallback endpoint
// Receives call lifecycle events and upserts voice_calls records in Supabase.
// Configure as the StatusCallback URL on your Twilio phone number.
// ---------------------------------------------------------------------------

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  // Twilio signs: URL + sorted POST params
  const url = req.url;
  const params = new URLSearchParams(body);
  const sortedKeys = [...params.keys()].sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params.get(key);
  }

  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Validate Twilio signature in production
  if (process.env.NODE_ENV === "production") {
    if (!validateTwilioSignature(req, body)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const params = new URLSearchParams(body);
  const callSid = params.get("CallSid");
  const callStatus = params.get("CallStatus");
  const from = params.get("From");
  const duration = params.get("CallDuration");

  if (!callSid || !callStatus) {
    return new NextResponse("Missing required params", { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    if (callStatus === "in-progress" || callStatus === "ringing") {
      // Check if record already exists for this call
      const { data: existing } = await supabase
        .from("voice_calls")
        .select("id")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("voice_calls").insert({
          twilio_call_sid: callSid,
          source: "twilio" as const,
          caller_id: from,
          started_at: new Date().toISOString(),
          estimates_created: [],
        });
        if (error) throw error;
      }
    }

    if (callStatus === "completed") {
      // Update with duration on call completion
      const { error } = await supabase
        .from("voice_calls")
        .update({
          duration_sec: duration ? parseInt(duration, 10) : null,
          ended_at: new Date().toISOString(),
        })
        .eq("twilio_call_sid", callSid);
      if (error) throw error;
    }

    if (callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer") {
      // Mark failed calls
      const { error } = await supabase
        .from("voice_calls")
        .update({ ended_at: new Date().toISOString() })
        .eq("twilio_call_sid", callSid);
      if (error) throw error;
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls/twilio/status", callSid, callStatus });
  }

  // Twilio expects 200 with TwiML or empty body
  return new NextResponse("<Response/>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
