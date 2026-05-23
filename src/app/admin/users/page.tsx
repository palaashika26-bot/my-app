'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { mockClients, type Client } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { Search, Plus, Eye, Edit3, X, Download } from 'lucide-react';

export default function AdminUsersPage() {
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', gstin: '' });

  const filtered = useMemo(() => clients.filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.name, c.email, c.company, c.gstin].join(' ').toLowerCase().includes(s);
  }), [clients, q, statusFilter]);

  function toggleStatus(id: string) {
    setClients(p => p.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c));
    addToast({ type: 'success', title: 'Status updated' });
  }

  function addClient() {
    if (!form.name || !form.email) return;
    const id = `cli-${String(Date.now()).slice(-4)}`;
    setClients(p => [{ id, name: form.name, email: form.email, company: form.company, phone: form.phone, gstin: form.gstin, totalOrders: 0, totalSpend: '₹0', joinedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'Active' }, ...p]);
    setShowAdd(false); setForm({ name: '', email: '', company: '', phone: '', gstin: '' });
    addToast({ type: 'success', title: 'Client added', description: `${form.name} has been onboarded.` });
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-700">Client Management</h1><p className="text-sm text-muted-foreground mt-1">View all registered clients</p></div>
        <div className="flex gap-2">
          <button onClick={() => addToast({ type: 'info', title: 'Exporting client list...' })} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Client</button>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, GSTIN, company..." className="input-field !pl-10" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field"><option>All</option><option>Active</option><option>Inactive</option></select>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground">
            <th className="px-3 py-3 text-left font-600">Client</th>
            <th className="px-3 py-3 text-left font-600">Company / GSTIN</th>
            <th className="px-3 py-3 text-left font-600">Phone</th>
            <th className="px-3 py-3 text-right font-600">Orders</th>
            <th className="px-3 py-3 text-right font-600">Total Spent</th>
            <th className="px-3 py-3 text-left font-600">Joined</th>
            <th className="px-3 py-3 text-left font-600">Status</th>
            <th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No clients found.</td></tr> : filtered.map(c => (
              <tr key={c.id} className="table-row-hover">
                <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-[#1A1423] text-white font-700 text-xs flex items-center justify-center">{c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div><div><p className="font-500">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.email}</p></div></div></td>
                <td className="px-3 py-3"><p className="text-sm">{c.company}</p><p className="text-[11px] text-muted-foreground font-tabular">{c.gstin}</p></td>
                <td className="px-3 py-3 text-xs font-tabular">{c.phone}</td>
                <td className="px-3 py-3 text-right font-tabular font-600">{c.totalOrders}</td>
                <td className="px-3 py-3 text-right font-tabular font-600">{c.totalSpend}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{c.joinedDate}</td>
                <td className="px-3 py-3"><button onClick={() => toggleStatus(c.id)} className={`badge ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{c.status}</button></td>
                <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1"><Link href={`/admin/users/${c.id}`} className="p-1.5 rounded-md hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5" /></Link><button onClick={() => addToast({ type: 'info', title: 'Impersonating', description: `Logged in as ${c.name}` })} className="text-[11px] font-600 text-[#4A3B52] hover:underline">Impersonate</button></div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-md p-5 mb-4 mx-4">
            <div className="flex items-center justify-between mb-3"><h3 className="font-700">Add New Client</h3><button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button></div>
            <div className="space-y-2">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Full name *" />
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="Email *" />
              <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="input-field" placeholder="Company" />
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" placeholder="Phone" />
              <input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} className="input-field" placeholder="GSTIN" />
            </div>
            <div className="flex gap-2 mt-4"><button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={addClient} className="btn-primary flex-1 py-2 text-sm">Add Client</button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
