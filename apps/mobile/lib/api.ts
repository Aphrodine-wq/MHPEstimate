/**
 * API client for calling the web app's API routes.
 * Uses the Supabase session token for authentication.
 */
import { getSession } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://mhpestimate.cloud";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {} } = options;

  try {
    const session = await getSession();
    const authHeaders: Record<string, string> = {};
    if (session?.access_token) {
      authHeaders["Authorization"] = `Bearer ${session.access_token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, fetchOptions);

    let data: T | null = null;
    try {
      data = await response.json();
    } catch {
      // Response may not be JSON
    }

    if (!response.ok) {
      const errorMessage =
        (data && typeof data === "object" && "error" in data
          ? (data as Record<string, unknown>).error
          : null) as string | null;
      return {
        data: null,
        error: errorMessage ?? `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    return { data, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network request failed",
      status: 0,
    };
  }
}

/**
 * Upload a photo to Supabase Storage and return the public URL.
 */
export async function uploadPhoto(
  uri: string,
  bucket: string,
  filePath: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { supabase } = await import("./supabase");
    if (!supabase) return { url: null, error: "Supabase not configured" };

    // Read file as blob
    const response = await fetch(uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) return { url: null, error: error.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}
