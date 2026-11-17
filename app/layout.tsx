"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Banknote,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Menu,
  ScrollText,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ClerkTokenBridge } from "@/components/clerk-token-bridge";
import { Button, inputClassName } from "@/components/ui";
import { apiFetch, getAdminApiKey, setAdminApiKey } from "@/lib/api";
import { cn } from "@/lib/cn";
import "./globals.css";

type StaffMe = { email: string; role: string };

const NAV = [
  {
    section: "Manage",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/orgs", label: "Organizations", icon: Building2 },
      { href: "/users", label: "Users", icon: UserRound },
      { href: "/plans", label: "Plans", icon: CreditCard },
      { href: "/revenue", label: "Revenue", icon: Banknote },
      { href: "/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    section: "Access",
    items: [{ href: "/staff", label: "Staff", icon: Users }],
  },
  {
    section: "System",
    items: [
      { href: "/ai-models", label: "AI Models", icon: Sparkles },
      { href: "/worker", label: "Worker", icon: Activity },
      { href: "/audit", label: "Audit log", icon: ScrollText },
    ],
  },
];

function Wordmark({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <span
      className={cn(
        "font-display text-gray-900",
        size === "lg" ? "text-[30px]" : "text-[24px]"
      )}
    >
      ChatCoat
    </span>
  );
}

function ApiKeyForm({
  value,
  onChange,
  onSubmit,
  error,
  verifying,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  verifying: boolean;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <label htmlFor="admin-api-key" className="sr-only">
        Admin API key
      </label>
      <input
        id="admin-api-key"
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the ADMIN_API_KEY"
        autoComplete="off"
        className={inputClassName()}
      />
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-rose-700">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={verifying || !value.trim()}
        className="mt-3"
      >
        {verifying && <Loader2 size={13} className="animate-spin" />}
        <span>Sign in with key</span>
      </Button>
    </form>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  // Definitive build-time check: is the Clerk key actually in this bundle?
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkKeyPresent = !!clerkKey;
  const clerkKeyPrefix = clerkKey ? clerkKey.slice(0, 12) : "";
  // Decode the Clerk frontend API host from the publishable key.
  const clerkHost = (() => {
    try {
      if (!clerkKey) return null;
      const b64 = clerkKey.replace(/^pk_(live|test)_/, "").replace(/-/g, "+").replace(/_/g, "/");
      const host = atob(b64).replace(/\$$/, "");
      return host.includes(".") ? host : null;
    } catch {
      return null;
    }
  })();
  const [netCheck, setNetCheck] = useState<"pending" | "ok" | "failed" | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [me, setMe] = useState<StaffMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [slowLoad, setSlowLoad] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // The sign-in page must stay reachable without staff access.
  const isPublicRoute = pathname?.startsWith("/sign-in");

  const checkAccess = () => {
    setLoading(true);
    setClaimMsg(null);
    apiFetch<StaffMe>("/api/admin/me")
      .then((data) => {
        setMe(data);
        setDenied(false);
      })
      .catch(() => {
        setMe(null);
        setDenied(true);
      })
      .finally(() => setLoading(false));
  };

  const usingApiKey = !!getAdminApiKey();

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }
    if (usingApiKey) {
      checkAccess(); // API key bypass: no Clerk needed
      return;
    }
    if (!authLoaded) return; // wait for Clerk before calling the API
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicRoute, pathname, authLoaded, usingApiKey]);

  // On small screens the navigation is a drawer: close it after navigating
  // and when Escape is pressed.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const signOutKey = () => {
    setAdminApiKey(null);
    window.location.href = "/sign-in";
  };

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    setVerifyingKey(true);
    setKeyError(null);
    try {
      await setAdminApiKey(key);
      await apiFetch("/api/admin/me"); // verify before proceeding
      checkAccess();
    } catch (err) {
      await setAdminApiKey(null);
      setKeyError(err instanceof Error ? err.message : "Invalid key.");
    } finally {
      setVerifyingKey(false);
      // The raw key must not linger in component state for the tab's
      // life (audit L-22) — the session cookie is the credential now.
      setKeyInput("");
    }
  };

  // If loading drags on, say what is stuck instead of spinning forever.
  useEffect(() => {
    if (!loading && authLoaded) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 12000);
    return () => clearTimeout(t);
  }, [loading, authLoaded]);

  // Once we're sure Clerk is stuck, probe its servers directly from this browser.
  useEffect(() => {
    if (authLoaded || !slowLoad || netCheck !== null || !clerkHost) return;
    setNetCheck("pending");
    fetch(`https://${clerkHost}/v1/environment`, { mode: "no-cors" })
      .then(() => setNetCheck("ok"))
      .catch(() => setNetCheck("failed"));
  }, [authLoaded, slowLoad, netCheck, clerkHost]);

  const claimAdmin = async () => {
    setClaiming(true);
    setClaimMsg(null);
    try {
      await apiFetch("/api/admin/bootstrap", { method: "POST" });
      checkAccess();
    } catch (err) {
      setClaimMsg(
        err instanceof Error ? err.message : "Could not claim admin access."
      );
    } finally {
      setClaiming(false);
    }
  };

  if (isPublicRoute) return <>{children}</>;

  const isLoading = loading || (!authLoaded && !usingApiKey);
  const showGate = !isLoading && (denied || !me);

  const linkButton =
    "font-semibold text-indigo-700 underline-offset-2 hover:underline";

  return (
    <div className="min-h-screen bg-white">
      {/* Small-screen bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="admin-nav"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <Wordmark size="sm" />
      </header>

      {navOpen && (
        <div
          aria-hidden
          className="anim-scrim fixed inset-0 z-30 bg-gray-950/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-gray-200 bg-gray-100 transition-[transform,visibility] duration-200 lg:z-30 lg:w-[240px] lg:translate-x-0 lg:visible",
          navOpen ? "translate-x-0 visible" : "-translate-x-full invisible"
        )}
      >
        <div className="px-5 pb-6 pt-6">
          <div className="flex items-start justify-between">
            <Wordmark />
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="Close navigation"
              className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-1 text-[13px] text-gray-500">Admin console</div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[12px] font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Production
          </span>
        </div>

        <nav
          id="admin-nav"
          aria-label="Main"
          className="flex-1 overflow-y-auto pb-4"
        >
          {NAV.map((group) => (
            <div key={group.section} className="mb-6 last:mb-0">
              <div className="mb-1.5 px-5 text-[12px] font-semibold text-gray-500">
                {group.section}
              </div>
              <div>
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-l-[3px] py-2 pl-[17px] pr-4 text-[14px] transition-colors",
                        active
                          ? "border-gray-900 bg-white font-semibold text-gray-900"
                          : "border-transparent font-medium text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
                      )}
                    >
                      <Icon size={16} strokeWidth={active ? 2.3 : 2} aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-5 py-4">
          {me ? (
            <div>
              <div
                className="truncate text-[13px] font-semibold text-gray-900"
                title={me.email}
              >
                {me.email}
              </div>
              <div className="mt-0.5 text-[12px] text-gray-500">
                {me.role.replace("_", " ")}
                {usingApiKey && ", signed in with API key"}
              </div>
              {usingApiKey && (
                <button
                  type="button"
                  onClick={signOutKey}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                >
                  <LogOut size={14} aria-hidden />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-[13px] text-gray-500">Not signed in</div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[240px]">
        <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          {isLoading ? (
            <div className="mx-auto max-w-md py-24">
              <div
                role="status"
                className="flex items-center justify-center gap-3 text-sm text-gray-500"
              >
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span>Checking admin access…</span>
              </div>
              {slowLoad && (
                <div className="mt-6 rounded-r-lg border-l-[3px] border-amber-500 bg-amber-50 p-4 text-left text-[13px] leading-relaxed text-amber-900">
                  {!authLoaded && !usingApiKey ? (
                    clerkKeyPresent ? (
                      <p>
                        The Clerk key is in this build (
                        <code className="font-semibold">{clerkKeyPrefix}…</code>
                        ), but sign-in isn't initializing.{" "}
                        {netCheck === "failed" && clerkHost && (
                          <>
                            Your browser cannot reach{" "}
                            <code className="font-semibold">{clerkHost}</code>{" "}
                            at all — something on this device or connection is
                            blocking it (VPN, firewall, antivirus web shield,
                            or DNS).
                          </>
                        )}
                        {netCheck === "ok" && (
                          <>
                            Your browser <b>can</b> reach Clerk's servers, so
                            the stall is in sign-in initialization itself — try
                            a completely different browser.
                          </>
                        )}
                        {netCheck !== "failed" && netCheck !== "ok" && (
                          <>Running a connection check…</>
                        )}
                      </p>
                    ) : (
                      <p>
                        This build contains <b>no</b> Clerk publishable key, so
                        sign-in can never load. Set{" "}
                        <code className="font-semibold">
                          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                        </code>{" "}
                        in Vercel → Settings → Environment Variables, then{" "}
                        <b>redeploy</b>.
                      </p>
                    )
                  ) : (
                    <p>
                      The API is taking unusually long to respond. It may be
                      waking up from sleep — give it a moment and retry.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className={linkButton}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKeyForm((v) => !v)}
                      className={linkButton}
                    >
                      {showKeyForm ? "Hide API key form" : "Use admin API key instead"}
                    </button>
                  </div>
                  {showKeyForm && (
                    <ApiKeyForm
                      value={keyInput}
                      onChange={setKeyInput}
                      onSubmit={submitKey}
                      error={keyError}
                      verifying={verifyingKey}
                      className="mt-4"
                    />
                  )}
                </div>
              )}
            </div>
          ) : showGate ? (
            <div className="max-w-lg py-8 lg:py-16">
              {usingApiKey ? (
                <>
                  <h1 className="font-display text-[40px] text-gray-900">
                    Invalid API key
                  </h1>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500">
                    The saved admin API key was rejected. Clear it and try
                    again, or check the{" "}
                    <code className="font-semibold">ADMIN_API_KEY</code> value
                    in your API's Render environment.
                  </p>
                  <Button
                    variant="primary"
                    onClick={signOutKey}
                    className="mt-6"
                  >
                    Clear key and sign in again
                  </Button>
                </>
              ) : !isSignedIn ? (
                <>
                  <h1 className="font-display text-[40px] text-gray-900">
                    Sign in required
                  </h1>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500">
                    Sign in with your ChatCoat account to access the admin
                    console.
                  </p>
                  <Link
                    href="/sign-in"
                    className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-gray-700"
                  >
                    Sign in
                  </Link>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowKeyForm((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:underline"
                    >
                      <KeyRound size={14} aria-hidden />
                      <span>Use an admin API key instead</span>
                    </button>
                  </div>
                  {showKeyForm && (
                    <ApiKeyForm
                      value={keyInput}
                      onChange={setKeyInput}
                      onSubmit={submitKey}
                      error={keyError}
                      verifying={verifyingKey}
                      className="mt-4 max-w-sm"
                    />
                  )}
                </>
              ) : (
                <>
                  <h1 className="font-display text-[40px] text-gray-900">
                    Admin access required
                  </h1>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500">
                    Signed in as{" "}
                    {user?.primaryEmailAddress?.emailAddress ?? "your account"},
                    which is not a staff member. If this is a fresh setup,
                    claim the first super_admin access below — the bootstrap
                    closes permanently after the first claim.
                  </p>
                  {claimMsg && (
                    <p
                      role="alert"
                      className="mt-4 rounded-r-lg border-l-[3px] border-rose-600 bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-800"
                    >
                      {claimMsg}
                    </p>
                  )}
                  <Button
                    variant="primary"
                    onClick={claimAdmin}
                    disabled={claiming}
                    className="mt-6"
                  >
                    {claiming && <Loader2 size={13} className="animate-spin" />}
                    <span>Claim admin access</span>
                  </Button>
                </>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body>
          <ClerkTokenBridge />
          <AdminGate>{children}</AdminGate>
        </body>
      </html>
    </ClerkProvider>
  );
}
