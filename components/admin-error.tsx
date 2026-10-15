"use client";

import { AlertTriangle } from "lucide-react";

export function AdminError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  );
}
