"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";

/**
 * Bridges the Clerk session into the plain API layer.
 * The backend requires a verified Bearer token on every call; this registers
 * Clerk's getToken so lib/api.ts can attach it without React hooks.
 * Mount once inside <ClerkProvider>.
 */
export function ClerkTokenBridge() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [isLoaded, getToken]);

  return null;
}
