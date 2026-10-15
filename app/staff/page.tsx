"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
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

const ROLE_TONE: Record<string, "purple" | "blue" | "amber" | "gray"> = {
  super_admin: "purple",
  billing: "blue",
  support: "amber",
  readonly: "gray",
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
    <div>
      <PageHeader
        title="Staff"
        description="Staff can access this admin console. Invited people bind their account automatically on first sign-in."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus size={14} />
            Invite staff
          </Button>
        }
      />
      <ErrorAlert message={error} />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <LoadingRow label="Loading staff…" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title="No staff members yet"
            description="Invite yourself first to get in."
            action={
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus size={14} /> Invite staff
              </Button>
            }
          />
        </div>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Added</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <Tr key={member.id} className={!member.is_active ? "opacity-55" : ""}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[12px] font-bold text-indigo-700">
                      {(member.email?.[0] || "?").toUpperCase()}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {member.email}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {member.has_signed_in
                          ? "Signed in at least once"
                          : "Invite pending"}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <select
                    value={member.role}
                    onChange={(e) => changeRole(member, e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <button type="button" onClick={() => toggleActive(member)}>
                    {member.is_active ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="gray">Disabled</Badge>
                    )}
                  </button>
                </Td>
                <Td className="text-[13px] text-gray-500">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString()
                    : "—"}
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => remove(member)}
                    title="Remove staff member"
                    className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Card className="mt-4">
        <h3 className="text-[13px] font-semibold text-gray-900">Role permissions</h3>
        <dl className="mt-2 space-y-1.5 text-[13px]">
          {ROLES.map((r) => (
            <div key={r} className="flex items-start gap-2">
              <Badge tone={ROLE_TONE[r]} className="mt-0.5 shrink-0">
                {r.replace("_", " ")}
              </Badge>
              <span className="text-gray-500">{ROLE_DESCRIPTIONS[r]}</span>
            </div>
          ))}
        </dl>
      </Card>

      {dialogOpen && (
        <Modal
          title="Invite staff member"
          description="They'll get access on first sign-in with this email."
          onClose={() => {
            setDialogOpen(false);
            setError(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <label className={labelClassName()}>E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                type="email"
                className={inputClassName()}
              />
            </div>
            <div>
              <label className={labelClassName()}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className={inputClassName()}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")} — {ROLE_DESCRIPTIONS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={invite} disabled={inviting}>
              {inviting && <Loader2 size={14} className="animate-spin" />}
              Send invite
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
