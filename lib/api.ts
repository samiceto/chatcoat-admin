/* Minimal API client for the ChatCoat admin dashboard.
 * Talks to the main ChatCoat API (same backend, same database).
 * Auth: Clerk session token attached as Bearer, via ClerkTokenBridge. */

export const PRODUCTION_API_URL = "https://social-automation-api-8a9h.onrender.com";

export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocalhost) {
      if (
        !envUrl ||
        envUrl.includes("localhost") ||
        envUrl.includes("127.0.0.1") ||
        envUrl.startsWith("http://")
      ) {
        return PRODUCTION_API_URL;
      }
    }
  }
  if (envUrl) {
    const cleaned = envUrl.replace(/\/+$/, "");
    // Tolerate a bare hostname like "api.chatcoat.com".
    return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  return PRODUCTION_API_URL;
}

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(
  getter: (() => Promise<string | null>) | null
): void {
  authTokenGetter = getter;
}

const ADMIN_KEY_STORAGE = "chatcoat_admin_key";
const ADMIN_SESSION_FLAG = "chatcoat_admin_session";

// The raw admin API key is NEVER stored in the browser. Sign-in exchanges
// it once with the API, which sets a short-lived httpOnly session cookie;
// a sessionStorage flag (not the key, not the token) is all the client
// keeps so it knows the key session is active.
export function getAdminApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_FLAG);
  } catch {
    return null;
  }
}

export async function setAdminApiKey(key: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  // Always scrub any raw key left by the old storage behaviour.
  try {
    window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    // storage unavailable: nothing to scrub
  }
  if (key) {
    const res = await fetch(`${getApiUrl()}/api/admin/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw new Error("Invalid admin API key.");
    window.sessionStorage.setItem(ADMIN_SESSION_FLAG, "cookie");
  } else {
    window.sessionStorage.removeItem(ADMIN_SESSION_FLAG);
    try {
      await fetch(`${getApiUrl()}/api/admin/session`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // best effort: the cookie expires on its own within 12h
    }
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  // Key-session auth travels in the httpOnly cookie (apiFetch sends
  // credentials), so no header is needed when it is active.
  if (getAdminApiKey()) return {};
  if (typeof window === "undefined" || !authTokenGetter) return {};
  try {
    const token = await authTokenGetter();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

type ApiFetchOptions = RequestInit & {
  forceFresh?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { forceFresh: _forceFresh, ...fetchOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
    ...((fetchOptions.headers || {}) as Record<string, string>),
  };
  const cleanPath = `/${path.replace(/^\/+/, "")}`;
  // Never spin forever: the Render free tier can hang on cold start.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${cleanPath}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The API did not respond in time. It may be waking up — please retry.");
    }
    throw err;
  }
  clearTimeout(timeout);
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        if (parsed.error && typeof parsed.error.message === "string") {
          detail = parsed.error.message;
        } else if (typeof parsed.detail === "string") {
          detail = parsed.detail;
        } else if (Array.isArray(parsed.detail)) {
          detail = parsed.detail
            .map((err: any) => `${err.loc ? err.loc.join(".") + ": " : ""}${err.msg || "Invalid value"}`)
            .join("; ");
        } else if (parsed.message && typeof parsed.message === "string") {
          detail = parsed.message;
        }
      }
    } catch {
      // use raw text
    }
    const error = new Error(detail || `Request failed with ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as unknown as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
