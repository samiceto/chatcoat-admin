"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { KeyRound, Loader2 } from "lucide-react";
import { apiFetch, setAdminApiKey } from "@/lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    setVerifying(true);
    setKeyError(null);
    try {
      setAdminApiKey(key);
      // Verify the key before leaving the page.
      await apiFetch("/api/admin/me");
      router.push("/");
    } catch (err) {
      setAdminApiKey(null);
      setKeyError(err instanceof Error ? err.message : "Invalid key.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center w-full max-w-md">
        <h1 className="mb-1 text-lg font-bold text-ink">ChatCoat Admin</h1>
        <p className="mb-6 text-sm text-muted">Staff sign-in</p>
        {!showKeyForm ? (
          <>
            <SignIn
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-[var(--surface)] shadow-card dark:border dark:border-white/[0.06]",
                },
              }}
            />
            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
            >
              <KeyRound size={13} />
              <span>Use an admin API key instead</span>
            </button>
          </>
        ) : (
          <form
            onSubmit={submitKey}
            className="mx-auto rounded-2xl bg-[var(--surface)] shadow-card dark:border dark:border-white/[0.06] p-6 text-left"
          >
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <KeyRound size={15} />
              Admin API key
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              Paste the <code className="font-semibold">ADMIN_API_KEY</code> from
              your API's Render environment. It signs you in as super_admin
              without Clerk.
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste admin API key"
              autoComplete="off"
              className="mt-3 w-full rounded-lg border border-[var(--divider)] bg-[var(--inset)] px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {keyError && (
              <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {keyError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={verifying || !keyInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {verifying && <Loader2 size={13} className="animate-spin" />}
                <span>Sign in with key</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowKeyForm(false);
                  setKeyError(null);
                }}
                className="text-xs font-semibold text-muted hover:text-ink"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
