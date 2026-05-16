'use client';
import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { mockSuppliers, type Supplier } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { Plus, Edit3, Trash2, Star, X, Search } from 'lucide-react';

function Stars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-0.5">{Array.from({length:5}).map((_,i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />)}<span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span></span>;
}

export default function AdminSuppliersPage() {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', city: '', province: '', contactPerson: '', phone: '', email: '', categories: '' });

  const filtered = suppliers.filter(s => !q || [s.name, s.city, s.contactPerson, ...s.categories].join(' ').toLowerCase().includes(q.toLowerCase()));

  function addSupplier() {
    if (!form.name) return;
    const id = `sup-${String(Date.now()).slice(-4)}`;
    setSuppliers(p => [{ id, name: form.name, city: form.city, province: form.province, contactPerson: form.contactPerson, phone: form.phone, email: form.email, categories: form.categories.split(',').map(s=>s.trim()).filter(Boolean), rating: 0, status: 'Active', joined: new Date().toLocaleDateString('en-IN'), productsCount: 0 }, ...p]);
    setShowAdd(false); setForm({ name: '', city: '', province: '', contactPerson: '', phone: '', email: '', categories: '' });
    addToast({ type: 'success', title: 'Supplier added' });
  }
  function remove(id: string) { setSuppliers(p => p.filter(s => s.id !== id)); addToast({ type: 'success', title: 'Supplier removed' }); }
  function toggle(id: string) { setSuppliers(p => p.map(s => s.id === id ? {...s, status: s.status === 'Active' ? 'Inactive' : 'Active'} : s)); }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-700">Supplier Management</h1><p className="text-sm text-muted-foreground mt-1">China-based suppliers • {suppliers.length} total</p></div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Supplier</button>
      </div>
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, city, category..." className="input-field pl-9 max-w-md" /></div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground">
            <th className="px-3 py-3 text-left font-600">Supplier</th><th className="px-3 py-3 text-left font-600">Location</th><th className="px-3 py-3 text-left font-600">Contact</th><th className="px-3 py-3 text-left font-600">Categories</th><th className="px-3 py-3 text-left font-600">Rating</th><th className="px-3 py-3 text-right font-600">Products</th><th className="px-3 py-3 text-left font-600">Status</th><th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(s => (
              <tr key={s.id} className="table-row-hover">
                <td className="px-3 py-3"><p className="font-600">{s.name}</p><p className="text-[11px] text-muted-foreground font-tabular">{s.id}</p></td>
                <td className="px-3 py-3 text-xs">{s.city}, {s.province}</td>
                <td className="px-3 py-3"><p className="text-sm">{s.contactPerson}</p><p className="text-[11px] text-muted-foreground font-tabular">{s.phone}</p></td>
                <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{s.categories.slice(0,2).map(c => <span key={c} className="badge bg-muted text-muted-foreground text-[10px]">{c}</span>)}{s.categories.length > 2 && <span className="badge bg-muted text-muted-foreground text-[10px]">+{s.categories.length-2}</span>}</div></td>
                <td className="px-3 py-3"><Stars rating={s.rating} /></td>
                <td className="px-3 py-3 text-right font-tabular font-600">{s.productsCount}</td>
                <td className="px-3 py-3"><button onClick={() => toggle(s.id)} className={`badge ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{s.status}</button></td>
                <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => setViewing(s)} className="text-[11px] font-600 text-accent hover:underline">View</button><button onClick={() => remove(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-md p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-700">Add Supplier</h3><button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button></div>
          <div className="space-y-2">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Company name *" />
            <div className="grid grid-cols-2 gap-2"><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" placeholder="City" /><input value={form.province} onChange={e => setForm({...form, province: e.target.value})} className="input-field" placeholder="Province" /></div>
            <input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} className="input-field" placeholder="Contact person" />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" placeholder="Phone" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="Email" />
            <input value={form.categories} onChange={e => setForm({...form, categories: e.target.value})} className="input-field" placeholder="Categories (comma-separated)" />
          </div>
          <div className="flex gap-2 mt-4"><button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={addSupplier} className="btn-primary flex-1 py-2 text-sm">Add</button></div>
        </div></div>
      )}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewing(null)}><div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-lg p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-700">{viewing.name}</h3><button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-[10px] uppercase text-muted-foreground">Location</p><p className="font-500">{viewing.city}, {viewing.province}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Contact</p><p className="font-500">{viewing.contactPerson}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-tabular font-500">{viewing.phone}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500 truncate">{viewing.email}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Rating</p><Stars rating={viewing.rating} /></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Products</p><p className="font-tabular font-700">{viewing.productsCount}</p></div>
          </div>
          <div><p className="text-[10px] uppercase text-muted-foreground mb-2">Product Catalog</p>
            <div className="grid grid-cols-2 gap-2">{Array.from({length:4}).map((_,i) => <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40"><div className="w-9 h-9 rounded-md bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center">📦</div><div className="text-xs"><p className="font-500">Sample Product {i+1}</p><p className="text-muted-foreground">¥10–20 • MOQ 100</p></div></div>)}</div>
          </div>
        </div></div>
      )}
    </AdminLayout>
  );
}
