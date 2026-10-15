"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminError } from "../layout";

type StaffMember = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  clerk_user_id: string | null;
  has_signed_in: boolean;
  created_at: string | null;
};

const ROLES = ["super_admin", "billing", "support", "readonly"] as const;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Everything, including staff management.",
  billing: "Plans, pricing, org plans, overrides, suspensions.",
  support: "View orgs, users, usage. No plan or billing changes.",
  readonly: "View only.",
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("support");
  const [inviting, setInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<StaffMember[]>("/api/admin/staff", { forceFresh: true })
      .then((data) => {
        setStaff(data || []);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load staff. This page requires super_admin."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Enter a valid e-mail address.");
      return;
    }
    setInviting(true);
    setError(null);
    try {
      await apiFetch("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify({ email: clean, role }),
      });
      setEmail("");
      setRole("support");
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (member: StaffMember, newRole: string) => {
    try {
      await apiFetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the role.");
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      await apiFetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the member.");
    }
  };

  const remove = async (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.email} from staff?`)) return;
    try {
      await apiFetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the member.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Staff can access this admin dashboard. Invited people bind their
          account automatically on first sign-in.
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Plus size={14} />
          <span>Invite staff</span>
        </button>
      </div>

      <AdminError message={error} />

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
          <span>Loading staff...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-card dark:border dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--divider)] text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  className={`border-b border-[var(--divider)] last:border-0 ${
                    member.is_active ? "" : "opacity-55"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{member.email}</div>
                    <div className="text-[10px] text-muted">
                      {member.has_signed_in ? "Signed in at least once" : "Invite pending"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) => changeRole(member, e.target.value)}
                      className="rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-2 py-1 text-xs font-semibold text-ink"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        member.is_active
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-800 text-muted"
                      }`}
                    >
                      {member.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => remove(member)}
                      title="Remove staff member"
                      className="p-2 rounded-lg bg-[var(--inset)] text-muted hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                    No staff members yet. Invite yourself first to get in.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--inset)] p-4 text-xs text-muted space-y-1">
        {ROLES.map((r) => (
          <div key={r}>
            <span className="font-bold text-ink">{r.replace("_", " ")}</span>
            {" — "}
            {ROLE_DESCRIPTIONS[r]}
          </div>
        ))}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-bold text-ink">Invite staff member</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-muted">
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Role
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                  className="mt-1 w-full rounded-lg border border-[var(--control-border)] bg-[var(--inset)] px-3 py-2 text-sm text-ink"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")} — {ROLE_DESCRIPTIONS[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setError(null);
                }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={invite}
                disabled={inviting}
                className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {inviting && <Loader2 size={13} className="animate-spin" />}
                <span>Send invite</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
