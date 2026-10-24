"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  inputClassName,
  labelClassName,
} from "@/components/ui";

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
  trial_ends_at: string | null;
  last_activity_at: string | null;
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
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-gray-500">{label}</span>
        <span className={`tnum font-semibold ${over ? "text-rose-600" : "text-gray-900"}`}>
          {used.toLocaleString()} <span className="font-normal text-gray-400">/ {limit > 0 ? limit.toLocaleString() : "∞"}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-indigo-600"}`}
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
      <Card>
        <LoadingRow label="Loading organization…" />
      </Card>
    );
  }

  if (!org) {
    return (
      <div>
        <ErrorAlert message={error || "Organization not found."} />
        <Link href="/orgs" className="text-[13px] font-semibold text-indigo-600 hover:underline">
          ← Back to organizations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/orgs"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Organizations
      </Link>

      <PageHeader
        title={org.name}
        description={`${org.owner_email || "No owner email"} · ${org.member_count} member${org.member_count === 1 ? "" : "s"} · Created ${org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}${org.trial_ends_at ? ` · Trial ends ${new Date(org.trial_ends_at).toLocaleDateString()}` : ""}${org.last_activity_at ? ` · Last activity ${new Date(org.last_activity_at).toLocaleDateString()}` : ""}`}
        actions={
          <Button
            variant={org.is_suspended ? "primary" : "danger"}
            onClick={toggleSuspend}
            disabled={saving}
          >
            <ShieldAlert size={14} />
            {org.is_suspended ? "Unsuspend workspace" : "Suspend workspace"}
          </Button>
        }
      />
      <ErrorAlert message={error} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {org.is_suspended ? (
          <Badge tone="red">Suspended — API access blocked</Badge>
        ) : (
          <Badge tone="green">Active</Badge>
        )}
        <Badge tone="indigo">{org.usage.plan_name}</Badge>
        {org.plan_slug && <Badge tone="gray">Admin-assigned plan</Badge>}
        <span className="font-mono text-[11px] text-gray-400">{org.id}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Plan & limits</CardTitle>
          <div className="mt-4">
            <label className={labelClassName()}>Assigned plan</label>
            <div className="flex gap-2">
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                disabled={saving}
                className={inputClassName("flex-1")}
              >
                <option value="">Paddle subscription (default)</option>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={savePlan} disabled={saving}>
                Save
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              An admin-assigned plan overrides the Paddle subscription. Clear it
              to fall back to billing-derived tiering.
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900">Limit overrides</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Per-organization limits take precedence over plan limits.
            </p>
            <div className="mt-3 flex gap-2">
              <select
                value={overrideMetric}
                onChange={(e) => setOverrideMetric(e.target.value)}
                disabled={saving}
                className={inputClassName()}
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
                placeholder="Limit"
                disabled={saving}
                className={inputClassName("w-28")}
              />
              <Button onClick={addOverride} disabled={saving}>
                Set
              </Button>
            </div>
            {Object.keys(org.overrides).length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {Object.entries(org.overrides).map(([metric, value]) => (
                  <li
                    key={metric}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[13px] ring-1 ring-inset ring-gray-200"
                  >
                    <span className="font-medium text-gray-700">
                      {OVERRIDE_METRICS.find((m) => m.key === metric)?.label || metric}
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="tnum font-bold text-indigo-700">
                        {value.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOverride(metric)}
                        title="Remove override"
                        className="text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                No overrides — plan limits apply.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Usage this month</CardTitle>
            <Badge tone="indigo">{org.usage.plan_name}</Badge>
          </div>
          <div className="mt-5 space-y-5">
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
          </div>
          <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400">
            Effective limits include plan values plus any overrides.
          </p>
        </Card>
      </div>
    </div>
  );
}
