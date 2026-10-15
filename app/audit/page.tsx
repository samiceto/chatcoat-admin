"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui";

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

function actionTone(action: string): "red" | "amber" | "blue" | "gray" {
  const a = action.toLowerCase();
  if (a.includes("suspend") || a.includes("delete") || a.includes("remove"))
    return "red";
  if (a.includes("bootstrap") || a.includes("create") || a.includes("invite"))
    return "amber";
  if (a.includes("plan") || a.includes("override") || a.includes("update"))
    return "blue";
  return "gray";
}

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
    <div>
      <PageHeader
        title="Audit log"
        description={`${total.toLocaleString()} recorded actions — every admin write is logged here.`}
      />
      <ErrorAlert message={error} />

      <form onSubmit={submitSearch} className="mb-4 flex gap-2">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by action, actor e-mail, or entity ID…"
          className="max-w-md flex-1"
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
        {q && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchInput("");
              setQ("");
              setOffset(0);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading audit log…" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No audit records"
            description={
              q
                ? "Try a different search term."
                : "Actions taken in the admin console will appear here."
            }
          />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr key={item.id} className="align-top">
                  <Td className="whitespace-nowrap text-[13px] text-gray-500">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "—"}
                  </Td>
                  <Td>
                    <div className="text-[13px] font-semibold text-gray-900">
                      {item.actor_email || "—"}
                    </div>
                    {item.actor_role && (
                      <div className="text-[11px] text-gray-400">
                        {item.actor_role.replace("_", " ")}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={actionTone(item.action)}>
                      <span className="font-mono">{item.action}</span>
                    </Badge>
                  </Td>
                  <Td className="text-[13px] text-gray-500">
                    {item.entity_type && (
                      <div className="font-medium text-gray-700">
                        {item.entity_type}
                      </div>
                    )}
                    {item.entity_id && (
                      <div className="font-mono text-[11px] text-gray-400">
                        {item.entity_id.slice(0, 18)}
                      </div>
                    )}
                    {!item.entity_type && !item.entity_id && "—"}
                  </Td>
                  <Td className="text-[12px] text-gray-500">
                    {item.details && Object.keys(item.details).length > 0 ? (
                      <details>
                        <summary className="cursor-pointer font-medium hover:text-gray-900">
                          View changes
                        </summary>
                        <pre className="mt-1.5 max-w-xs overflow-x-auto rounded-lg bg-gray-50 p-2.5 font-mono text-[11px] ring-1 ring-inset ring-gray-200">
                          {JSON.stringify(item.details, null, 1)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <span className="text-[13px] text-gray-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
              {total.toLocaleString()}
            </span>
            <Button
              variant="secondary"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
