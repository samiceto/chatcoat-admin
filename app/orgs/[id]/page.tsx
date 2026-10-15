"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "../../layout";

type OrgDetail = {
  id: string;
  name: string;
  owner_email: string | null;
  plan_slug: string | null;
  plan_name: string;
  is_suspended: boolean;
  member_count: number;
  overrides: Record<string, number>;
  entitlements: {
    tier: string;
    name: string;
    max_profiles: number;
    max_posts_per_month: number;
    ai_credits: number;
    max_workspaces: number;
    allowed_platforms: string[];
    features: Record<string, boolean>;
  };
  usage: {
    posts_used: number;
    posts_limit: number;
    ai_credits_used: number;
    ai_credits_limit: number;
    profiles_used: number;
    profiles_limit: number;
    workspaces_limit: number;
    plan_tier: string;
    plan_name: string;
  };
  created_at: string | null;
};

type PlanOption = { slug: string; name: string };

const OVERRIDE_METRICS = [
  { key: "posts_per_month", label: "Posts / month" },
  { key: "ai_credits", label: "AI credits / month" },
  { key: "profiles", label: "Connected profiles" },
  { key: "workspaces", label: "Workspaces" },
];

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const over = limit > 0 && used > limit;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted">{label}</span>
        <span className={`font-bold ${over ? "text-rose-600 dark:text-rose-400" : "text-ink"}`}>
          {used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : "∞"}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--inset)]">
        <div
          className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-teal-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminOrgDetailPage() {
  const params = useParams();
  const orgId = params?.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planSlug, setPlanSlug] = useState("");
  const [overrideMetric, setOverrideMetric] = useState(OVERRIDE_METRICS[0].key);
  const [overrideValue, setOverrideValue] = useState("");

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      apiFetch<OrgDetail>(`/api/admin/orgs/${orgId}`, { forceFresh: true }),
      apiFetch<PlanOption[]>("/api/admin/plans?include_inactive=false"),
    ])
      .then(([orgData, planData]) => {
        setOrg(orgData);
        setPlanSlug(orgData.plan_slug || "");
        setPlans((planData || []).map((p) => ({ slug: p.slug, name: p.name })));
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load organization.")
      )
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (fn: () => Promise<unknown>, failure: string) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setSaving(false);
    }
  };

  const savePlan = () =>
    mutate(
      () =>
        apiFetch(`/api/admin/orgs/${orgId}`, {
          method: "PATCH",
          body: JSON.stringify({ plan_slug: planSlug || null }),
        }),
      "Couldn't update the plan."
    );

  const toggleSuspend = () => {
    if (!org) return;
    const action = org.is_suspended ? "unsuspend" : "suspend";
    if (
      !org.is_suspended &&
      !window.confirm(
        `Suspend "${org.name}"? All API access for this workspace will be blocked immediately.`
      )
    ) {
      return;
    }
    mutate(
      () =>
        apiFetch(`/api/admin/orgs/${orgId}`, {
          method: "PATCH",
          body: JSON.stringify({ is_suspended: !org.is_suspended }),
        }),
      `Couldn't ${action} the workspace.`
    );
  };

  const addOverride = () => {
    const value = parseInt(overrideValue, 10);
    if (isNaN(value) || value < 0) {
      setError("Override value must be a non-negative number.");
      return;
    }
    mutate(
      () =>
        apiFetch(`/api/admin/orgs/${orgId}/overrides`, {
          method: "POST",
          body: JSON.stringify({ metric: overrideMetric, limit_value: value }),
        }),
      "Couldn't save the override."
    ).then(() => setOverrideValue(""));
  };

  const removeOverride = (metric: string) =>
    mutate(
      () => apiFetch(`/api/admin/orgs/${orgId}/overrides/${metric}`, { method: "DELETE" }),
      "Couldn't remove the override."
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
        <span>Loading organization...</span>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-4">
        <AdminError message={error || "Organization not found."} />
        <Link href="/orgs" className="text-xs font-semibold text-brand hover:underline">
          Back to organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={13} />
        <span>Back to organizations</span>
      </Link>

      <AdminError message={error} />

      <div className="rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">{org.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {org.owner_email || "No owner email"} · {org.member_count} member
              {org.member_count === 1 ? "" : "s"} ·{" "}
              {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted">{org.id}</p>
          </div>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              org.is_suspended
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            <ShieldAlert size={13} />
            <span>{org.is_suspended ? "Unsuspend workspace" : "Suspend workspace"}</span>
          </button>
        </div>
        {org.is_suspended && (
          <p className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
            This workspace is suspended — all API access is blocked.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06] p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink">Plan assignment</h3>
          <div className="flex gap-2">
            <select
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
              disabled={saving}
              className="flex-1 rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
            >
              <option value="">Paddle subscription (default)</option>
              {plans.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={savePlan}
              disabled={saving}
              className="rounded-lg bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
          <p className="text-[11px] text-muted">
            An admin-assigned plan overrides the Paddle subscription. Clear it to
            fall back to billing-derived tiering.
          </p>

          <h3 className="text-sm font-bold text-ink pt-2">Limit overrides</h3>
          <div className="flex gap-2">
            <select
              value={overrideMetric}
              onChange={(e) => setOverrideMetric(e.target.value)}
              disabled={saving}
              className="rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
            >
              {OVERRIDE_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              placeholder="New limit"
              disabled={saving}
              className="w-28 rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              onClick={addOverride}
              disabled={saving}
              className="rounded-lg bg-[var(--inset)] px-3.5 py-2 text-xs font-semibold text-ink hover:opacity-80 disabled:opacity-60"
            >
              Set
            </button>
          </div>
          {Object.keys(org.overrides).length > 0 ? (
            <ul className="space-y-1.5">
              {Object.entries(org.overrides).map(([metric, value]) => (
                <li
                  key={metric}
                  className="flex items-center justify-between rounded-lg bg-[var(--inset)] px-3 py-1.5 text-xs"
                >
                  <span className="font-semibold text-ink">
                    {OVERRIDE_METRICS.find((m) => m.key === metric)?.label || metric}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      {value.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOverride(metric)}
                      title="Remove override"
                      className="text-muted hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted">No per-org overrides. Plan limits apply.</p>
          )}
        </div>

        <div className="rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06] p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink">
            Usage this month{" "}
            <span className="ml-1 rounded-full bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300">
              {org.usage.plan_name}
            </span>
          </h3>
          <UsageBar used={org.usage.posts_used} limit={org.usage.posts_limit} label="Posts" />
          <UsageBar
            used={org.usage.ai_credits_used}
            limit={org.usage.ai_credits_limit}
            label="AI credits"
          />
          <UsageBar
            used={org.usage.profiles_used}
            limit={org.usage.profiles_limit}
            label="Connected profiles"
          />
          <div className="pt-1 text-[11px] text-muted">
            Effective limits include plan values plus any overrides above.
          </div>
        </div>
      </div>
    </div>
  );
}
