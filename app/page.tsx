"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Hourglass,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Card,
  CardTitle,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  Stat,
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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activity, setActivity] = useState<AuditItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<{ items: OrgItem[] }>("/api/admin/orgs?limit=5&offset=0"),
      apiFetch<{ items: AuditItem[] }>("/api/admin/audit-log?limit=8&offset=0"),
    ])
      .then(([s, o, a]) => {
        setStats(s);
        setOrgs(o.items || []);
        setActivity(a.items || []);
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

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live figures from the production database. Changes take effect immediately."
      />
      <ErrorAlert message={error} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Stat
          label="Organizations"
          value={(stats?.organizations ?? 0).toLocaleString()}
          icon={<Building2 size={16} />}
        />
        <Stat
          label="Users"
          value={(stats?.users ?? 0).toLocaleString()}
          icon={<Users size={16} />}
        />
        <Stat
          label="Active subscriptions"
          value={(stats?.active_subscriptions ?? 0).toLocaleString()}
          icon={<CreditCard size={16} />}
        />
        <Stat
          label="Trialing"
          value={(stats?.trialing ?? 0).toLocaleString()}
          icon={<Hourglass size={16} />}
          deltaTone={stats && stats.trialing > 0 ? "neutral" : "neutral"}
        />
        <Stat
          label="Suspended"
          value={(stats?.suspended_organizations ?? 0).toLocaleString()}
          icon={<ShieldAlert size={16} />}
          delta={
            stats && stats.suspended_organizations > 0
              ? "Needs review"
              : "All clear"
          }
          deltaTone={
            stats && stats.suspended_organizations > 0 ? "down" : "up"
          }
        />
        <Stat
          label="Staff members"
          value={(stats?.staff ?? 0).toLocaleString()}
          icon={<UserCog size={16} />}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <Card padded={false} className="xl:col-span-3">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <CardTitle>Recent organizations</CardTitle>
            <Link
              href="/orgs"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="text-[11px] text-gray-400">
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
                  <Td className="text-right text-[13px] text-gray-500">
                    {timeAgo(org.created_at)}
                  </Td>
                </Tr>
              ))}
              {orgs.length === 0 && (
                <Tr>
                  <Td colSpan={4} className="text-center text-gray-400">
                    No organizations yet.
                  </Td>
                </Tr>
              )}
            </tbody>
            </table>
          </div>
        </Card>

        <Card padded={false} className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <CardTitle>Recent admin activity</CardTitle>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="px-2 pb-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-gray-900">
                    {item.action.replace(/_/g, " ")}
                    {item.entity_type && (
                      <span className="font-normal text-gray-400">
                        {" "}
                        · {item.entity_type}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-gray-400">
                    {item.actor_email || "system"}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="px-3 py-8 text-center text-[13px] text-gray-400">
                No admin activity recorded yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
