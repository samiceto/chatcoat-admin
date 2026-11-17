"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  LoadingRow,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  TableShell,
  Td,
  Th,
  Tr,
  inputClassName,
  labelClassName,
} from "@/components/ui";

type Ticket = {
  id: string;
  email: string;
  name: string | null;
  topic: string;
  message: string;
  status: string;
  admin_note: string | null;
  resolved_at: string | null;
  resolved_by_email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const PAGE_SIZE = 50;

const TOPIC_LABELS: Record<string, string> = {
  product_support: "Product support",
  billing: "Billing & enterprise",
  data_deletion: "Data deletion",
  app_review: "Platform app review",
  other: "Other",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function AdminSupportPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (q) params.set("q", q);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    apiFetch<{ total: number; open_count: number; items: Ticket[] }>(
      `/api/admin/support-tickets?${params.toString()}`,
      { forceFresh: true }
    )
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setOpenCount(data.open_count || 0);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load support tickets.")
      )
      .finally(() => setLoading(false));
  }, [statusFilter, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Support tickets"
        description={`${openCount.toLocaleString()} open — messages from the public contact form land here.`}
      />
      <ErrorAlert message={error} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "open", "resolved"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            variant={statusFilter === s ? "primary" : "secondary"}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {s === "all" ? "All" : s === "open" ? "Open" : "Resolved"}
          </Button>
        ))}
        <form onSubmit={submitSearch} className="flex flex-1 gap-2 sm:max-w-md">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by email or message text…"
            className="flex-1"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading tickets…" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No tickets"
            description={
              q || statusFilter !== "all"
                ? "Nothing matches this filter."
                : "Messages sent through chatcoat.com/contact will appear here."
            }
          />
        </div>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Status</Th>
                <Th>From</Th>
                <Th>Topic</Th>
                <Th>Message</Th>
                <Th>Received</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Badge tone={t.status === "open" ? "amber" : "green"}>
                      {t.status === "open" ? "Open" : "Resolved"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="font-medium text-gray-900">{t.name || t.email}</div>
                    {t.name && <div className="text-xs text-gray-500">{t.email}</div>}
                  </Td>
                  <Td>{TOPIC_LABELS[t.topic] ?? t.topic}</Td>
                  <Td className="max-w-[320px]">
                    <span className="block truncate text-gray-600">{t.message}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{fmtDate(t.created_at)}</Td>
                  <Td>
                    <Button type="button" variant="ghost" onClick={() => setSelected(t)}>
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </>
      )}

      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(updated);
            load();
          }}
        />
      )}
    </div>
  );
}

function TicketModal({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: (t: Ticket) => void;
}) {
  const [note, setNote] = useState(ticket.admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setModalError(null);
    try {
      const updated = await apiFetch<Ticket>(`/api/admin/support-tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onUpdated(updated);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Couldn't save the change.");
    } finally {
      setSaving(false);
    }
  };

  const replyHref = `mailto:${ticket.email}?subject=${encodeURIComponent(
    "Re: Your ChatCoat support message"
  )}&body=${encodeURIComponent(`Hi ${ticket.name || "there"},\n\n\n\n— ChatCoat Support\n\nOn ${fmtDate(ticket.created_at)} you wrote:\n${ticket.message}`)}`;

  return (
    <Modal
      wide
      title={TOPIC_LABELS[ticket.topic] ?? ticket.topic}
      description={`From ${ticket.name ? `${ticket.name} <${ticket.email}>` : ticket.email} · ${fmtDate(ticket.created_at)}`}
      onClose={onClose}
    >
      <div className="mb-4 flex items-center gap-2">
        <Badge tone={ticket.status === "open" ? "amber" : "green"}>
          {ticket.status === "open" ? "Open" : "Resolved"}
        </Badge>
        {ticket.status === "resolved" && ticket.resolved_by_email && (
          <span className="text-xs text-gray-500">
            Resolved by {ticket.resolved_by_email}
            {ticket.resolved_at ? ` · ${fmtDate(ticket.resolved_at)}` : ""}
          </span>
        )}
      </div>

      <div className="whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-800">
        {ticket.message}
      </div>

      <ErrorAlert message={modalError} />

      <div className="mt-5">
        <label htmlFor="ticket-note" className={labelClassName()}>
          Internal note
        </label>
        <textarea
          id="ticket-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="What was done to solve this? (Only staff see this.)"
          className={inputClassName()}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={replyHref}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.1)] transition-colors hover:bg-indigo-700"
        >
          Reply by email
        </a>
        <Button
          type="button"
          variant="secondary"
          disabled={saving || note === (ticket.admin_note ?? "")}
          onClick={() => patch({ admin_note: note })}
        >
          Save note
        </Button>
        {ticket.status === "open" ? (
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => patch({ status: "resolved", admin_note: note })}
          >
            Mark resolved
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => patch({ status: "open" })}
          >
            Reopen
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose} className="ml-auto">
          Close
        </Button>
      </div>
    </Modal>
  );
}
