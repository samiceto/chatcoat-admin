"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { KeyRound, Loader2 } from "lucide-react";
import { apiFetch, setAdminApiKey } from "@/lib/api";
import { Button, inputClassName } from "@/components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-display text-[48px] text-gray-900">ChatCoat</h1>
          <p className="mt-1 text-[14px] text-gray-500">Admin console</p>
        </div>

        {!showKeyForm ? (
          <div className="flex flex-col items-start">
            <SignIn
              appearance={{
                variables: {
                  colorPrimary: "#0F1B2A",
                  borderRadius: "6px",
                  fontFamily: "Archivo, system-ui, sans-serif",
                },
                elements: {
                  rootBox: "w-full",
                  card: "w-full border border-gray-200 bg-white shadow-none",
                },
              }}
            />
            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:underline"
            >
              <KeyRound size={14} aria-hidden />
              <span>Use an admin API key instead</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={submitKey}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h2 className="font-display text-[26px] text-gray-900">
              Admin API key
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
              Paste the <code className="font-semibold">ADMIN_API_KEY</code>{" "}
              from your API's Render environment. It signs you in as
              super_admin without Clerk.
            </p>
            <label htmlFor="sign-in-api-key" className="sr-only">
              Admin API key
            </label>
            <input
              id="sign-in-api-key"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste admin API key"
              autoComplete="off"
              className={inputClassName("mt-4 py-2.5")}
            />
            {keyError && (
              <p
                role="alert"
                className="mt-2 text-[13px] font-semibold text-rose-700"
              >
                {keyError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={verifying || !keyInput.trim()}
                className="flex-1"
              >
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

        <p className="mt-8 text-[13px] text-gray-500">
          Restricted area. All access is logged.
        </p>
      </div>
    </div>
  );
}
