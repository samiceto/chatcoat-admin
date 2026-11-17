"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Card,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  Readout,
  ReadoutCell,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui";

type Stats = {
  organizations: number;
  users: number;
  active_subscriptions: number;
  trialing: number;
  suspended_organizations: number;
  staff: number;
};

type OrgItem = {
  id: string;
  name: string;
  owner_email: string | null;
  plan_name: string;
  is_suspended: boolean;
  created_at: string | null;
};

type AuditItem = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  created_at: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="font-display text-[26px] text-gray-900">{title}</h2>
      <Link
        href={href}
        className="text-[13px] font-semibold text-indigo-700 underline-offset-2 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activity, setActivity] = useState<AuditItem[]>([]);
  const [mrrCents, setMrrCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<{ items: OrgItem[] }>("/api/admin/orgs?limit=5&offset=0"),
      apiFetch<{ items: AuditItem[] }>("/api/admin/audit-log?limit=8&offset=0"),
      apiFetch<{ mrr_cents: number }>("/api/admin/revenue").catch(() => null),
    ])
      .then(([s, o, a, r]) => {
        setStats(s);
        setOrgs(o.items || []);
        setActivity(a.items || []);
        setMrrCents(r ? r.mrr_cents : null);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load overview.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <LoadingRow label="Loading overview…" />
      </Card>
    );
  }

  const suspended = stats?.suspended_organizations ?? 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live figures from the production database. Changes take effect immediately."
      />
      <ErrorAlert message={error} />

      <Readout>
        <ReadoutCell
          wide
          label="Monthly recurring revenue"
          value={
            mrrCents === null
              ? "—"
              : (mrrCents / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
          }
        />
        <ReadoutCell
          label="Organizations"
          value={(stats?.organizations ?? 0).toLocaleString()}
        />
        <ReadoutCell label="Users" value={(stats?.users ?? 0).toLocaleString()} />
        <ReadoutCell
          label="Active subscriptions"
          value={(stats?.active_subscriptions ?? 0).toLocaleString()}
        />
        <ReadoutCell
          label="Trialing"
          value={(stats?.trialing ?? 0).toLocaleString()}
        />
        <ReadoutCell
          label="Suspended"
          value={suspended.toLocaleString()}
          note={suspended > 0 ? "Needs review" : "All clear"}
          noteTone={suspended > 0 ? "alert" : "ok"}
        />
        <ReadoutCell
          label="Staff members"
          value={(stats?.staff ?? 0).toLocaleString()}
        />
      </Readout>

      <div className="mt-14 grid gap-x-12 gap-y-14 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <SectionHeading
            title="Recent organizations"
            href="/orgs"
            linkLabel="View all organizations"
          />
          <TableShell>
            <thead>
              <tr>
                <Th>Organization</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th className="text-right">Created</Th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <Tr key={org.id}>
                  <Td>
                    <Link
                      href={`/orgs/${org.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="text-[12px] text-gray-500">
                      {org.owner_email || "—"}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone="indigo">{org.plan_name}</Badge>
                  </Td>
                  <Td>
                    {org.is_suspended ? (
                      <Badge tone="red">Suspended</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </Td>
                  <Td className="tnum whitespace-nowrap text-right text-[13px] text-gray-500">
                    {timeAgo(org.created_at)}
                  </Td>
                </Tr>
              ))}
              {orgs.length === 0 && (
                <Tr>
                  <Td colSpan={4} className="py-10 text-center text-gray-500">
                    No organizations yet.
                  </Td>
                </Tr>
              )}
            </tbody>
          </TableShell>
        </section>

        <section className="xl:col-span-2">
          <SectionHeading
            title="Recent admin activity"
            href="/audit"
            linkLabel="View audit log"
          />
          <ul className="border-t-2 border-gray-900">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-gray-200 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-gray-900">
                    {item.action.replace(/_/g, " ")}
                  </div>
                  <div className="truncate text-[12px] text-gray-500">
                    {item.actor_email || "system"}
                    {item.entity_type ? ` on ${item.entity_type}` : ""}
                  </div>
                </div>
                <span className="tnum shrink-0 whitespace-nowrap text-[12px] text-gray-500">
                  {timeAgo(item.created_at)}
                </span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="py-10 text-center text-[13px] text-gray-500">
                No admin activity recorded yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
