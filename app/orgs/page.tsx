"use client";

import Link from "next/link";
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
    <div>
      <PageHeader
        title="Organizations"
        description={`${total.toLocaleString()} total${q ? ` matching "${q}"` : ""}`}
      />
      <ErrorAlert message={error} />

      <form onSubmit={submitSearch} className="mb-4 flex gap-2">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, email, or organization ID…"
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
          <LoadingRow label="Loading organizations…" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No organizations found"
            description={
              q
                ? "Try a different search term."
                : "Organizations will appear here once customers sign up."
            }
          />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Organization</Th>
                <Th>Owner</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th className="text-right">Created</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((org) => (
                <Tr key={org.id}>
                  <Td>
                    <Link
                      href={`/orgs/${org.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="font-mono text-[11px] text-gray-400">
                      {org.id.slice(0, 8)}…
                    </div>
                  </Td>
                  <Td className="text-[13px] text-gray-500">
                    {org.owner_email || "—"}
                  </Td>
                  <Td>
                    <Badge tone="indigo">{org.plan_name}</Badge>
                    {org.plan_slug && (
                      <span className="ml-2 text-[11px] text-gray-400">
                        admin-assigned
                      </span>
                    )}
                  </Td>
                  <Td>
                    {org.is_suspended ? (
                      <Badge tone="red">Suspended</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </Td>
                  <Td className="text-right text-[13px] text-gray-500">
                    {org.created_at
                      ? new Date(org.created_at).toLocaleDateString()
                      : "—"}
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
