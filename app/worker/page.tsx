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
