'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { deleteStaff, getStaffRegistry, newStaffId, upsertStaff, type StaffMember } from '@/lib/staffStore';
import { STAFF_ROLE_LABELS, STAFF_ROLE_OPTIONS, type StaffRoleId } from '@/lib/staffRoles';
import { useToast } from '@/components/ui/Toast';
import { Plus, Pencil, Trash2, Shield, KeyRound, Phone, Mail, User } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: 'sourcing-logistics' as StaffRoleId,
  password: '',
};

export default function AdminStaffPage() {
  const perms = useAdminPermissions();
  const { addToast } = useToast();
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function reload() {
    setRows(getStaffRegistry());
  }

  useEffect(() => {
    reload();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModal('add');
  }

  function openEdit(s: StaffMember) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      password: '',
    });
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
    setForm(emptyForm);
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      addToast({ type: 'error', title: 'Missing fields', description: 'Name and email are required.' });
      return;
    }
    if (modal === 'add' && !form.password.trim()) {
      addToast({ type: 'error', title: 'Password required', description: 'Set an initial password for new staff.' });
      return;
    }
    const list = getStaffRegistry();
    const emailLc = form.email.trim().toLowerCase();
    if (list.some((s) => s.email.toLowerCase() === emailLc && s.id !== editingId)) {
      addToast({ type: 'error', title: 'Duplicate email', description: 'Another staff member already uses this email.' });
      return;
    }

    if (modal === 'add') {
      const member: StaffMember = {
        id: newStaffId(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        lastLogin: null,
        createdAt: new Date().toISOString(),
      };
      upsertStaff(member);
      addToast({ type: 'success', title: 'Staff added', description: `${member.name} can sign in under “Staff” on the login page.` });
    } else if (editingId) {
      const prev = list.find((s) => s.id === editingId);
      if (!prev) return;
      const updated: StaffMember = {
        ...prev,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password.trim() ? form.password : prev.password,
      };
      upsertStaff(updated);
      addToast({ type: 'success', title: 'Staff updated', description: `${updated.name} saved.` });
    }
    reload();
    closeModal();
  }

  function remove(id: string) {
    if (!confirm('Remove this staff member? They will no longer be able to sign in.')) return;
    deleteStaff(id);
    reload();
    addToast({ type: 'success', title: 'Staff removed' });
  }

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

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-700">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add team members with their own sign-in. Role controls orders, quotations, revenue, and supplier cost visibility.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Add staff
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-950">
        <p className="font-600 flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4" /> Demo storage
        </p>
        <p className="text-amber-900/90">
          Staff records are stored in this browser (localStorage). Production should use a secure backend with hashed passwords and
          server-side permission checks.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-[11px] uppercase text-muted-foreground">
                <th className="px-3 py-3 text-left font-600">Name</th>
                <th className="px-3 py-3 text-left font-600">Email</th>
                <th className="px-3 py-3 text-left font-600">Role</th>
                <th className="px-3 py-3 text-left font-600">Phone</th>
                <th className="px-3 py-3 text-left font-600">Last login</th>
                <th className="px-3 py-3 text-right font-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-3 py-3">
                    <p className="font-600">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground font-tabular">{s.id}</p>
                  </td>
                  <td className="px-3 py-3 font-tabular text-xs">{s.email}</td>
                  <td className="px-3 py-3">
                    <span className="badge bg-muted text-foreground text-[10px]">{STAFF_ROLE_LABELS[s.role]}</span>
                  </td>
                  <td className="px-3 py-3 font-tabular text-xs">{s.phone || '—'}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{s.lastLogin ?? 'Never'}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
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
                        onClick={() => remove(s.id)}
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
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto pt-4 md:pt-8 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-card rounded-xl border border-border shadow-card-lg w-full max-w-md mb-4 mx-4">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-700">{modal === 'add' ? 'Add staff member' : 'Edit staff member'}</h2>
              <button type="button" onClick={closeModal} className="text-sm text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
            <form onSubmit={submitForm} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <User className="w-3 h-3" /> Name
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <Mail className="w-3 h-3" /> Email (login)
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> Phone
                </label>
                <input
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground mb-1 block">Role</label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRoleId }))}
                >
                  {STAFF_ROLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">{STAFF_ROLE_OPTIONS.find((o) => o.id === form.role)?.hint}</p>
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground flex items-center gap-1 mb-1">
                  <KeyRound className="w-3 h-3" /> {modal === 'add' ? 'Initial password' : 'New password (leave blank to keep)'}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                  placeholder={modal === 'edit' ? '••••••••' : ''}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 text-sm">
                  {modal === 'add' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
