"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, Hourglass, ShieldCheck, Users, UserCog } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "@/components/admin-error";

type Stats = {
  organizations: number;
  users: number;
  active_subscriptions: number;
  trialing: number;
  suspended_organizations: number;
  staff: number;
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06] p-5">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={17} />
        </span>
        <span className="text-xs font-semibold text-muted">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-ink">
        {value === null ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/api/admin/stats", { forceFresh: true })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load admin stats.")
      );
  }, []);

  return (
    <div className="space-y-5">
      <AdminError message={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Organizations"
          value={stats?.organizations ?? null}
          tone="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={stats?.users ?? null}
          tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={CreditCard}
          label="Active subscriptions"
          value={stats?.active_subscriptions ?? null}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Hourglass}
          label="Trialing"
          value={stats?.trialing ?? null}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={ShieldCheck}
          label="Suspended workspaces"
          value={stats?.suspended_organizations ?? null}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
        <StatCard
          icon={UserCog}
          label="Staff members"
          value={stats?.staff ?? null}
          tone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
      </div>
      <p className="text-xs text-muted">
        Figures are live from the database. Plan and limit changes made here take
        effect immediately — no deploy needed.
      </p>
    </div>
  );
}
