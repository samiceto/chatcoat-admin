"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  PageHeader,
  Stat,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui";

type WorkerStats = {
  generated_at: string;
  counts: Record<string, number>;
  due_pending: number;
  oldest_wait_seconds: number;
  running: {
    id: string;
    job_type: string;
    organization_id: string | null;
    attempt_count: number;
    locked_at: string | null;
    running_for_seconds: number | null;
  }[];
  runs_last_hour: number;
  runs_24h: number;
  utilization: {
    busy_seconds_last_hour: number;
    load_percent_last_hour: number;
    busy_seconds_24h: number;
    load_percent_24h: number;
    estimated_ceiling_jobs_per_hour: number | null;
  };
  job_types: {
    job_type: string;
    runs: number;
    completed: number;
    failed: number;
    dead_letter: number;
    avg_seconds: number | null;
  }[];
  dead_letters: {
    id: string;
    job_type: string;
    organization_id: string | null;
    attempt_count: number;
    created_at: string | null;
    last_error: string;
  }[];
  // Present once the API serves the lanes block; absent briefly
  // while the API deploy races this page.
  lanes?: {
    pending_by_type: Record<string, number>;
    running: number;
    agent_oldest_wait_seconds: number;
  };
};

function fmtWait(seconds: number): string {
  if (seconds < 1) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function AdminWorkerPage() {
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<WorkerStats>("/api/admin/worker-stats", { forceFresh: true })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Couldn't load worker stats."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const counts = stats?.counts ?? {};
  // The API may briefly serve the previous build (no utilization block)
  // while the two deploys race — render the rest of the page regardless.
  const util = stats?.utilization ?? null;
  const lanes = stats?.lanes ?? null;
  const laneLabels: Record<string, string> = {
    whatsapp_copilot_reply: "Owner agent",
    autopilot_whatsapp_reply: "Customer agent",
    agent_dm_reply: "Reply agent (DMs)",
    sync_store_products: "Store syncs",
  };
  const health =
    stats == null
      ? null
      : stats.oldest_wait_seconds < 120
        ? { tone: "green" as const, label: "Healthy — jobs start on time" }
        : stats.oldest_wait_seconds < 600
          ? { tone: "amber" as const, label: "Busy — jobs are waiting" }
          : { tone: "red" as const, label: "Saturated — the queue is behind" };

  return (
    <div>
      <PageHeader
        title="Worker"
        description="The database job queue: backlog, wait time, throughput and dead letters. Refreshes every 30 seconds."
        actions={
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <ErrorAlert message={error} />

      {loading && !stats ? (
        <LoadingRow label="Loading worker stats…" />
      ) : !stats ? (
        <EmptyState
          title="No worker data"
          description="The worker stats endpoint returned nothing."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            {health && <Badge tone={health.tone}>{health.label}</Badge>}
            <span className="text-xs text-gray-500">
              as of {fmtWhen(stats.generated_at)}
            </span>
          </div>

          {util && (
            <Card>
              <div className="flex items-baseline justify-between gap-4">
                <CardTitle>Worker capacity — last hour</CardTitle>
                <span className="text-2xl font-bold text-gray-900">
                  {util.load_percent_last_hour}%
                  <span className="ml-2 text-sm font-medium text-gray-500">
                    loaded ·{" "}
                    {Math.max(0, Math.round(100 - util.load_percent_last_hour))}
                    % free
                  </span>
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={
                    util.load_percent_last_hour < 60
                      ? "h-full rounded-full bg-emerald-500"
                      : util.load_percent_last_hour < 85
                        ? "h-full rounded-full bg-amber-500"
                        : "h-full rounded-full bg-rose-500"
                  }
                  style={{
                    width: `${Math.min(100, Math.max(0.5, util.load_percent_last_hour))}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-[13px] text-gray-600">
                The worker spent{" "}
                <strong>{fmtWait(util.busy_seconds_last_hour)}</strong> of the
                last 60 minutes actually executing jobs. Current pace:{" "}
                <strong>{stats.runs_last_hour} jobs/hour</strong>
                {util.estimated_ceiling_jobs_per_hour != null && (
                  <>
                    {" "}
                    — at this job mix, this one worker tops out around{" "}
                    <strong>
                      ≈{util.estimated_ceiling_jobs_per_hour.toLocaleString()}{" "}
                      jobs/hour
                    </strong>
                  </>
                )}
                . Average load over 24 hours:{" "}
                <strong>{util.load_percent_24h}%</strong>. When the bar sits
                near 100% for sustained stretches, due jobs start waiting —
                that is the moment to split the worker or add one.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Due & waiting" value={String(stats.due_pending)} />
            <Stat
              label="Oldest wait"
              value={fmtWait(stats.oldest_wait_seconds)}
            />
            <Stat label="Running now" value={String(stats.running.length)} />
            <Stat label="Jobs last hour" value={String(stats.runs_last_hour)} />
            <Stat label="Jobs last 24h" value={String(stats.runs_24h)} />
            <Stat
              label="Completed (all time)"
              value={(counts.completed ?? 0).toLocaleString()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Stat label="Pending (incl. future)" value={String(counts.pending ?? 0)} />
            <Stat label="Dead letters (all time)" value={String(counts.dead_letter ?? 0)} />
            <Stat label="Failed state (all time)" value={String(counts.failed ?? 0)} />
          </div>

          {lanes && (
            <Card>
              <CardTitle>Agent &amp; sync lanes</CardTitle>
              <p className="mt-1 text-[13px] text-gray-600">
                Agent turns and store syncs run in detached lanes, not the
                serial queue. Running in lanes now:{" "}
                <strong>{lanes.running}</strong> · Oldest agent wait:{" "}
                <strong>{fmtWait(lanes.agent_oldest_wait_seconds)}</strong>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                {Object.entries(laneLabels).map(([jobType, label]) => (
                  <Stat
                    key={jobType}
                    label={`${label} — queued`}
                    value={String(lanes.pending_by_type[jobType] ?? 0)}
                  />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardTitle>Throughput by job type — last 24 hours</CardTitle>
            <div className="mt-3">
              {stats.job_types.length === 0 ? (
                <EmptyState title="No jobs ran in the last 24 hours" />
              ) : (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Job type</Th>
                      <Th>Runs</Th>
                      <Th>Completed</Th>
                      <Th>Failed</Th>
                      <Th>Dead</Th>
                      <Th>Avg duration</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.job_types.map((t) => (
                      <Tr key={t.job_type}>
                        <Td className="font-mono text-xs">{t.job_type}</Td>
                        <Td>{t.runs}</Td>
                        <Td>{t.completed}</Td>
                        <Td>{t.failed}</Td>
                        <Td>{t.dead_letter}</Td>
                        <Td>
                          {t.avg_seconds == null ? "—" : `${t.avg_seconds}s`}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>Running now</CardTitle>
            <div className="mt-3">
              {stats.running.length === 0 ? (
                <EmptyState
                  title="Nothing running this second"
                  description="Between cycles the worker is idle — this is normal."
                />
              ) : (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Job type</Th>
                      <Th>Attempt</Th>
                      <Th>Running for</Th>
                      <Th>Organization</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.running.map((j) => (
                      <Tr key={j.id}>
                        <Td className="font-mono text-xs">{j.job_type}</Td>
                        <Td>{j.attempt_count}</Td>
                        <Td>
                          {j.running_for_seconds == null
                            ? "—"
                            : fmtWait(j.running_for_seconds)}
                        </Td>
                        <Td className="font-mono text-xs">
                          {j.organization_id ?? "—"}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>Most recent dead letters</CardTitle>
            <div className="mt-3">
              {stats.dead_letters.length === 0 ? (
                <EmptyState title="No dead letters" />
              ) : (
                <TableShell>
                  <thead>
                    <tr>
                      <Th>When</Th>
                      <Th>Job type</Th>
                      <Th>Attempts</Th>
                      <Th>Last error</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dead_letters.map((d) => (
                      <Tr key={d.id}>
                        <Td className="whitespace-nowrap">
                          {fmtWhen(d.created_at)}
                        </Td>
                        <Td className="font-mono text-xs">{d.job_type}</Td>
                        <Td>{d.attempt_count}</Td>
                        <Td>
                          <span className="font-mono text-xs text-rose-700">
                            {d.last_error || "—"}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Card>

          <p className="text-xs text-gray-500">
            Wait time is the saturation signal: if the oldest due job has been
            waiting minutes, work is arriving faster than the single worker
            can drain it. Dead letters are jobs that failed every retry —
            each one names its cause in the error column.
          </p>
        </div>
      )}
    </div>
  );
}
