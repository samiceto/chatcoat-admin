"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "@/components/admin-error";

type Plan = {
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
  paddle_price_id: string | null;
  max_profiles: number;
  max_posts_per_month: number;
  ai_credits: number;
  max_workspaces: number;
  max_campaigns_per_month: number;
  allowed_platforms: string[];
  features: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
  organizations_on_plan: number;
};

const EMPTY_FORM: Plan = {
  slug: "",
  name: "",
  price_cents: 0,
  currency: "USD",
  billing_interval: "month",
  paddle_price_id: null,
  max_profiles: 2,
  max_posts_per_month: 15,
  ai_credits: 50,
  max_workspaces: 1,
  max_campaigns_per_month: 15,
  allowed_platforms: [],
  features: {},
  is_active: true,
  sort_order: 0,
  organizations_on_plan: 0,
};

const LIMIT_FIELDS: { key: keyof Plan; label: string }[] = [
  { key: "max_profiles", label: "Connected profiles" },
  { key: "max_posts_per_month", label: "Posts / month" },
  { key: "ai_credits", label: "AI credits / month" },
  { key: "max_workspaces", label: "Workspaces" },
  { key: "max_campaigns_per_month", label: "Campaigns / month" },
];

function formatMoney(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Plan>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [platformsText, setPlatformsText] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Plan[]>("/api/admin/plans?include_inactive=true", { forceFresh: true })
      .then((data) => {
        setPlans(data || []);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load plans.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPlatformsText("");
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({ ...plan });
    setPlatformsText((plan.allowed_platforms || []).join(", "));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditing(null);
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setPlatformsText("");
    setError(null);
  };

  const save = async () => {
    const slug = form.slug.trim().toLowerCase();
    if (!slug || !form.name.trim()) {
      setError("Slug and name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      slug,
      name: form.name.trim(),
      allowed_platforms: platformsText
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    };
    try {
      if (editing) {
        const { slug: _s, organizations_on_plan: _o, ...patch } = payload;
        await apiFetch(`/api/admin/plans/${editing.slug}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      } else {
        await apiFetch("/api/admin/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeDialog();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the plan.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: Plan) => {
    const action = plan.is_active ? "deactivate" : "reactivate";
    if (
      plan.is_active &&
      !window.confirm(
        `Deactivate the "${plan.name}" plan? ${plan.organizations_on_plan} organization(s) are on it — deactivation is blocked while any are assigned.`
      )
    ) {
      return;
    }
    try {
      if (plan.is_active) {
        await apiFetch(`/api/admin/plans/${plan.slug}`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/admin/plans/${plan.slug}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: true }),
        });
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Couldn't ${action} the plan.`);
    }
  };

  const set = <K extends keyof Plan>(key: K, value: Plan[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Limits and prices here are live — editing a plan changes what every
          organization on it can do, immediately.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover px-3.5 py-2 text-xs font-semibold text-white transition-colors"
        >
          <Plus size={14} />
          <span>New plan</span>
        </button>
      </div>

      <AdminError message={error} />

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
          <span>Loading plans...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06] p-5 ${
                plan.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                    {!plan.is_active && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-muted">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="font-mono">{plan.slug}</span> ·{" "}
                    {formatMoney(plan.price_cents, plan.currency)} / {plan.billing_interval}
                    {" · "}
                    {plan.organizations_on_plan} org
                    {plan.organizations_on_plan === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    title="Edit plan"
                    className="p-2 rounded-lg bg-[var(--inset)] text-muted hover:text-ink transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(plan)}
                    title={plan.is_active ? "Deactivate plan" : "Reactivate plan"}
                    className="p-2 rounded-lg bg-[var(--inset)] text-muted hover:text-ink transition-colors"
                  >
                    <Power size={14} />
                  </button>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                {LIMIT_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-bold text-ink">
                      {(plan[key] as number).toLocaleString()}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-muted">Platforms</dt>
                  <dd className="font-bold text-ink">{plan.allowed_platforms.length}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-bold text-ink">
              {editing ? `Edit plan "${editing.name}"` : "New plan"}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-muted">
                Slug
                <input
                  value={form.slug}
                  disabled={!!editing}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="growth"
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink disabled:opacity-60"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Display name
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Pro"
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Price (cents)
                <input
                  type="number"
                  min={0}
                  value={form.price_cents}
                  onChange={(e) => set("price_cents", parseInt(e.target.value || "0", 10))}
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Currency
                <input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
              {LIMIT_FIELDS.map(({ key, label }) => (
                <label key={key} className="text-xs font-semibold text-muted">
                  {label}
                  <input
                    type="number"
                    min={0}
                    value={form[key] as number}
                    onChange={(e) =>
                      set(key, parseInt(e.target.value || "0", 10) as never)
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                  />
                </label>
              ))}
              <label className="col-span-2 text-xs font-semibold text-muted">
                Allowed platforms (comma separated)
                <input
                  value={platformsText}
                  onChange={(e) => setPlatformsText(e.target.value)}
                  placeholder="facebook, instagram, x, whatsapp"
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="col-span-2 text-xs font-semibold text-muted">
                Paddle price ID (optional)
                <input
                  value={form.paddle_price_id || ""}
                  onChange={(e) => set("paddle_price_id", e.target.value || null)}
                  placeholder="pri_..."
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Feature flags are edited per plan via the API for now; limits and
              pricing above cover the common changes.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                <span>{editing ? "Save changes" : "Create plan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
