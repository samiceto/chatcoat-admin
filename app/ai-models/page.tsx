"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, MessageSquareText, Sparkles } from "lucide-react";
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

export default function AiModelsPage() {
  const [models, setModels] = useState<ModelSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [assistantNumber, setAssistantNumber] = useState("");
  const [assistantNumberSaved, setAssistantNumberSaved] = useState<string | null>(null);
  const [assistantDisplay, setAssistantDisplay] = useState("");
  const [assistantDisplaySaved, setAssistantDisplaySaved] = useState<string | null>(null);
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
      })
      .catch(() => {});
  }, []);

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
