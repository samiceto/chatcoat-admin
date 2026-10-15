"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
  permissions: string[] | null;
  effective_permissions: string[];
};

type PermissionItem = { key: string; label: string; description: string };
type PermissionGroup = { key: string; label: string; permissions: PermissionItem[] };
type PermissionsCatalog = {
  groups: PermissionGroup[];
  role_presets: Record<string, string[]>;
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
  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("support");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [customized, setCustomized] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Edit-permissions dialog state
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editChecked, setEditChecked] = useState<Set<string>>(new Set());
  const [editRole, setEditRole] = useState<string>("support");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<StaffMember[]>("/api/admin/staff", { forceFresh: true }),
      apiFetch<PermissionsCatalog>("/api/admin/permissions").catch(() => null),
    ])
      .then(([staffData, catalogData]) => {
        setStaff(staffData || []);
        setCatalog(catalogData);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load staff. This page requires the staff.view permission."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openInvite = () => {
    setEmail("");
    setRole("support");
    const preset = new Set(catalog?.role_presets["support"] || []);
    setChecked(preset);
    setCustomized(false);
    setDialogOpen(true);
  };

  const pickRole = (r: (typeof ROLES)[number]) => {
    setRole(r);
    setChecked(new Set(catalog?.role_presets[r] || []));
    setCustomized(false);
  };

  const togglePermission = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setCustomized(true);
  };

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
        body: JSON.stringify({
          email: clean,
          role,
          // Send null when untouched so the backend uses role defaults.
          permissions: customized ? Array.from(checked) : null,
        }),
      });
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setInviting(false);
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setEditRole(member.role);
    setEditChecked(new Set(member.effective_permissions));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/staff/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
          permissions: Array.from(editChecked),
        }),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the member.");
    } finally {
      setSaving(false);
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

  const permissionLabel = (key: string): string => {
    for (const g of catalog?.groups || [])
      for (const p of g.permissions) if (p.key === key) return p.label;
    return key;
  };

  const renderChecklist = (
    checkedSet: Set<string>,
    onToggle: (key: string) => void
  ) => (
    <div className="space-y-3">
      {(catalog?.groups || []).map((group) => (
        <div key={group.key} className="rounded-xl border border-gray-200">
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
            {group.label}
          </div>
          <div className="divide-y divide-gray-100">
            {group.permissions.map((perm) => {
              const on = checkedSet.has(perm.key);
              return (
                <label
                  key={perm.key}
                  className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-indigo-50/50"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      on
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(perm.key)}
                    className="sr-only"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-gray-900">
                      {perm.label}
                    </span>
                    <span className="block text-[12px] text-gray-500">
                      {perm.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Staff can access this admin console. Invited people bind their account automatically on first sign-in."
        actions={
          <Button variant="primary" onClick={openInvite}>
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
              <Button variant="primary" onClick={openInvite}>
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
              <Th>Permissions</Th>
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
                      <div className="font-semibold text-gray-900">{member.email}</div>
                      <div className="text-[11px] text-gray-400">
                        {member.has_signed_in ? "Signed in at least once" : "Invite pending"}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge tone={ROLE_TONE[member.role] || "gray"}>
                    {member.role.replace("_", " ")}
                  </Badge>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => openEdit(member)}
                    className="text-left"
                    title="Edit permissions"
                  >
                    <span className="text-[13px] font-medium text-indigo-600 hover:underline">
                      {member.effective_permissions.length} permissions
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {member.permissions ? "Custom" : "Role defaults"}
                    </span>
                  </button>
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

      {/* Invite dialog with IAM-style checklist */}
      {dialogOpen && (
        <Modal
          title="Invite staff member"
          description="Pick a role preset, then fine-tune exactly what they can do."
          onClose={() => {
            setDialogOpen(false);
            setError(null);
          }}
        >
          <div className="space-y-4">
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
              <label className={labelClassName()}>Role preset</label>
              <select
                value={role}
                onChange={(e) => pickRole(e.target.value as (typeof ROLES)[number])}
                className={inputClassName()}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")} — {ROLE_DESCRIPTIONS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={labelClassName()}>Permissions</label>
                {customized ? (
                  <Badge tone="amber">Customized</Badge>
                ) : (
                  <Badge tone="blue">Role defaults</Badge>
                )}
              </div>
              {renderChecklist(checked, togglePermission)}
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

      {/* Edit permissions dialog */}
      {editing && (
        <Modal
          title={`Permissions — ${editing.email}`}
          description="Changes take effect immediately."
          onClose={() => setEditing(null)}
        >
          <div className="space-y-4">
            <div>
              <label className={labelClassName()}>Role</label>
              <select
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value);
                  setEditChecked(new Set(catalog?.role_presets[e.target.value] || []));
                }}
                className={inputClassName()}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            {renderChecklist(editChecked, (key) =>
              setEditChecked((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save permissions
            </Button>
          </div>
        </Modal>
      )}

      <Card className="mt-4">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
          <ShieldCheck size={14} className="text-indigo-600" />
          How permissions work
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
          Each role is a preset. When you invite someone you can keep the preset or
          tick individual permissions, like AWS IAM. Customized members show as
          "Custom" — changing their role later won't overwrite their checklist
          until you pick a new preset. You can never grant a permission you don't
          have yourself.
        </p>
      </Card>
    </div>
  );
}
