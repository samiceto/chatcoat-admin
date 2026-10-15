"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  Modal,
  PageHeader,
  TableShell,
  Td,
  Th,
  Tr,
  inputClassName,
  labelClassName,
} from "@/components/ui";

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
  { key: "max_profiles", label: "Profiles" },
  { key: "max_posts_per_month", label: "Posts / mo" },
  { key: "ai_credits", label: "AI credits" },
  { key: "max_workspaces", label: "Workspaces" },
  { key: "max_campaigns_per_month", label: "Campaigns / mo" },
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
    <div>
      <PageHeader
        title="Plans"
        description="Limits and prices are live — editing a plan changes what every organization on it can do, immediately."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={14} />
            New plan
          </Button>
        }
      />
      <ErrorAlert message={error} />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading plans…" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No plans yet"
            description="Create your first plan to start tiering organizations."
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus size={14} /> New plan
              </Button>
            }
          />
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th>Price</Th>
              <Th className="text-right">Profiles</Th>
              <Th className="text-right">Posts / mo</Th>
              <Th className="text-right">AI credits</Th>
              <Th className="text-right">Workspaces</Th>
              <Th className="text-right">Orgs</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <Tr key={plan.slug} className={!plan.is_active ? "opacity-55" : ""}>
                <Td>
                  <div className="font-semibold text-gray-900">{plan.name}</div>
                  <div className="font-mono text-[11px] text-gray-400">
                    {plan.slug}
                  </div>
                </Td>
                <Td className="tnum whitespace-nowrap text-[13px] text-gray-700">
                  {formatMoney(plan.price_cents, plan.currency)}
                  <span className="text-gray-400"> / {plan.billing_interval}</span>
                </Td>
                <Td className="tnum text-right text-[13px] text-gray-700">
                  {plan.max_profiles.toLocaleString()}
                </Td>
                <Td className="tnum text-right text-[13px] text-gray-700">
                  {plan.max_posts_per_month.toLocaleString()}
                </Td>
                <Td className="tnum text-right text-[13px] text-gray-700">
                  {plan.ai_credits.toLocaleString()}
                </Td>
                <Td className="tnum text-right text-[13px] text-gray-700">
                  {plan.max_workspaces.toLocaleString()}
                </Td>
                <Td className="tnum text-right text-[13px] text-gray-700">
                  {plan.organizations_on_plan.toLocaleString()}
                </Td>
                <Td>
                  {plan.is_active ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="gray">Inactive</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      title="Edit plan"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(plan)}
                      title={plan.is_active ? "Deactivate plan" : "Reactivate plan"}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Power size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {dialogOpen && (
        <Modal
          title={editing ? `Edit plan "${editing.name}"` : "New plan"}
          description="Changes apply immediately to all organizations on this plan."
          onClose={closeDialog}
          wide
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClassName()}>Slug</label>
              <input
                value={form.slug}
                disabled={!!editing}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="growth"
                className={inputClassName("disabled:opacity-60")}
              />
            </div>
            <div>
              <label className={labelClassName()}>Display name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Pro"
                className={inputClassName()}
              />
            </div>
            <div>
              <label className={labelClassName()}>Price (cents)</label>
              <input
                type="number"
                min={0}
                value={form.price_cents}
                onChange={(e) => set("price_cents", parseInt(e.target.value || "0", 10))}
                className={inputClassName()}
              />
            </div>
            <div>
              <label className={labelClassName()}>Currency</label>
              <input
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={inputClassName()}
              />
            </div>
            {LIMIT_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className={labelClassName()}>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[key] as number}
                  onChange={(e) =>
                    set(key, parseInt(e.target.value || "0", 10) as never)
                  }
                  className={inputClassName()}
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelClassName()}>
                Allowed platforms (comma separated)
              </label>
              <input
                value={platformsText}
                onChange={(e) => setPlatformsText(e.target.value)}
                placeholder="facebook, instagram, x, whatsapp"
                className={inputClassName()}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClassName()}>
                Paddle price ID (optional)
              </label>
              <input
                value={form.paddle_price_id || ""}
                onChange={(e) => set("paddle_price_id", e.target.value || null)}
                placeholder="pri_..."
                className={inputClassName()}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Feature flags are edited per plan via the API for now; limits and
            pricing above cover the common changes.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Save changes" : "Create plan"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
