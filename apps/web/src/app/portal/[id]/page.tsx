"use client";

import { useEffect, useState, useCallback, type JSX } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DigitalSignature } from "@/components/DigitalSignature";
import type { Estimate, EstimateLineItem, Client, EstimateChangeOrder } from "@proestimate/shared/types";

/* ── Color constants (mirror EstimatePDF.tsx palette) ── */
const NAVY = "#1e3a5f";
const NAVY_LIGHT = "#2c5282";

/* ── Helpers ── */

function fmt(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...opts,
  });
}

const TIER_LABELS: Record<string, string> = {
  budget: "Budget",
  midrange: "Midrange",
  high_end: "High End",
  good: "Budget",
  better: "Midrange",
  best: "High End",
};

const CATEGORY_LABELS: Record<string, string> = {
  material: "Materials",
  labor: "Labor",
  subcontractor: "Subcontractors",
  equipment: "Equipment",
  other: "Other",
};

const CATEGORY_ORDER = ["material", "labor", "subcontractor", "equipment", "other"];

interface GroupedLines {
  category: string;
  label: string;
  items: EstimateLineItem[];
  subtotal: number;
}

function groupLineItems(lineItems: EstimateLineItem[]): GroupedLines[] {
  const groups: Record<string, EstimateLineItem[]> = {};
  for (const li of lineItems) {
    const cat = li.category ?? "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat]!.push(li);
  }
  return CATEGORY_ORDER.filter((cat) => groups[cat] && groups[cat]!.length > 0).map((cat) => {
    const items = groups[cat]!;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      items,
      subtotal: items.reduce(
        (sum, li) =>
          sum +
          (Number(li.extended_price) ||
            (Number(li.quantity) || 0) * (Number(li.unit_price) || 0)),
        0,
      ),
    };
  });
}

/* ── API response shape ── */

interface PortalData {
  estimate: Estimate;
  lineItems: EstimateLineItem[];
  client: Client | null;
  company: {
    name: string;
    address: string | null;
    city_state_zip: string | null;
    email: string;
    phone: string | null;
  };
  changeOrders: EstimateChangeOrder[];
}

/* ── Status badge ── */

function StatusBadge({ status }: { status: string }): JSX.Element {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    sent: { bg: "#dbeafe", color: "#1d4ed8", label: "Sent" },
    approved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
    accepted: { bg: "#f0fdf4", color: "#166534", label: "Accepted" },
    draft: { bg: "#f3f4f6", color: "#6b7280", label: "Draft" },
    expired: { bg: "#fef2f2", color: "#b91c1c", label: "Expired" },
    declined: { bg: "#fef2f2", color: "#b91c1c", label: "Declined" },
  };
  const cfg = map[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Collapsible scope section ── */

function ScopeSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}): JSX.Element | null {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "#f9fafb",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul style={{ margin: 0, padding: "10px 16px 12px 28px", listStyle: "disc", color: "#374151", fontSize: 13, lineHeight: 1.7 }}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Loading skeleton ── */

function LoadingSkeleton(): JSX.Element {
  return (
    <div style={{ maxWidth: 896, margin: "0 auto", padding: "40px 16px" }}>
      {[120, 64, 200, 160, 300].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            background: "#e5e7eb",
            borderRadius: 8,
            marginBottom: 20,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

/* ── Error state ── */

function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 440,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#111827" }}>
          Unable to Load Estimate
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
          {message}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
          If you believe this is an error, please contact{" "}
          <a href="mailto:info@northmshomepros.com" style={{ color: NAVY }}>
            info@northmshomepros.com
          </a>
        </p>
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function PortalPage(): JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);

  // Signature flow state
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signSuccess, setSignSuccess] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Decline flow state
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [declineSuccess, setDeclineSuccess] = useState(false);
  const [approvingCoId, setApprovingCoId] = useState<string | null>(null);
  const [rejectingCoId, setRejectingCoId] = useState<string | null>(null);
  const [coRejectReason, setCoRejectReason] = useState("");
  const [showCoSignature, setShowCoSignature] = useState<string | null>(null); // changeOrderId being signed
  const [coSignError, setCoSignError] = useState<string | null>(null);
  const [coProcessing, setCoProcessing] = useState(false);

  /* Fetch portal data */
  useEffect(() => {
    if (!id || !token) {
      setError("Invalid link. Please use the link provided in your email.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/portal/${id}?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(
            (json as { error?: string }).error ??
              "This estimate link is invalid or has expired.",
          );
          return;
        }
        const json = (await res.json()) as PortalData;
        setData(json);
        // Prefill signer name from client
        if (json.client?.full_name) {
          setSignerName(json.client.full_name);
        }
        if (json.client?.email) {
          setSignerEmail(json.client.email);
        }
      } catch {
        setError("A network error occurred. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id, token]);

  /* Track portal view */
  useEffect(() => {
    if (!id || !token) return;
    let mounted = true;
    const trackView = async () => {
      try {
        await fetch("/api/portal-viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateId: id }),
        });
      } catch {
        // Silently fail on tracking
      }
    };
    trackView();
    return () => {
      mounted = false;
    };
  }, [id, token]);

  /* Handle signature submission */
  const handleSign = useCallback(
    async (signatureDataUrl: string) => {
      if (!id || !token) return;
      setSigning(true);
      setSignError(null);
      try {
        const res = await fetch(
          `/api/portal/${id}/sign?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signatureDataUrl,
              signerName,
              signerEmail: signerEmail || undefined,
            }),
          },
        );
        const json = (await res.json()) as { success?: boolean; error?: string; signedAt?: string };
        if (!res.ok || !json.success) {
          setSignError(json.error ?? "Failed to save your signature. Please try again.");
          return;
        }
        setSignSuccess(true);
        setSignedAt(json.signedAt ?? new Date().toISOString());
        // Update local estimate status
        setData((prev) =>
          prev
            ? {
                ...prev,
                estimate: { ...prev.estimate, status: "accepted", accepted_at: json.signedAt ?? new Date().toISOString() },
              }
            : prev,
        );
      } catch {
        setSignError("A network error occurred. Please try again.");
      } finally {
        setSigning(false);
      }
    },
    [id, token, signerName, signerEmail],
  );

  /* Handle decline submission */
  const handleDecline = useCallback(async () => {
    if (!id || !token) return;
    setDeclining(true);
    setDeclineError(null);
    try {
      const res = await fetch(
        `/api/portal/${id}/decline?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: declineReason || undefined,
            declinerName: signerName || undefined,
          }),
        },
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setDeclineError(json.error ?? "Failed to decline. Please try again.");
        return;
      }
      setDeclineSuccess(true);
      setData((prev) =>
        prev
          ? { ...prev, estimate: { ...prev.estimate, status: "declined", declined_at: new Date().toISOString() } }
          : prev,
      );
    } catch {
      setDeclineError("A network error occurred. Please try again.");
    } finally {
      setDeclining(false);
    }
  }, [id, token, declineReason, signerName]);

  /* Handle change order: show signature pad for approval */
  const handleStartCoApproval = useCallback((changeOrderId: string) => {
    setShowCoSignature(changeOrderId);
    setCoSignError(null);
    setRejectingCoId(null);
    setCoRejectReason("");
  }, []);

  /* Handle change order: sign and approve */
  const handleCoSign = useCallback(
    async (signatureDataUrl: string) => {
      if (!id || !token || !showCoSignature) return;
      setCoProcessing(true);
      setCoSignError(null);
      try {
        const res = await fetch("/api/portal-change-order-respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estimateId: id,
            token,
            changeOrderId: showCoSignature,
            action: "approve",
            signerName: signerName || "Client",
            signatureDataUrl,
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string; signedAt?: string };
        if (!res.ok || !json.success) {
          setCoSignError(json.error ?? "Failed to approve change order. Please try again.");
          return;
        }
        // Update local data: mark as approved + signed
        setData((prev) =>
          prev
            ? {
                ...prev,
                changeOrders: prev.changeOrders.map((co) =>
                  co.id === showCoSignature
                    ? { ...co, status: "approved" as const, client_signed: true, signed_at: json.signedAt ?? new Date().toISOString() }
                    : co,
                ),
              }
            : prev,
        );
        setShowCoSignature(null);
      } catch {
        setCoSignError("A network error occurred. Please try again.");
      } finally {
        setCoProcessing(false);
      }
    },
    [id, token, showCoSignature, signerName],
  );

  /* Handle change order: show rejection form */
  const handleStartCoRejection = useCallback((changeOrderId: string) => {
    setRejectingCoId(changeOrderId);
    setCoRejectReason("");
    setCoSignError(null);
    setShowCoSignature(null);
  }, []);

  /* Handle change order: confirm rejection */
  const handleConfirmCoRejection = useCallback(
    async (changeOrderId: string) => {
      if (!id || !token) return;
      setCoProcessing(true);
      setCoSignError(null);
      try {
        const res = await fetch("/api/portal-change-order-respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estimateId: id,
            token,
            changeOrderId,
            action: "reject",
            signerName: signerName || "Client",
            reason: coRejectReason || undefined,
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) {
          setCoSignError(json.error ?? "Failed to reject change order. Please try again.");
          return;
        }
        // Update local data: mark as rejected
        setData((prev) =>
          prev
            ? {
                ...prev,
                changeOrders: prev.changeOrders.map((co) =>
                  co.id === changeOrderId
                    ? { ...co, status: "rejected" as const }
                    : co,
                ),
              }
            : prev,
        );
        setRejectingCoId(null);
        setCoRejectReason("");
      } catch {
        setCoSignError("A network error occurred. Please try again.");
      } finally {
        setCoProcessing(false);
      }
    },
    [id, token, signerName, coRejectReason],
  );

  /* Handle existing approved change order signing (legacy flow) */
  const handleApproveChangeOrder = useCallback(
    async (changeOrderId: string) => {
      if (!id || !token) return;
      setApprovingCoId(changeOrderId);
      try {
        const res = await fetch("/api/portal-change-order-sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estimateId: id,
            token,
            changeOrderId,
            signerName: signerName || "Client",
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) {
          alert(json.error ?? "Failed to sign change order. Please try again.");
          return;
        }
        // Update local data
        setData((prev) =>
          prev
            ? {
                ...prev,
                changeOrders: prev.changeOrders.map((co) =>
                  co.id === changeOrderId ? { ...co, client_signed: true, signed_at: new Date().toISOString() } : co,
                ),
              }
            : prev,
        );
      } catch {
        alert("A network error occurred. Please try again.");
      } finally {
        setApprovingCoId(null);
      }
    },
    [id, token, signerName],
  );

  /* ── Render states ── */

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="No estimate data found." />;

  const { estimate, lineItems, client, company, changeOrders } = data;
  const groups = groupLineItems(lineItems);
  const canSign =
    !signSuccess &&
    !declineSuccess &&
    (estimate.status === "sent" || estimate.status === "approved");
  const isAccepted = estimate.status === "accepted" || signSuccess;
  const isDeclined = estimate.status === "declined" || declineSuccess;

  const companyName = company.name || "North MS Home Pros";
  const companyEmail = company.email || "info@northmshomepros.com";

  /* ── Full render ── */

  return (
    <>
      {/* Print + pulse keyframe styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; overflow: auto !important; }
          .portal-root { background: #ffffff !important; padding: 0 !important; }
          .portal-card { box-shadow: none !important; margin-bottom: 0 !important; }
        }
        @media (max-width: 640px) {
          .portal-root {
            padding: 16px 12px 32px !important;
          }
          .portal-card {
            border-radius: 8px !important;
            margin-bottom: 12px !important;
          }
          h1 { font-size: 18px !important; }
          h2 { font-size: 14px !important; }
          p { font-size: 13px !important; }
        }
      `}</style>

      <div
        className="portal-root"
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          padding: "32px 16px 64px",
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", system-ui, sans-serif',
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div style={{ maxWidth: 896, margin: "0 auto" }}>

          {/* ── Company header ── */}
          <div
            className="portal-card"
            style={{
              background: "#ffffff",
              borderRadius: 12,
              marginBottom: 16,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                background: NAVY,
                padding: "28px 32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              {/* Company info */}
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {companyName}
                </h1>
                {company.address && (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                    {company.address}
                    {company.city_state_zip ? `, ${company.city_state_zip}` : ""}
                  </p>
                )}
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  {companyEmail}
                  {company.phone ? ` · ${company.phone}` : ""}
                </p>
              </div>

              {/* Estimate number + status */}
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Estimate
                </p>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {estimate.estimate_number}
                </p>
                <StatusBadge status={estimate.status} />
                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  className="no-print"
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  }}
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>

            {/* Estimate meta row */}
            <div
              style={{
                padding: "14px 32px",
                display: "flex",
                gap: 32,
                borderBottom: "1px solid #f3f4f6",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Date Issued
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 500, color: "#111827" }}>
                  {fmtDate(estimate.created_at)}
                </p>
              </div>
              {estimate.valid_through && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Valid Through
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 500, color: "#111827" }}>
                    {fmtDate(estimate.valid_through)}
                  </p>
                </div>
              )}
              {estimate.estimated_start && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Est. Start
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 500, color: "#111827" }}>
                    {fmtDate(estimate.estimated_start)}
                  </p>
                </div>
              )}
              {estimate.estimated_end && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Est. Completion
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 500, color: "#111827" }}>
                    {fmtDate(estimate.estimated_end)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Info cards row: Client + Project ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Client info */}
            <div
              className="portal-card"
              style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: NAVY,
                }}
              >
                Client Information
              </p>
              {client ? (
                <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{client.full_name}</p>
                  {client.address_line1 && <p style={{ margin: 0 }}>{client.address_line1}</p>}
                  {client.address_line2 && <p style={{ margin: 0 }}>{client.address_line2}</p>}
                  {(client.city || client.state || client.zip) && (
                    <p style={{ margin: 0 }}>
                      {[client.city, client.state].filter(Boolean).join(", ")} {client.zip ?? ""}
                    </p>
                  )}
                  {client.email && (
                    <p style={{ margin: "4px 0 0", color: "#6b7280" }}>{client.email}</p>
                  )}
                  {client.phone && (
                    <p style={{ margin: 0, color: "#6b7280" }}>{client.phone}</p>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: "#9ca3af", fontStyle: "italic" }}>
                  No client assigned
                </p>
              )}
            </div>

            {/* Project details */}
            <div
              className="portal-card"
              style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: NAVY,
                }}
              >
                Project Details
              </p>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6b7280" }}>Type</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{estimate.project_type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6b7280" }}>Tier</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {TIER_LABELS[estimate.tier] ?? estimate.tier}
                  </span>
                </div>
                {estimate.project_address && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#6b7280" }}>Address</span>
                    <span style={{ fontWeight: 500, color: "#111827", textAlign: "right", maxWidth: "60%" }}>
                      {estimate.project_address}
                    </span>
                  </div>
                )}
                {estimate.site_conditions && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Site</span>
                    <span style={{ fontWeight: 500, color: "#111827", textAlign: "right", maxWidth: "60%" }}>
                      {estimate.site_conditions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Line items by category ── */}
          {groups.length > 0 && (
            <div
              className="portal-card"
              style={{
                background: "#ffffff",
                borderRadius: 12,
                marginBottom: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 24px 0" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: NAVY,
                  }}
                >
                  Scope of Work
                </h2>
              </div>

              {groups.map((group, gi) => (
                <div key={group.category} style={{ marginTop: gi === 0 ? 16 : 0 }}>
                  {/* Category heading */}
                  <div
                    style={{
                      background: NAVY,
                      padding: "8px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em" }}>
                      {group.label}
                    </span>
                  </div>

                  {/* Column headers */}
                  <div
                    style={{
                      background: NAVY_LIGHT,
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 80px 100px 100px",
                      padding: "6px 24px",
                      gap: 8,
                    }}
                  >
                    {["Description", "Qty", "Unit", "Unit Price", "Total"].map((h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.85)",
                          textAlign: h !== "Description" ? "right" : "left",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Line item rows */}
                  {group.items.map((li, idx) => {
                    const qty = Number(li.quantity) || 0;
                    const price = Number(li.unit_price) || 0;
                    const extended = Number(li.extended_price) || qty * price;
                    return (
                      <div
                        key={li.id ?? idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 80px 100px 100px",
                          padding: "9px 24px",
                          gap: 8,
                          background: idx % 2 === 1 ? "#f9fafb" : "#ffffff",
                          borderBottom: "1px solid #f3f4f6",
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontSize: 13, color: "#111827" }}>{li.description}</p>
                          {li.notes && (
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>{li.notes}</p>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "#374151", textAlign: "right" }}>{qty}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#374151", textAlign: "right" }}>
                          {li.unit ?? "—"}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#374151", textAlign: "right" }}>
                          ${fmt(price)}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111827", textAlign: "right" }}>
                          ${fmt(extended)}
                        </p>
                      </div>
                    );
                  })}

                  {/* Category subtotal */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 80px 100px 100px",
                      padding: "8px 24px",
                      gap: 8,
                      background: "#edf2f7",
                      borderBottom: "2px solid #e2e8f0",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, gridColumn: "1 / 5" }}>
                      {group.label} Subtotal
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, textAlign: "right" }}>
                      ${fmt(group.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Financial summary ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <div
              className="portal-card"
              style={{
                background: "#ffffff",
                borderRadius: 12,
                width: "100%",
                maxWidth: 360,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              {[
                { label: "Materials Subtotal", value: estimate.materials_subtotal },
                { label: "Labor Subtotal", value: estimate.labor_subtotal },
                { label: "Subcontractor Total", value: estimate.subcontractor_total },
                { label: "Permits & Fees", value: estimate.permits_fees },
                { label: "Overhead & Profit", value: estimate.overhead_profit },
                { label: "Contingency", value: estimate.contingency },
                { label: "Tax", value: estimate.tax },
              ].map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 20px",
                    background: i % 2 === 1 ? "#f9fafb" : "#ffffff",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                    ${fmt(row.value)}
                  </span>
                </div>
              ))}
              {/* Grand total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: NAVY,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em" }}>
                  GRAND TOTAL
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
                  ${fmt(estimate.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Change Orders ── */}
          {changeOrders.length > 0 && (() => {
            const pendingCOs = changeOrders.filter((co) => co.status === "pending");
            const approvedCOs = changeOrders.filter((co) => co.status === "approved");
            const approvedTotal = approvedCOs.reduce((s, co) => s + Number(co.cost_impact), 0);

            return (
              <>
                {/* ── Pending Change Orders (require client response) ── */}
                {pendingCOs.length > 0 && (
                  <div
                    className="portal-card no-print"
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      marginBottom: 16,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      border: "2px solid #f59e0b",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "18px 24px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#92400e",
                          }}
                        >
                          Pending Change Orders — Your Response Needed
                        </h2>
                      </div>
                      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
                        The following change orders are awaiting your approval or rejection. Please review each one carefully.
                      </p>
                    </div>

                    {pendingCOs.map((co, idx) => (
                      <div key={co.id}>
                        <div
                          style={{
                            padding: "16px 24px",
                            background: idx % 2 === 1 ? "#fffbeb" : "#ffffff",
                            borderTop: "1px solid #fde68a",
                          }}
                        >
                          {/* CO header row */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                                  CO #{co.change_number}
                                </span>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 9999,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: "#fef3c7",
                                    color: "#92400e",
                                  }}
                                >
                                  Pending
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "#111827", lineHeight: 1.6 }}>
                                {co.description}
                              </p>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: co.cost_impact >= 0 ? "#15803d" : "#b91c1c",
                                }}
                              >
                                {co.cost_impact >= 0 ? "+" : ""}${fmt(co.cost_impact)}
                              </p>
                              {co.timeline_impact && (
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                                  Timeline: {co.timeline_impact}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Signature pad for approval */}
                          {showCoSignature === co.id && (
                            <div style={{ marginTop: 16, marginBottom: 8 }}>
                              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                                Sign to approve Change Order #{co.change_number}
                              </p>
                              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6b7280" }}>
                                By signing below, you authorize this scope change at a cost of{" "}
                                <strong style={{ color: "#111827" }}>
                                  {co.cost_impact >= 0 ? "+" : ""}${fmt(co.cost_impact)}
                                </strong>.
                              </p>
                              <DigitalSignature
                                onSign={handleCoSign}
                                signerName={signerName || "Client"}
                                disabled={coProcessing || !signerName.trim()}
                              />
                              {!signerName.trim() && (
                                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f59e0b" }}>
                                  Please enter your full name in the signature section below before signing.
                                </p>
                              )}
                              {coSignError && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: "8px 12px",
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: "#b91c1c",
                                  }}
                                >
                                  {coSignError}
                                </div>
                              )}
                              <button
                                onClick={() => { setShowCoSignature(null); setCoSignError(null); }}
                                style={{
                                  marginTop: 8,
                                  padding: "6px 14px",
                                  background: "transparent",
                                  border: "1px solid #d1d5db",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: "#6b7280",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* Rejection form */}
                          {rejectingCoId === co.id && (
                            <div style={{ marginTop: 16, marginBottom: 8 }}>
                              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                                Reject Change Order #{co.change_number}
                              </p>
                              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                                Optionally, let us know why you are declining this change order.
                              </p>
                              <textarea
                                value={coRejectReason}
                                onChange={(e) => setCoRejectReason(e.target.value)}
                                placeholder="Reason for rejection (optional)"
                                rows={2}
                                style={{
                                  width: "100%",
                                  padding: "9px 12px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: 8,
                                  fontSize: 13,
                                  color: "#111827",
                                  background: "#ffffff",
                                  outline: "none",
                                  boxSizing: "border-box",
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                }}
                              />
                              {coSignError && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: "8px 12px",
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: "#b91c1c",
                                  }}
                                >
                                  {coSignError}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                  onClick={() => { setRejectingCoId(null); setCoRejectReason(""); setCoSignError(null); }}
                                  disabled={coProcessing}
                                  style={{
                                    padding: "8px 16px",
                                    background: "#ffffff",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#374151",
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmCoRejection(co.id)}
                                  disabled={coProcessing}
                                  style={{
                                    padding: "8px 16px",
                                    background: "#dc2626",
                                    border: "none",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    opacity: coProcessing ? 0.6 : 1,
                                  }}
                                >
                                  {coProcessing ? "Rejecting..." : "Confirm Rejection"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons (only show if not currently in a sub-flow) */}
                          {showCoSignature !== co.id && rejectingCoId !== co.id && (
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              <button
                                onClick={() => handleStartCoApproval(co.id)}
                                style={{
                                  padding: "10px 20px",
                                  background: "#16a34a",
                                  border: "none",
                                  borderRadius: 6,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#15803d"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "#16a34a"; }}
                              >
                                Approve & Sign
                              </button>
                              <button
                                onClick={() => handleStartCoRejection(co.id)}
                                style={{
                                  padding: "10px 20px",
                                  background: "transparent",
                                  border: "1px solid #dc2626",
                                  borderRadius: 6,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Approved Change Orders ── */}
                {approvedCOs.length > 0 && (
                  <div
                    className="portal-card"
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      marginBottom: 16,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "18px 24px 0" }}>
                      <h2
                        style={{
                          margin: "0 0 4px",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: NAVY,
                        }}
                      >
                        Approved Change Orders
                      </h2>
                      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
                        The following change orders have been approved and are included in the total.
                      </p>
                    </div>

                    {/* Column headers */}
                    <div
                      style={{
                        background: NAVY_LIGHT,
                        display: "grid",
                        gridTemplateColumns: "50px 1fr 120px 120px 140px",
                        padding: "6px 24px",
                        gap: 8,
                      }}
                    >
                      {["#", "Description", "Timeline", "Cost Impact", "Status"].map((h, i) => (
                        <span
                          key={h}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.85)",
                            textAlign: i >= 2 ? "right" : "left",
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    {approvedCOs.map((co, idx) => (
                      <div
                        key={co.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "50px 1fr 120px 120px 140px",
                          padding: "10px 24px",
                          gap: 8,
                          background: idx % 2 === 1 ? "#f9fafb" : "#ffffff",
                          borderBottom: idx < approvedCOs.length - 1 ? "1px solid #f3f4f6" : "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>
                          CO #{co.change_number}
                        </span>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, color: "#111827" }}>{co.description}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", textAlign: "right" }}>
                          {co.timeline_impact ?? "\u2014"}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            textAlign: "right",
                            color: co.cost_impact >= 0 ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {co.cost_impact >= 0 ? "+" : ""}${fmt(co.cost_impact)}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          {co.client_signed ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#16a34a",
                              }}
                            >
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Signed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApproveChangeOrder(co.id)}
                              className="no-print"
                              style={{
                                padding: "6px 12px",
                                background: "#16a34a",
                                border: "none",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#ffffff",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s",
                              }}
                              disabled={approvingCoId === co.id}
                              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#15803d"; }}
                              onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#16a34a"; }}
                            >
                              {approvingCoId === co.id ? "Signing..." : "Sign"}
                            </button>
                          )}
                          {co.signed_at && (
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>
                              {new Date(co.signed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Change orders total */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "50px 1fr 120px 120px 140px",
                        padding: "10px 24px",
                        gap: 8,
                        background: "#edf2f7",
                        borderTop: "2px solid #e2e8f0",
                      }}
                    >
                      <span />
                      <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                        Total Change Order Impact
                      </span>
                      <span />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: "right",
                          color: approvedTotal >= 0 ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {approvedTotal >= 0 ? "+" : ""}${fmt(approvedTotal)}
                      </span>
                      <span />
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Scope inclusions / exclusions ── */}
          {(estimate.scope_inclusions.length > 0 || estimate.scope_exclusions.length > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <ScopeSection title="Scope Inclusions" items={estimate.scope_inclusions} />
              <ScopeSection title="Scope Exclusions" items={estimate.scope_exclusions} />
            </div>
          )}

          {/* ── Signature / accepted section ── */}
          <div
            className="portal-card no-print"
            style={{
              background: "#ffffff",
              borderRadius: 12,
              marginBottom: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {isDeclined ? (
              /* Declined state */
              <div
                style={{
                  padding: "32px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#fef2f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  Estimate Declined
                </h3>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: "#6b7280" }}>
                  This estimate has been declined. If you change your mind or would like to discuss changes, please contact us.
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9ca3af" }}>
                  Contact{" "}
                  <a href={`mailto:${companyEmail}`} style={{ color: NAVY, fontWeight: 500 }}>
                    {companyEmail}
                  </a>
                  {company.phone ? ` or call ${company.phone}` : ""}
                </p>
              </div>
            ) : isAccepted ? (
              /* Accepted state */
              <div
                style={{
                  padding: "32px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#dcfce7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  Estimate Accepted
                </h3>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: "#6b7280" }}>
                  Thank you! Your signature has been recorded.
                </p>
                {(signedAt ?? estimate.accepted_at) && (
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                    Signed on{" "}
                    {fmtDate(signedAt ?? estimate.accepted_at, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            ) : canSign ? (
              /* Signature flow */
              <div style={{ padding: "24px 24px" }}>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Accept & Sign This Estimate
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
                  By signing, you authorize {companyName} to proceed with the work described above
                  at the stated price of{" "}
                  <strong style={{ color: "#111827" }}>${fmt(estimate.grand_total)}</strong>.
                </p>

                {/* Signer name + email inputs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Full Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Your full name"
                      disabled={signing}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "#111827",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="your@email.com"
                      disabled={signing}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "#111827",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Signature canvas */}
                <DigitalSignature
                  onSign={handleSign}
                  signerName={signerName || "Client"}
                  disabled={signing || !signerName.trim()}
                />

                {!signerName.trim() && (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f59e0b" }}>
                    Please enter your full name before signing.
                  </p>
                )}

                {signError && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#b91c1c",
                    }}
                  >
                    {signError}
                  </div>
                )}

                {signing && (
                  <p style={{ margin: "12px 0 0", fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                    Saving your signature…
                  </p>
                )}

                {/* Decline section */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
                  {!showDecline ? (
                    <button
                      onClick={() => setShowDecline(true)}
                      disabled={signing}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#6b7280",
                        cursor: "pointer",
                      }}
                    >
                      I'd like to decline this estimate
                    </button>
                  ) : (
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                        Decline Estimate
                      </p>
                      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
                        Please let us know why so we can improve (optional).
                      </p>
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g., Price too high, chose another contractor, project postponed..."
                        disabled={declining}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 14,
                          color: "#111827",
                          background: "#ffffff",
                          outline: "none",
                          boxSizing: "border-box",
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                      />
                      {declineError && (
                        <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
                          {declineError}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => { setShowDecline(false); setDeclineError(null); }}
                          disabled={declining}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            background: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDecline}
                          disabled={declining}
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            background: "#dc2626",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#ffffff",
                            cursor: "pointer",
                            opacity: declining ? 0.6 : 1,
                          }}
                        >
                          {declining ? "Declining…" : "Confirm Decline"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Status that doesn't allow signing (draft, declined, expired) */
              <div style={{ padding: "24px 32px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                  This estimate is currently{" "}
                  <strong style={{ color: "#111827" }}>{estimate.status}</strong> and is not
                  available for signature. Please contact{" "}
                  <a href={`mailto:${companyEmail}`} style={{ color: NAVY }}>
                    {companyEmail}
                  </a>{" "}
                  if you have questions.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
              This estimate is valid for 30 days from the date of issue unless otherwise specified.
              Prices are subject to change based on material availability and site conditions.
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#d1d5db" }}>
              Powered by{" "}
              <span style={{ color: NAVY, fontWeight: 600 }}>MHP Estimate</span>
              {" · "}
              {companyName}
              {companyEmail ? ` · ${companyEmail}` : ""}
              {company.phone ? ` · ${company.phone}` : ""}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
