"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Card,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  Pagination,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  org_count: number;
  created_at: string | null;
};

type UsersResponse = { total: number; items: UserRow[] };

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    });
    if (debounced) params.set("q", debounced);
    apiFetch<UsersResponse>(`/api/admin/users?${params}`, { forceFresh: true })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load users. This page requires the users.view permission."
        )
      )
      .finally(() => setLoading(false));
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${data.total} registered ${data.total === 1 ? "user" : "users"}`}
        actions={
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e-mail or name…"
              className="w-64 rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        }
      />
      <ErrorAlert message={error} />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading users…" />
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title="No users found"
            description={debounced ? "Try a different search." : "No users registered yet."}
          />
        </Card>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Workspaces</Th>
                <Th>Joined</Th>
                <Th className="font-mono">ID</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[12px] font-bold text-indigo-700">
                        {(u.email?.[0] || "?").toUpperCase()}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {u.name || u.email}
                        </div>
                        {u.name && (
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[13px] text-gray-600">{u.org_count}</Td>
                  <Td className="text-[13px] text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="font-mono text-[11px] text-gray-400">
                    {u.id.slice(0, 8)}…
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              pageSize={PAGE_SIZE}
              total={data.total}
            />
          )}
        </>
      )}
    </div>
  );
}
