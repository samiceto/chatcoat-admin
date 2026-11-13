"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Gauge, Loader2, MessageSquareText, ShieldAlert, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  inputClassName,
  labelClassName,
} from "@/components/ui";

type ModelSetting = {
  key: string;
  label: string;
  description: string;
  db_value: string | null;
  env_var: string;
  env_value: string | null;
  default: string;
  effective: string;
  source: "dashboard" | "environment" | "default";
};

const MODEL_OPTIONS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Cheapest" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", hint: "Balanced" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Smarter" },
  { id: "gpt-4.1", label: "GPT-4.1", hint: "Best quality" },
  { id: "deepseek-chat", label: "DeepSeek Chat", hint: "DeepSeek" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", hint: "DeepSeek reasoning" },
];

const ICONS: Record<string, typeof Bot> = {
  "llm.copilot_model": Bot,
  "llm.autopilot_model": MessageSquareText,
  "llm.suggestion_model": Sparkles,
  "llm.whatsapp_copilot_model": MessageSquareText,
};

const SOURCE_TONE: Record<string, "blue" | "amber" | "gray"> = {
  dashboard: "blue",
  environment: "amber",
  default: "gray",
};

type GeneralSetting = {
  key: string;
  label: string;
  description: string;
  value: string | null;
};

type FailoverPreview = {
  dry_run: boolean;
  resumed_event_pending: boolean;
  orgs_on_primary: number;
  orgs_on_secondary: number;
  recipients_count: number;
  already_messaged_count: number;
  secondary_configured: boolean;
  failover_template: string | null;
  requires?: string;
};

type FailoverResult = {
  result?: string;
  resumed?: boolean;
  flipped_orgs?: number;
  sent?: number;
  already_sent?: number;
  failed_count?: number;
  status?: string;
};

export default function AiModelsPage() {
  const [models, setModels] = useState<ModelSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [assistantNumber, setAssistantNumber] = useState("");
  const [assistantNumberSaved, setAssistantNumberSaved] = useState<string | null>(null);
  const [assistantDisplay, setAssistantDisplay] = useState("");
  const [assistantDisplaySaved, setAssistantDisplaySaved] = useState<string | null>(null);
  const [assistantTemplate, setAssistantTemplate] = useState("");
  const [assistantTemplateSaved, setAssistantTemplateSaved] = useState<string | null>(null);
  const [assistantNumber2, setAssistantNumber2] = useState("");
  const [assistantNumber2Saved, setAssistantNumber2Saved] = useState<string | null>(null);
  const [assistantDisplay2, setAssistantDisplay2] = useState("");
  const [assistantDisplay2Saved, setAssistantDisplay2Saved] = useState<string | null>(null);
  const [failoverTemplate, setFailoverTemplate] = useState("");
  const [failoverTemplateSaved, setFailoverTemplateSaved] = useState<string | null>(null);
  const [aiCap, setAiCap] = useState("");
  const [aiCapSaved, setAiCapSaved] = useState<string | null>(null);
  const [foPreview, setFoPreview] = useState<FailoverPreview | null>(null);
  const [foResult, setFoResult] = useState<FailoverResult | null>(null);
  const [foConfirmed, setFoConfirmed] = useState(false);
  const [foBusy, setFoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ models: ModelSetting[] }>("/api/admin/settings/llm-models", {
      forceFresh: true,
    })
      .then((data) => {
        setModels(data.models || []);
        const d: Record<string, string> = {};
        for (const m of data.models || []) d[m.key] = m.db_value || "";
        setDrafts(d);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load AI settings. This page requires the settings.manage permission."
        )
      )
      .finally(() => setLoading(false));
    apiFetch<{ settings: GeneralSetting[] }>("/api/admin/settings/general", {
      forceFresh: true,
    })
      .then((data) => {
        const s = (data.settings || []).find(
          (x) => x.key === "whatsapp.assistant_phone_number_id"
        );
        setAssistantNumber(s?.value || "");
        setAssistantNumberSaved(s?.value || null);
        const disp = (data.settings || []).find(
          (x) => x.key === "whatsapp.assistant_phone_display"
        );
        setAssistantDisplay(disp?.value || "");
        setAssistantDisplaySaved(disp?.value || null);
        const tpl = (data.settings || []).find(
          (x) => x.key === "whatsapp.daily_summary_template"
        );
        setAssistantTemplate(tpl?.value || "");
        setAssistantTemplateSaved(tpl?.value || null);
        const num2 = (data.settings || []).find(
          (x) => x.key === "whatsapp.assistant_phone_number_id_2"
        );
        setAssistantNumber2(num2?.value || "");
        setAssistantNumber2Saved(num2?.value || null);
        const disp2 = (data.settings || []).find(
          (x) => x.key === "whatsapp.assistant_phone_display_2"
        );
        setAssistantDisplay2(disp2?.value || "");
        setAssistantDisplay2Saved(disp2?.value || null);
        const ftpl = (data.settings || []).find(
          (x) => x.key === "whatsapp.failover_template"
        );
        setFailoverTemplate(ftpl?.value || "");
        setFailoverTemplateSaved(ftpl?.value || null);
        const cap = (data.settings || []).find(
          (x) => x.key === "ai.global_daily_cap"
        );
        setAiCap(cap?.value || "");
        setAiCapSaved(cap?.value || null);
      })
      .catch(() => {});
  }, []);

  const saveGeneralSetting = async (
    key: string,
    value: string,
    apply: (v: string | null) => void,
    failure: string
  ) => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/settings/general", {
        method: "PUT",
        body: JSON.stringify({ settings: { [key]: value.trim() || null } }),
      });
      apply(value.trim() || null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setSaving(false);
    }
  };

  const runFailoverPreview = async () => {
    setFoBusy(true);
    setError(null);
    setFoResult(null);
    try {
      const data = await apiFetch<FailoverPreview>(
        "/api/admin/settings/assistant-failover",
        { method: "POST", body: JSON.stringify({ dry_run: true }) }
      );
      setFoPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't preview the failover.");
    } finally {
      setFoBusy(false);
    }
  };

  const runFailover = async () => {
    setFoBusy(true);
    setError(null);
    try {
      const data = await apiFetch<FailoverResult>(
        "/api/admin/settings/assistant-failover",
        { method: "POST", body: JSON.stringify({ dry_run: false, confirm: true }) }
      );
      setFoResult(data);
      setFoPreview(null);
      setFoConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The failover didn't run.");
    } finally {
      setFoBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const dirty = models.some((m) => (drafts[m.key] || "") !== (m.db_value || ""));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Record<string, string | null> = {};
      for (const m of models) {
        const v = (drafts[m.key] || "").trim();
        payload[m.key] = v || null;
      }
      await apiFetch("/api/admin/settings/llm-models", {
        method: "PUT",
        body: JSON.stringify({ models: payload }),
      });
      setSaved(true);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Models"
        description="Which LLM each agent uses. Changes take effect immediately — no deploy needed."
        actions={
          <Button variant="primary" onClick={save} disabled={saving || !dirty}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {saved && !error && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          Saved. New model applies to the next request each agent makes.
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading AI settings…" />
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((m) => {
            const Icon = ICONS[m.key] || Bot;
            return (
              <Card key={m.key}>
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-gray-900">
                        {m.label}
                      </h3>
                      <Badge tone={SOURCE_TONE[m.source]}>
                        {m.source === "dashboard"
                          ? "Set here"
                          : m.source === "environment"
                            ? `Env: ${m.env_var}`
                            : "Default"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[13px] text-gray-500">{m.description}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClassName()}>Model</label>
                        <input
                          value={drafts[m.key] || ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [m.key]: e.target.value }))
                          }
                          className={inputClassName()}
                          list={`model-options-${m.key}`}
                          placeholder={
                            m.env_value
                              ? `Use env (${m.env_var} = ${m.env_value})`
                              : `Use default (${m.default})`
                          }
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <datalist id={`model-options-${m.key}`}>
                          {MODEL_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label} — {o.hint}
                            </option>
                          ))}
                        </datalist>
                        <p className="mt-1.5 text-[12px] text-gray-400">
                          Pick a preset or type any model id — e.g. deepseek-chat for
                          DeepSeek, or another model from the provider set in
                          LLM_BASE_URL. Leave empty to use the env/default value.
                        </p>
                      </div>
                      <div>
                        <label className={labelClassName()}>Currently effective</label>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[13px] text-gray-800">
                          {m.effective}
                        </div>
                      </div>
                    </div>
                    {m.key === "llm.autopilot_model" && (
                      <p className="mt-2 text-[12px] text-gray-400">
                        Businesses can still override this per-workspace in the product's
                        Customer Agent page — that override wins over this global value.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-4">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <MessageSquareText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-gray-900">
              Assistant WhatsApp number
            </h3>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Phone number ID of the ChatCoat assistant's own WhatsApp number.
              Messages to this number are routed to the WhatsApp Owner Agent. Find it in
              WhatsApp Manager by clicking the phone number.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={assistantNumber}
                onChange={(e) => setAssistantNumber(e.target.value)}
                placeholder="e.g. 123456789012345"
                className={inputClassName()}
              />
              <Button
                variant="secondary"
                disabled={saving || assistantNumber.trim() === (assistantNumberSaved || "")}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  try {
                    await apiFetch("/api/admin/settings/general", {
                      method: "PUT",
                      body: JSON.stringify({
                        settings: {
                          "whatsapp.assistant_phone_number_id":
                            assistantNumber.trim() || null,
                        },
                      }),
                    });
                    setAssistantNumberSaved(assistantNumber.trim() || null);
                    setSaved(true);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Couldn't save number."
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save
              </Button>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className={labelClassName()}>
                Assistant WhatsApp number (display)
              </label>
              <p className="mt-0.5 text-[13px] text-gray-500">
                The number users message to pair, shown on the /copilot-whatsapp
                pairing page. Display only — the number ID above is what routes
                messages, so put the human-readable number here, not the ID.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={assistantDisplay}
                  onChange={(e) => setAssistantDisplay(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className={inputClassName()}
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving || assistantDisplay.trim() === (assistantDisplaySaved || "")
                  }
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiFetch("/api/admin/settings/general", {
                        method: "PUT",
                        body: JSON.stringify({
                          settings: {
                            "whatsapp.assistant_phone_display":
                              assistantDisplay.trim() || null,
                          },
                        }),
                      });
                      setAssistantDisplaySaved(assistantDisplay.trim() || null);
                      setSaved(true);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Couldn't save display number."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className={labelClassName()}>
                Secondary assistant number (+92) — number ID
              </label>
              <p className="mt-0.5 text-[13px] text-gray-500">
                The second assistant number, in the SAME WhatsApp business account
                as the primary number above — both share the one access token.
                Orgs an admin assigns to the secondary number (org page) are
                served by it. The number only counts as configured when BOTH
                this ID and its display number below are set; a half-filled
                secondary is ignored everywhere.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={assistantNumber2}
                  onChange={(e) => setAssistantNumber2(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className={inputClassName()}
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving || assistantNumber2.trim() === (assistantNumber2Saved || "")
                  }
                  onClick={() =>
                    saveGeneralSetting(
                      "whatsapp.assistant_phone_number_id_2",
                      assistantNumber2,
                      setAssistantNumber2Saved,
                      "Couldn't save the secondary number."
                    )
                  }
                >
                  Save
                </Button>
              </div>
              <label className={`${labelClassName()} mt-4 block`}>
                Secondary assistant number (display)
              </label>
              <p className="mt-0.5 text-[13px] text-gray-500">
                The human-readable +92 number, shown on the pairing page of
                orgs assigned to the secondary number. Display only — the ID
                above routes.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={assistantDisplay2}
                  onChange={(e) => setAssistantDisplay2(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className={inputClassName()}
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving || assistantDisplay2.trim() === (assistantDisplay2Saved || "")
                  }
                  onClick={() =>
                    saveGeneralSetting(
                      "whatsapp.assistant_phone_display_2",
                      assistantDisplay2,
                      setAssistantDisplay2Saved,
                      "Couldn't save the secondary display number."
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className={labelClassName()}>
                Daily summary template name
              </label>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Name of the approved WhatsApp template the Owner Agent sends
                each morning (the pairing gate). Must match the template name
                in WhatsApp Manager exactly. Leave empty to use the built-in
                default, chatcoat_daily_summary.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={assistantTemplate}
                  onChange={(e) => setAssistantTemplate(e.target.value)}
                  placeholder="chatcoat_daily_summary"
                  className={inputClassName()}
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving || assistantTemplate.trim() === (assistantTemplateSaved || "")
                  }
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await apiFetch("/api/admin/settings/general", {
                        method: "PUT",
                        body: JSON.stringify({
                          settings: {
                            "whatsapp.daily_summary_template":
                              assistantTemplate.trim() || null,
                          },
                        }),
                      });
                      setAssistantTemplateSaved(assistantTemplate.trim() || null);
                      setSaved(true);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Couldn't save template name."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className={labelClassName()}>
                Failover template name
              </label>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Name of the pre-approved template the failover switch (below)
                sends from the secondary number when the primary number is
                lost — suggested name: chatcoat_assistant_failover. It must
                be created and approved in WhatsApp Manager first and must
                take NO variables. Leave empty and the failover switch
                refuses to run.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={failoverTemplate}
                  onChange={(e) => setFailoverTemplate(e.target.value)}
                  placeholder="chatcoat_assistant_failover"
                  className={inputClassName()}
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving || failoverTemplate.trim() === (failoverTemplateSaved || "")
                  }
                  onClick={() =>
                    saveGeneralSetting(
                      "whatsapp.failover_template",
                      failoverTemplate,
                      setFailoverTemplateSaved,
                      "Couldn't save the failover template name."
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Gauge size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-gray-900">
              Global AI daily cap
            </h3>
            <p className="mt-0.5 text-[13px] text-gray-500">
              The platform-wide AI kill switch. It counts every AI call
              from every customer together; past this many calls in one
              day (UTC), all AI features pause until midnight UTC, so a
              runaway loop or abusive accounts cannot run the AI bill
              past this ceiling. Changes apply immediately — no deploy.
            </p>
            <label className={`${labelClassName()} mt-4 block`}>
              Max AI calls per day (all customers)
            </label>
            <div className="mt-3 flex gap-2">
              <input
                value={aiCap}
                onChange={(e) => setAiCap(e.target.value)}
                placeholder="25000"
                inputMode="numeric"
                className={inputClassName()}
              />
              <Button
                variant="secondary"
                disabled={saving || aiCap.trim() === (aiCapSaved || "")}
                onClick={() =>
                  saveGeneralSetting(
                    "ai.global_daily_cap",
                    aiCap,
                    setAiCapSaved,
                    "Couldn't save the AI daily cap."
                  )
                }
              >
                Save
              </Button>
            </div>
            <p className="mt-2 text-[13px] text-gray-500">
              Leave empty to use the built-in default of 25,000. Set 0
              to switch the breaker off. Whole numbers only.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-gray-900">
              Assistant number failover
            </h3>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Emergency switch for when the primary (+1) assistant number is
              lost. It moves EVERY org still on the primary number to the
              secondary (+92) number and sends each verified owner the
              failover template from +92 telling them to save the new
              number. <strong>One way only</strong> — there is no switch
              back; an owner moved to +92 stays there (an individual org
              can be re-assigned from its org page). Nothing here runs on
              its own: a person confirms the loss and presses the switch.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                disabled={foBusy}
                onClick={runFailoverPreview}
              >
                {foBusy && <Loader2 size={14} className="animate-spin" />}
                Preview failover
              </Button>
            </div>
            {foPreview && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
                <ul className="space-y-1">
                  <li>
                    Orgs on the primary number (would move):{" "}
                    <strong>{foPreview.orgs_on_primary}</strong>
                  </li>
                  <li>
                    Orgs already on the secondary number:{" "}
                    <strong>{foPreview.orgs_on_secondary}</strong>
                  </li>
                  <li>
                    Verified owners who would be messaged:{" "}
                    <strong>{foPreview.recipients_count}</strong>
                    {foPreview.already_messaged_count > 0 &&
                      ` (${foPreview.already_messaged_count} already messaged by an interrupted run — they won't be messaged again)`}
                  </li>
                  <li>
                    Secondary number configured:{" "}
                    <strong>{foPreview.secondary_configured ? "Yes" : "No"}</strong>
                  </li>
                  <li>
                    Failover template:{" "}
                    <strong>{foPreview.failover_template || "Not set"}</strong>
                  </li>
                  {foPreview.resumed_event_pending && (
                    <li>
                      An earlier failover run is still in progress — running
                      the switch resumes it instead of starting over.
                    </li>
                  )}
                </ul>
                {(!foPreview.secondary_configured || !foPreview.failover_template) && (
                  <p className="mt-2 font-medium text-rose-600">
                    The switch will refuse to run until the secondary number
                    (ID + display) and the failover template name are set
                    above.
                  </p>
                )}
                <label className="mt-3 flex items-start gap-2 text-[13px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={foConfirmed}
                    onChange={(e) => setFoConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm the primary number is lost and understand every
                    org above moves to the secondary number. This cannot be
                    undone from here.
                  </span>
                </label>
                <div className="mt-3">
                  <Button
                    variant="danger"
                    disabled={
                      foBusy ||
                      !foConfirmed ||
                      !foPreview.secondary_configured ||
                      !foPreview.failover_template
                    }
                    onClick={runFailover}
                  >
                    {foBusy && <Loader2 size={14} className="animate-spin" />}
                    Run failover — move all orgs to +92
                  </Button>
                </div>
              </div>
            )}
            {foResult && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                {foResult.result === "nothing_to_do" ? (
                  <p>Nothing to do — no orgs were left on the primary number.</p>
                ) : (
                  <p>
                    Failover {foResult.resumed ? "resumed and " : ""}completed
                    {typeof foResult.status === "string" &&
                    foResult.status === "completed_with_failures"
                      ? " with failures"
                      : ""}
                    : <strong>{foResult.flipped_orgs ?? 0}</strong> orgs moved,{" "}
                    <strong>{foResult.sent ?? 0}</strong> owners messaged
                    {(foResult.already_sent ?? 0) > 0 &&
                      `, ${foResult.already_sent} already messaged earlier`}
                    {(foResult.failed_count ?? 0) > 0 &&
                      `, ${foResult.failed_count} message(s) failed — re-running the switch retries only those owners`}
                    .
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="text-[13px] font-semibold text-gray-900">How precedence works</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
          A value set here beats the Render environment variable, which beats the
          built-in default. Clear the dropdown back to "Use default/env" to fall
          through again. Every change is written to the audit log.
        </p>
      </Card>
    </div>
  );
}
