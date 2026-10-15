"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "@/components/admin-error";

type AuditItem = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string | null;
};

const PAGE_SIZE = 100;

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
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
    apiFetch<{ total: number; items: AuditItem[] }>(
      `/api/admin/audit-log?${params.toString()}`,
      { forceFresh: true }
    )
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load the audit log.")
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
            placeholder="Search by action, actor e-mail, or entity ID..."
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
          <span>Loading audit log...</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">{total.toLocaleString()} recorded actions</p>
          <div className="overflow-x-auto rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--divider)] text-left text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--divider)] last:border-0 align-top"
                  >
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-ink">
                        {item.actor_email || "—"}
                      </div>
                      {item.actor_role && (
                        <div className="text-[10px] text-muted">
                          {item.actor_role.replace("_", " ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--inset)] px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {item.entity_type && (
                        <div className="font-semibold text-ink">{item.entity_type}</div>
                      )}
                      {item.entity_id && (
                        <div className="font-mono text-[10px]">{item.entity_id.slice(0, 18)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted">
                      <details>
                        <summary className="cursor-pointer hover:text-ink">
                          View changes
                        </summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto rounded-lg bg-[var(--inset)] p-2 font-mono text-[10px]">
                          {JSON.stringify(item.details, null, 1)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                      No audit records yet. Actions taken in the admin dashboard will
                      appear here.
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
