"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "@/components/admin-error";

type OrgItem = {
  id: string;
  name: string;
  owner_email: string | null;
  plan_slug: string | null;
  plan_name: string;
  is_suspended: boolean;
  created_at: string | null;
};

const PAGE_SIZE = 50;

export default function AdminOrgsPage() {
  const [items, setItems] = useState<OrgItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    apiFetch<{ total: number; items: OrgItem[] }>(
      `/api/admin/orgs?${params.toString()}`,
      { forceFresh: true }
    )
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load organizations.")
      )
      .finally(() => setLoading(false));
  }, [q, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setQ(searchInput.trim());
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or organization ID..."
            className="w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] py-2.5 pl-9 pr-3 text-sm text-ink placeholder-muted focus:border-teal-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-semibold text-white"
        >
          Search
        </button>
      </form>

      <AdminError message={error} />

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
          <span>Loading organizations...</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">
            {total.toLocaleString()} organization{total === 1 ? "" : "s"}
            {q ? ` matching "${q}"` : ""}
          </p>
          <div className="overflow-x-auto rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--divider)] text-left text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-[var(--divider)] last:border-0 hover:bg-[var(--inset)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/orgs/${org.id}`}
                        className="font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {org.name}
                      </Link>
                      <div className="font-mono text-[10px] text-muted">{org.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {org.owner_email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 text-[11px] font-bold text-teal-800 dark:text-teal-300">
                        {org.plan_name}
                      </span>
                      {org.plan_slug && (
                        <span className="ml-1.5 text-[10px] text-muted">admin-assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {org.is_suspended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          <ShieldAlert size={11} />
                          Suspended
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {org.created_at
                        ? new Date(org.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--inset)] px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="text-xs text-muted">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--inset)] px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
