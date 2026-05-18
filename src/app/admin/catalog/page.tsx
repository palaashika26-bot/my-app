'use client';
import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';

interface Product {
  id: string;
  emoji: string;
  name: string;
  category: string;
  priceCny: string;
  moq: number;
  bg: string;
  active: boolean;
}

const initialProducts: Product[] = [
  { id: 'p01', emoji: '🔌', name: 'LED Strip Lights RGB 5m',  category: 'Lighting',           priceCny: '¥35–55', moq: 50,  bg: 'bg-orange-100', active: true },
  { id: 'p02', emoji: '📱', name: 'Silicone Phone Cases',     category: 'Mobile Accessories', priceCny: '¥8–15',  moq: 200, bg: 'bg-blue-100',   active: true },
  { id: 'p03', emoji: '🍶', name: 'Stainless Steel Bottles',  category: 'Kitchenware',        priceCny: '¥18–28', moq: 100, bg: 'bg-cyan-100',   active: true },
  { id: 'p04', emoji: '🎧', name: 'Bluetooth Earbuds TWS',   category: 'Electronics',        priceCny: '¥45–80', moq: 50,  bg: 'bg-purple-100', active: true },
  { id: 'p05', emoji: '🔋', name: 'Power Banks 10000mAh',    category: 'Electronics',        priceCny: '¥65–95', moq: 30,  bg: 'bg-emerald-100',active: true },
  { id: 'p06', emoji: '🖱️', name: 'Wireless Mouse',         category: 'Office',             priceCny: '¥22–35', moq: 50,  bg: 'bg-slate-100',  active: true },
  { id: 'p07', emoji: '💪', name: 'Resistance Bands Set',    category: 'Sports',             priceCny: '¥15–25', moq: 100, bg: 'bg-rose-100',   active: true },
  { id: 'p08', emoji: '🧴', name: 'Soap Dispenser Pump',     category: 'Kitchenware',        priceCny: '¥12–20', moq: 100, bg: 'bg-teal-100',   active: true },
  { id: 'p09', emoji: '🔌', name: 'USB-C Cables (Braided)',  category: 'Electronics',        priceCny: '¥6–12',  moq: 200, bg: 'bg-indigo-100', active: true },
  { id: 'p10', emoji: '📦', name: 'Bubble Wrap Roll',        category: 'Packaging',          priceCny: '¥8–15',  moq: 50,  bg: 'bg-yellow-100', active: true },
  { id: 'p11', emoji: '🎒', name: 'Canvas Tote Bags',        category: 'Fashion',            priceCny: '¥10–18', moq: 100, bg: 'bg-pink-100',   active: true },
  { id: 'p12', emoji: '🏮', name: 'Smart Plug WiFi 16A',     category: 'Electronics',        priceCny: '¥18–28', moq: 50,  bg: 'bg-amber-100',  active: true },
];

const BG_OPTIONS = [
  'bg-orange-100','bg-blue-100','bg-cyan-100','bg-purple-100','bg-emerald-100',
  'bg-slate-100','bg-rose-100','bg-teal-100','bg-indigo-100','bg-yellow-100',
  'bg-pink-100','bg-amber-100','bg-green-100','bg-red-100','bg-sky-100',
];

const CATEGORIES = ['Electronics','Mobile Accessories','Kitchenware','Lighting','Office','Fashion','Sports','Packaging'];

function emptyForm(): Omit<Product, 'id'> {
  return { emoji: '📦', name: '', category: 'Electronics', priceCny: '', moq: 50, bg: 'bg-blue-100', active: true };
}

export default function AdminCatalogPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [q, setQ] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
  );

  function openAdd() { setForm(emptyForm()); setEditingId(null); setModalMode('add'); }
  function openEdit(p: Product) { setForm({ emoji: p.emoji, name: p.name, category: p.category, priceCny: p.priceCny, moq: p.moq, bg: p.bg, active: p.active }); setEditingId(p.id); setModalMode('edit'); }
  function closeModal() { setModalMode(null); setEditingId(null); }

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.priceCny.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    if (modalMode === 'add') {
      const newId = `p${String(Date.now()).slice(-6)}`;
      setProducts(prev => [...prev, { ...form, id: newId }]);
      addToast({ type: 'success', title: 'Product added', description: `"${form.name}" has been added to the catalog.` });
    } else if (modalMode === 'edit' && editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? { ...form, id: editingId } : p));
      addToast({ type: 'success', title: 'Product updated', description: `"${form.name}" has been updated.` });
    }
    setSaving(false);
    closeModal();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
    addToast({ type: 'success', title: 'Product deleted', description: `"${deleteTarget.name}" has been removed from the catalog.` });
    setSaving(false);
    setDeleteTarget(null);
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage products visible to clients in the catalog</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} className="input-field pl-9" placeholder="Search products..." />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Product</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden md:table-cell">Price (CNY)</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden md:table-cell">MOQ</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Status</th>
              <th className="text-right px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center text-xl flex-shrink-0`}>{p.emoji}</div>
                    <span className="font-500 text-sm">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.category}</td>
                <td className="px-4 py-3 font-tabular hidden md:table-cell">{p.priceCny}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.moq}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs font-600 ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 fade-in" onClick={closeModal}>
          <div className="bg-card rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-700 text-lg">{modalMode === 'add' ? 'Add Product' : 'Edit Product'}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-600 text-muted-foreground uppercase">Product Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field mt-1" placeholder="e.g. Wireless Earbuds" />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Emoji</label>
                <input value={form.emoji} onChange={e => set('emoji', e.target.value)} className="input-field mt-1 text-2xl" maxLength={4} />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field mt-1">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Price (CNY)</label>
                <input value={form.priceCny} onChange={e => set('priceCny', e.target.value)} className="input-field mt-1" placeholder="¥10–20" />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">MOQ (units)</label>
                <input value={form.moq} onChange={e => set('moq', Number(e.target.value))} type="number" min={1} className="input-field mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-600 text-muted-foreground uppercase">Card Colour</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {BG_OPTIONS.map(bg => (
                    <button key={bg} onClick={() => set('bg', bg)} className={`w-7 h-7 rounded-lg ${bg} border-2 transition-all ${form.bg === bg ? 'border-accent scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2 mt-1">
                <input id="active-toggle" type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-accent" />
                <label htmlFor="active-toggle" className="text-sm font-500">Visible to clients</label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={closeModal} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.priceCny.trim()} className="btn-primary flex-1 py-2 text-sm">
                {saving ? 'Saving...' : modalMode === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-700 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              &ldquo;{deleteTarget.name}&rdquo; will be permanently removed from the catalog.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-600 transition-colors">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
