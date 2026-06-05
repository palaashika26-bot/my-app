'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { adminApi, type StaffMemberApi } from '@/lib/api/admin.api';
import { STAFF_ROLE_LABELS, STAFF_ROLE_OPTIONS, type StaffRoleId } from '@/lib/staffRoles';
import { useToast } from '@/components/ui/Toast';
import {
  Plus, Pencil, Trash2, Mail, User, Phone,
  CheckCircle, XCircle, X, Eye, EyeOff, KeyRound,
} from 'lucide-react';

// ── empty form shapes ─────────────────────────────────────────────────────────

const emptyCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  staffRole: 'sourcing-logistics' as StaffRoleId,
};

const emptyEditForm = {
  firstName: '',
  lastName: '',
  phone: '',
  staffRole: 'sourcing-logistics' as StaffRoleId,
  password: '',   // leave blank = keep current password
};

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminStaffPage() {
  const perms = useAdminPermissions();
  const { addToast } = useToast();

  const [rows, setRows]         = useState<StaffMemberApi[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMemberApi | null>(null);

  // form state
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm,   setEditForm]   = useState(emptyEditForm);

  // password visibility
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showEditPw,   setShowEditPw]   = useState(false);

  // ── data ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listStaff();
      setRows(res.data.data ?? []);
    } catch {
      addToast({ type: 'error', title: 'Failed to load staff' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // ── create staff ──────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setShowCreatePw(false);
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.password.trim()) {
      addToast({ type: 'error', title: 'Password required' });
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createStaff({
        firstName:  createForm.firstName.trim(),
        lastName:   createForm.lastName.trim(),
        email:      createForm.email.trim(),
        password:   createForm.password.trim(),
        phone:      createForm.phone.trim() || undefined,
        staffRole:  createForm.staffRole,
      });
      addToast({
        type: 'success',
        title: 'Staff account created',
        description: `${createForm.firstName} ${createForm.lastName} can now log in.`,
      });
      setCreateOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      addToast({ type: 'error', title: 'Error', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ── edit staff ────────────────────────────────────────────────────────────

  function openEdit(s: StaffMemberApi) {
    setEditForm({
      firstName: s.firstName,
      lastName:  s.lastName,
      phone:     s.phone ?? '',
      staffRole: (s.staffRole as StaffRoleId) ?? 'sourcing-logistics',
      password:  '',
    });
    setShowEditPw(false);
    setEditTarget(s);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await adminApi.updateStaff(editTarget.id, {
        firstName: editForm.firstName.trim(),
        lastName:  editForm.lastName.trim(),
        phone:     editForm.phone.trim() || undefined,
        staffRole: editForm.staffRole,
        // only send password if admin typed something
        ...(editForm.password.trim() && { password: editForm.password.trim() }),
      });
      addToast({ type: 'success', title: 'Staff updated' });
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      addToast({ type: 'error', title: 'Error', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ── toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(s: StaffMemberApi) {
    try {
      await adminApi.updateStaff(s.id, { isActive: !s.isActive });
      addToast({
        type: 'success',
        title: s.isActive ? 'Staff deactivated' : 'Staff activated',
        description: `${s.firstName} ${s.lastName} is now ${s.isActive ? 'inactive' : 'active'}.`,
      });
      load();
    } catch {
      addToast({ type: 'error', title: 'Failed to update status' });
    }
  }

  // ── remove ────────────────────────────────────────────────────────────────

  async function remove(s: StaffMemberApi) {
    if (!confirm(`Remove ${s.firstName} ${s.lastName}? They will no longer be able to sign in.`)) return;
    try {
      await adminApi.deleteStaff(s.id);
      addToast({ type: 'success', title: 'Staff removed' });
      load();
    } catch {
      addToast({ type: 'error', title: 'Failed to remove staff' });
    }
  }

  // ── guard ─────────────────────────────────────────────────────────────────

  if (!perms.isFullAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-lg bg-card border border-border rounded-xl p-6 shadow-card">
          <h1 className="text-lg font-700 mb-2">Restricted</h1>
          <p className="text-sm text-muted-foreground">Only administrators can manage staff accounts.</p>
        </div>
      </AdminLayout>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-700">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create staff accounts with email and password. Staff log in directly on the login page.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No staff members yet. Click &quot;Add Staff&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-[11px] uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left font-600">Name</th>
                  <th className="px-4 py-3 text-left font-600">Email</th>
                  <th className="px-4 py-3 text-left font-600">Role</th>
                  <th className="px-4 py-3 text-left font-600">Status</th>
                  <th className="px-4 py-3 text-left font-600">Added</th>
                  <th className="px-4 py-3 text-right font-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-600">{s.firstName} {s.lastName}</p>
                      <p className="text-[11px] text-muted-foreground">{s.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-tabular">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-muted text-foreground text-[10px]">
                        {STAFF_ROLE_LABELS[s.staffRole as StaffRoleId] ?? s.staffRole ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <span className="badge bg-green-100 text-green-800 text-[10px]">Active</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 text-[10px]">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleActive(s)}
                          className={`p-1.5 rounded-md hover:bg-muted ${s.isActive ? 'text-orange-500' : 'text-green-600'}`}
                          title={s.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {s.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md hover:bg-muted text-foreground"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Staff Modal ───────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto pt-6 md:pt-12 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-card rounded-xl border border-border shadow-card-lg w-full max-w-md mb-6 mx-4">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-700">Add staff member</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitCreate} className="p-5 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> First Name
                  </label>
                  <input
                    className="input-field"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground mb-1 block">Last Name</label>
                  <input
                    className="input-field"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> Phone <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  className="input-field"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-600 text-muted-foreground mb-1 block">Role</label>
                <select
                  className="input-field"
                  value={createForm.staffRole}
                  onChange={(e) => setCreateForm((f) => ({ ...f, staffRole: e.target.value as StaffRoleId }))}
                >
                  {STAFF_ROLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {STAFF_ROLE_OPTIONS.find((o) => o.id === createForm.staffRole)?.hint}
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <KeyRound className="w-3 h-3" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showCreatePw ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Staff will use this password to log in. You can change it later from Edit.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ─────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto pt-6 md:pt-12 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-card rounded-xl border border-border shadow-card-lg w-full max-w-md mb-6 mx-4">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-700">Edit staff member</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editTarget.email}</p>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="p-5 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> First Name
                  </label>
                  <input
                    className="input-field"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground mb-1 block">Last Name</label>
                  <input
                    className="input-field"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> Phone
                </label>
                <input
                  className="input-field"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-600 text-muted-foreground mb-1 block">Role</label>
                <select
                  className="input-field"
                  value={editForm.staffRole}
                  onChange={(e) => setEditForm((f) => ({ ...f, staffRole: e.target.value as StaffRoleId }))}
                >
                  {STAFF_ROLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Password reset */}
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <KeyRound className="w-3 h-3" /> New Password
                  <span className="text-muted-foreground/60 font-400">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showEditPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
