"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  Pagination,
  Stat,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui";

type RevenueSummary = {
  mrr_cents: number;
  active_subscriptions: number;
  by_plan: { plan_tier: string; count: number; mrr_cents: number }[];
  status_counts: Record<string, number>;
};

type SubscriptionRow = {
  id: string;
  organization_id: string;
  organization_name: string;
  plan_tier: string;
  status: string;
  billing_cycle_interval: string;
  currency_code: string;
  unit_price_amount: string | null;
  monthly_cents: number;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string | null;
};

type SubsResponse = { total: number; items: SubscriptionRow[] };

const PAGE_SIZE = 25;

function money(cents: number, currency = "USD"): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

const STATUS_TONE: Record<string, "green" | "amber" | "gray" | "rose" | "blue"> = {
  active: "green",
  trialing: "blue",
  past_due: "amber",
  canceled: "gray",
  paused: "amber",
};

export default function AdminRevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [subs, setSubs] = useState<SubsResponse>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const loadSummary = useCallback(() => {
    apiFetch<RevenueSummary>("/api/admin/revenue", { forceFresh: true })
      .then(setSummary)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load revenue. This page requires the revenue.view permission."
        )
      );
  }, []);

  const loadSubs = useCallback(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    });
    if (statusFilter) params.set("status", statusFilter);
    apiFetch<SubsResponse>(`/api/admin/subscriptions?${params}`, { forceFresh: true })
      .then((d) => {
        setSubs(d);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Couldn't load subscriptions."
        )
      )
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setLoading(true);
    loadSubs();
  }, [loadSubs]);

  const totalPages = Math.max(1, Math.ceil(subs.total / PAGE_SIZE));
  const maxPlanMrr = Math.max(1, ...(summary?.by_plan.map((p) => p.mrr_cents) || [1]));

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Monthly recurring revenue from Paddle subscriptions."
      />
      <ErrorAlert message={error} />

      {loading && !summary ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading revenue…" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="MRR"
              value={summary ? money(summary.mrr_cents) : "—"}
              delta={`${summary?.active_subscriptions || 0} paying subscriptions`}
            />
            <Stat
              label="ARR (MRR × 12)"
              value={summary ? money(summary.mrr_cents * 12) : "—"}
              delta="Annualized run-rate"
            />
            <Stat
              label="Subscriptions"
              value={String(
                Object.values(summary?.status_counts || {}).reduce((a, b) => a + b, 0)
              )}
              delta={Object.entries(summary?.status_counts || {})
                .map(([s, c]) => `${c} ${s}`)
                .join(" · ")}
            />
          </div>

          <Card className="mt-4">
            <h3 className="text-[13px] font-semibold text-gray-900">
              MRR by plan
            </h3>
            {!summary || summary.by_plan.length === 0 ? (
              <p className="mt-2 text-[13px] text-gray-400">
                No paying subscriptions yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {summary.by_plan.map((p) => (
                  <div key={p.plan_tier}>
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="font-medium capitalize text-gray-800">
                        {p.plan_tier}
                        <span className="ml-2 text-[12px] font-normal text-gray-400">
                          {p.count} {p.count === 1 ? "sub" : "subs"}
                        </span>
                      </span>
                      <span className="font-semibold text-gray-900">
                        {money(p.mrr_cents)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${(p.mrr_cents / maxPlanMrr) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-6 mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-gray-900">
              Subscriptions
              <span className="ml-2 text-[12px] font-normal text-gray-400">
                {subs.total} total
              </span>
            </h3>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              {Object.keys(summary?.status_counts || {}).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {subs.items.length === 0 ? (
            <Card>
              <EmptyState
                title="No subscriptions"
                description={
                  statusFilter
                    ? "No subscriptions with this status."
                    : "No subscriptions found."
                }
              />
            </Card>
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Organization</Th>
                    <Th>Plan</Th>
                    <Th>Status</Th>
                    <Th className="text-right">MRR</Th>
                    <Th>Billing</Th>
                    <Th>Renews</Th>
                  </tr>
                </thead>
                <tbody>
                  {subs.items.map((s) => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-gray-900">
                        {s.organization_name}
                      </Td>
                      <Td>
                        <Badge tone="blue" className="capitalize">
                          {s.plan_tier}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[s.status] || "gray"}>
                          {s.status}
                        </Badge>
                      </Td>
                      <Td className="text-right font-semibold text-gray-900">
                        {money(s.monthly_cents, s.currency_code)}
                      </Td>
                      <Td className="text-[13px] capitalize text-gray-500">
                        {s.billing_cycle_interval}ly
                      </Td>
                      <Td className="text-[13px] text-gray-500">
                        {s.current_period_end
                          ? new Date(s.current_period_end).toLocaleDateString()
                          : "—"}
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
                  total={subs.total}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
