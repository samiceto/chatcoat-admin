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

export function getAdminApiKey(): string | null {
  if (typeof window === "undefined") return null;
  // Mitigation only: the admin key was persisted in localStorage, so it
  // survived browser restarts and was readable by any script on the
  // admin origin. sessionStorage at least clears it when the tab closes.
  // The full fix is Clerk-only admin auth (or an httpOnly cookie) plus
  // key rotation — that is still owed and is not claimed here.
  return window.sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminApiKey(key: string | null): void {
  if (typeof window === "undefined") return;
  if (key) window.sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
  else window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  // Clear any key left in localStorage by the old behaviour.
  try {
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    // localStorage unavailable: sessionStorage key is still used.
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  // Admin API key bypasses Clerk entirely (for networks where Clerk is unreachable).
  const apiKey = getAdminApiKey();
  if (apiKey) return { "X-Admin-Key": apiKey };
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
