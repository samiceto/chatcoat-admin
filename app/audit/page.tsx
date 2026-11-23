"use client";

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

type AuditItem = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<string, unknown>;
  created_at: string | null;
};

// Human-readable renderings of the machine values the API stores
// (owner request 2026-11-23: the log read as raw codes and UUIDs).
// Unknown values fall back to a prettified form, never the raw code.
const ACTION_LABELS: Record<string, string> = {
  "org.update": "Organization updated",
  "org.override_upsert": "Limit override set",
  "org.override_delete": "Limit override removed",
  "org.grant_trial": "Trial granted",
  "org.copilot_addon": "Copilot add-on changed",
  "plan.create": "Plan created",
  "plan.update": "Plan updated",
  "plan.deactivate": "Plan deactivated",
  "staff.bootstrap": "First admin created",
  "staff.invite": "Staff invited",
  "staff.update": "Staff updated",
  "staff.remove": "Staff removed",
  "settings.general": "General settings updated",
  "settings.llm_models": "AI model settings updated",
  "support_ticket.update": "Support ticket updated",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  organization: "Organization",
  plan: "Plan",
  staff_user: "Staff member",
  support_ticket: "Support ticket",
  system_setting: "System setting",
};

const FIELD_LABELS: Record<string, string> = {
  plan_slug: "Plan",
  is_suspended: "Suspended",
  purchase_blocked: "Purchases blocked",
  trial_ended: "Trial ended",
  metric: "Limit",
  limit_value: "New limit",
  channels: "Trial channels",
  days: "Trial length (days)",
  trial_ends_at: "Trial ends",
  email: "Email",
  role: "Role",
  is_active: "Active",
  name: "Name",
  status: "Status",
  admin_note: "Internal note",
};

const METRIC_LABELS: Record<string, string> = {
  posts_per_month: "Posts per month",
  campaigns_per_month: "Campaigns per month",
  ai_credits: "AI credits",
  seats: "Seats",
  profiles: "Profiles (channels)",
  workspaces: "Workspaces",
};

const PLAN_SLUG_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Custom",
  growth: "Pro",
  agency: "Agency",
};

function prettify(raw: string): string {
  const words = raw.replace(/[._]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : raw;
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || prettify(action);
}

function actorLabel(email: string | null): string {
  if (!email) return "—";
  // Panel sessions made with the master API key log this literal
  // actor; show what it means instead of the credential's name.
  if (email === "admin-api-key") return "Admin panel";
  return email;
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "— (cleared)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "plan_slug" && typeof value === "string")
    return PLAN_SLUG_LABELS[value] || value;
  if (key === "metric" && typeof value === "string")
    return METRIC_LABELS[value] || prettify(value);
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value))
    return value.map((v) => String(v)).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DetailLines({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details);
  if (entries.length === 0) return <span className="text-gray-300">—</span>;
  return (
    <details>
      <summary className="cursor-pointer font-medium hover:text-gray-900">
        View changes
      </summary>
      <dl className="mt-1.5 space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-gray-700">
              {FIELD_LABELS[key] || prettify(key)}:
            </dt>
            <dd className="break-words">{formatDetailValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

const PAGE_SIZE = 100;

function actionTone(action: string): "red" | "amber" | "blue" | "gray" {
  const a = action.toLowerCase();
  if (a.includes("suspend") || a.includes("delete") || a.includes("remove"))
    return "red";
  if (a.includes("bootstrap") || a.includes("create") || a.includes("invite"))
    return "amber";
  if (a.includes("plan") || a.includes("override") || a.includes("update"))
    return "blue";
  return "gray";
}

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
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
    apiFetch<{ total: number; items: AuditItem[] }>(
      `/api/admin/audit-log?${params.toString()}`,
      { forceFresh: true }
    )
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load the audit log.")
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
        title="Audit log"
        description={`${total.toLocaleString()} recorded actions — every admin write is logged here.`}
      />
      <ErrorAlert message={error} />

      <form onSubmit={submitSearch} className="mb-4 flex gap-2">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by action, actor e-mail, or entity ID…"
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
          <LoadingRow label="Loading audit log…" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No audit records"
            description={
              q
                ? "Try a different search term."
                : "Actions taken in the admin console will appear here."
            }
          />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr key={item.id} className="align-top">
                  <Td className="whitespace-nowrap text-[13px] text-gray-500">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "—"}
                  </Td>
                  <Td>
                    <div className="text-[13px] font-semibold text-gray-900">
                      {actorLabel(item.actor_email)}
                    </div>
                    {item.actor_role && (
                      <div className="text-[12px] text-gray-400">
                        {prettify(item.actor_role)}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={actionTone(item.action)}>
                      <span title={item.action}>{actionLabel(item.action)}</span>
                    </Badge>
                  </Td>
                  <Td className="text-[13px] text-gray-500">
                    {item.entity_label && (
                      <div className="font-medium text-gray-700">
                        {item.entity_label}
                      </div>
                    )}
                    {item.entity_type && (
                      <div className="text-[12px] text-gray-400">
                        {ENTITY_TYPE_LABELS[item.entity_type] ||
                          prettify(item.entity_type)}
                      </div>
                    )}
                    {item.entity_id && item.entity_label !== item.entity_id && (
                      <div className="font-mono text-[11px] text-gray-300">
                        {item.entity_id.slice(0, 18)}
                      </div>
                    )}
                    {!item.entity_type && !item.entity_id && "—"}
                  </Td>
                  <Td className="text-[12px] text-gray-500">
                    <DetailLines details={item.details || {}} />
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
