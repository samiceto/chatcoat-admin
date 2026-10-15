"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  Banknote,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ClerkTokenBridge } from "@/components/clerk-token-bridge";
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
    ],
  },
  {
    section: "Access",
    items: [{ href: "/staff", label: "Staff", icon: Users }],
  },
  {
    section: "System",
    items: [{ href: "/audit", label: "Audit log", icon: ScrollText }],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/orgs": "Organizations",
  "/users": "Users",
  "/plans": "Plans",
  "/revenue": "Revenue",
  "/staff": "Staff",
  "/audit": "Audit log",
};

function pageTitleFor(pathname: string | null): string {
  if (!pathname) return "Admin";
  if (pathname.startsWith("/orgs/")) return "Organization";
  return PAGE_TITLES[pathname] ?? "Admin";
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
      setAdminApiKey(key);
      await apiFetch("/api/admin/me"); // verify before proceeding
      checkAccess();
    } catch (err) {
      setAdminApiKey(null);
      setKeyError(err instanceof Error ? err.message : "Invalid key.");
    } finally {
      setVerifyingKey(false);
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

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#0d1117]">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.07] px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck size={16} className="text-white" />
          </span>
          <div>
            <div className="text-[13px] font-bold leading-tight text-white">
              ChatCoat
            </div>
            <div className="text-[11px] font-medium leading-tight text-gray-500">
              Admin Console
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5 last:mb-0">
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-600">
                {group.section}
              </div>
              <div className="space-y-0.5">
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
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-100"
                      )}
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 2} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.07] p-3">
          {me ? (
            <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 text-[11px] font-bold text-indigo-300">
                  {(me.email?.[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-gray-200">
                    {me.email}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {me.role.replace("_", " ")}
                    {usingApiKey && " · API key"}
                  </div>
                </div>
              </div>
              {usingApiKey && (
                <button
                  type="button"
                  onClick={signOutKey}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                >
                  <LogOut size={13} />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          ) : (
            <div className="px-2 py-1 text-[11px] text-gray-600">
              Not signed in
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-[15px] font-bold tracking-tight text-gray-900">
              {pageTitleFor(pathname)}
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Production
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-8 py-7">
          {isLoading ? (
            <div className="mx-auto max-w-md py-24 text-center">
              <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span>Checking admin access…</span>
              </div>
              {slowLoad && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900">
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
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      Retry
                    </button>
                    <span className="text-amber-700/50">·</span>
                    <button
                      type="button"
                      onClick={() => setShowKeyForm((v) => !v)}
                      className="font-semibold text-indigo-700 hover:underline"
                    >
                      {showKeyForm ? "Hide API key form" : "Use admin API key instead"}
                    </button>
                  </div>
                  {showKeyForm && (
                    <form onSubmit={submitKey} className="mt-3">
                      <input
                        type="password"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="Paste ADMIN_API_KEY from Render"
                        autoComplete="off"
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      {keyError && (
                        <p className="mt-1.5 font-semibold text-rose-700">
                          {keyError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={verifyingKey || !keyInput.trim()}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {verifyingKey && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        <span>Sign in with key</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : showGate ? (
            <div className="mx-auto max-w-md py-20 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
                <ShieldAlert size={22} />
              </span>
              {usingApiKey ? (
                <>
                  <h2 className="mt-4 text-lg font-bold text-gray-900">
                    Invalid API key
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    The saved admin API key was rejected. Clear it and try
                    again, or check the{" "}
                    <code className="font-semibold">ADMIN_API_KEY</code> value
                    in your API's Render environment.
                  </p>
                  <button
                    type="button"
                    onClick={signOutKey}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Clear key and sign in again
                  </button>
                </>
              ) : !isSignedIn ? (
                <>
                  <h2 className="mt-4 text-lg font-bold text-gray-900">
                    Sign in required
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Sign in with your ChatCoat account to access the admin
                    console.
                  </p>
                  <Link
                    href="/sign-in"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Sign in
                  </Link>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowKeyForm((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
                    >
                      <KeyRound size={13} />
                      <span>Use an admin API key instead</span>
                    </button>
                  </div>
                  {showKeyForm && (
                    <form
                      onSubmit={submitKey}
                      className="mx-auto mt-3 max-w-sm rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm"
                    >
                      <input
                        type="password"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="Paste ADMIN_API_KEY from Render"
                        autoComplete="off"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      {keyError && (
                        <p className="mt-1.5 text-xs font-semibold text-rose-600">
                          {keyError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={verifyingKey || !keyInput.trim()}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {verifyingKey && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        <span>Sign in with key</span>
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <h2 className="mt-4 text-lg font-bold text-gray-900">
                    Admin access required
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Signed in as{" "}
                    {user?.primaryEmailAddress?.emailAddress ?? "your account"},
                    which is not a staff member. If this is a fresh setup,
                    claim the first super_admin access below — the bootstrap
                    closes permanently after the first claim.
                  </p>
                  {claimMsg && (
                    <p className="mx-auto mt-3 max-w-sm rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                      {claimMsg}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={claimAdmin}
                    disabled={claiming}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {claiming && <Loader2 size={13} className="animate-spin" />}
                    <span>Claim admin access</span>
                  </button>
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
