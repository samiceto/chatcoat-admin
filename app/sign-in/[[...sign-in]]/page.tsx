"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { apiFetch, setAdminApiKey } from "@/lib/api";
import { Button } from "@/components/ui";

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
      await setAdminApiKey(key);
      // Verify the key session before leaving the page.
      await apiFetch("/api/admin/me");
      router.push("/");
    } catch (err) {
      await setAdminApiKey(null);
      setKeyError(err instanceof Error ? err.message : "Invalid key.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <ShieldCheck size={20} className="text-white" />
          </span>
          <div>
            <div className="text-[15px] font-bold leading-tight text-white">
              ChatCoat
            </div>
            <div className="text-xs font-medium leading-tight text-gray-500">
              Admin Console
            </div>
          </div>
        </div>

        {!showKeyForm ? (
          <div className="flex flex-col items-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "bg-white shadow-2xl",
                },
              }}
            />
            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-400 hover:text-gray-200"
            >
              <KeyRound size={14} />
              <span>Use an admin API key instead</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={submitKey}
            className="rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
              <KeyRound size={16} className="text-indigo-600" />
              Admin API key
            </h2>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Paste the <code className="font-semibold">ADMIN_API_KEY</code>{" "}
              from your API's Render environment. It signs you in as
              super_admin without Clerk.
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste admin API key"
              autoComplete="off"
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {keyError && (
              <p className="mt-2 text-[13px] font-semibold text-rose-600">
                {keyError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={verifying || !keyInput.trim()} className="flex-1">
                {verifying && <Loader2 size={14} className="animate-spin" />}
                Sign in with key
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowKeyForm(false);
                  setKeyError(null);
                }}
              >
                Back
              </Button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-600">
          Restricted area. All access is logged.
        </p>
      </div>
    </div>
  );
}
