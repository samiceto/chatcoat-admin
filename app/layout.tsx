"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkTokenBridge } from "@/components/clerk-token-bridge";
import { apiFetch } from "@/lib/api";
import "./globals.css";

type StaffMe = { email: string; role: string };

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/plans", label: "Plans" },
  { href: "/orgs", label: "Organizations" },
  { href: "/staff", label: "Staff" },
  { href: "/audit", label: "Audit log" },
];

function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // The sign-in page must stay reachable without staff access.
  const isPublicRoute = pathname?.startsWith("/sign-in");

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
  }, [isPublicRoute, pathname]);

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--divider)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-900 dark:text-text-main text-base">
              ChatCoat Admin
            </span>
            {me && (
              <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                {me.role.replace("_", " ")}
              </span>
            )}
          </div>
          {me && <span className="text-xs text-muted">{me.email}</span>}
        </div>
        {me && (
          <nav className="mx-auto max-w-6xl px-4 pb-3 flex flex-wrap gap-1.5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                      : "text-muted hover:text-ink hover:bg-[var(--inset)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
            <span>Checking admin access...</span>
          </div>
        ) : denied || !me ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert size={22} />
            </div>
            <h1 className="mt-4 text-lg font-bold text-ink">Admin access required</h1>
            <p className="mt-2 text-sm text-muted">
              Your account is not a staff member. If you should have access, ask a
              super admin to invite you.
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  const t = localStorage.getItem("chatcoat_theme");
                  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {}
              `,
            }}
          />
        </head>
        <body>
          <ClerkTokenBridge />
          <AdminGate>{children}</AdminGate>
        </body>
      </html>
    </ClerkProvider>
  );
}
