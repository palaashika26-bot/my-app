'use client';
import React, { useState, useMemo } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { Search, X } from 'lucide-react';

interface Product {
  id: string;
  emoji: string;
  name: string;
  category: string;
  priceCny: string;
  moq: number;
  bg: string;
}

const products: Product[] = [
  { id: 'p01', emoji: '🔌', name: 'LED Strip Lights RGB 5m',  category: 'Lighting',           priceCny: '¥35–55', moq: 50,  bg: 'bg-orange-100' },
  { id: 'p02', emoji: '📱', name: 'Silicone Phone Cases',     category: 'Mobile Accessories', priceCny: '¥8–15',  moq: 200, bg: 'bg-blue-100' },
  { id: 'p03', emoji: '🍶', name: 'Stainless Steel Bottles',  category: 'Kitchenware',        priceCny: '¥18–28', moq: 100, bg: 'bg-cyan-100' },
  { id: 'p04', emoji: '🎧', name: 'Bluetooth Earbuds TWS',   category: 'Electronics',        priceCny: '¥45–80', moq: 50,  bg: 'bg-purple-100' },
  { id: 'p05', emoji: '🔋', name: 'Power Banks 10000mAh',    category: 'Electronics',        priceCny: '¥65–95', moq: 30,  bg: 'bg-emerald-100' },
  { id: 'p06', emoji: '🖱️', name: 'Wireless Mouse',         category: 'Office',             priceCny: '¥22–35', moq: 50,  bg: 'bg-slate-100' },
  { id: 'p07', emoji: '💪', name: 'Resistance Bands Set',    category: 'Sports',             priceCny: '¥15–25', moq: 100, bg: 'bg-rose-100' },
  { id: 'p08', emoji: '🧴', name: 'Soap Dispenser Pump',     category: 'Kitchenware',        priceCny: '¥12–20', moq: 100, bg: 'bg-teal-100' },
  { id: 'p09', emoji: '🔌', name: 'USB-C Cables (Braided)',  category: 'Electronics',        priceCny: '¥6–12',  moq: 200, bg: 'bg-indigo-100' },
  { id: 'p10', emoji: '📦', name: 'Bubble Wrap Roll',        category: 'Packaging',          priceCny: '¥8–15',  moq: 50,  bg: 'bg-yellow-100' },
  { id: 'p11', emoji: '🎒', name: 'Canvas Tote Bags',        category: 'Fashion',            priceCny: '¥10–18', moq: 100, bg: 'bg-pink-100' },
  { id: 'p12', emoji: '🏮', name: 'Smart Plug WiFi 16A',     category: 'Electronics',        priceCny: '¥18–28', moq: 50,  bg: 'bg-amber-100' },
];

const categories = ['All', 'Electronics', 'Mobile Accessories', 'Kitchenware', 'Lighting', 'Office', 'Fashion', 'Sports', 'Packaging'];

export default function CatalogPage() {
  const { addToast } = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [active, setActive] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => products.filter(p =>
    (cat === 'All' || p.category === cat) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat]);

  function openModal(p: Product) { setActive(p); setQty(String(p.moq)); setNotes(''); }
  function closeModal() { setActive(null); }

  async function submitRequest() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const id = `BK-REQ-2026-${String(Math.floor(1000 + Math.random()*9000))}`;
    addToast({ type: 'success', title: 'Quote request submitted', description: `${id} created for ${active?.name}. Our team will contact you within 24 hours.` });
    setSubmitting(false);
    closeModal();
  }

  return (
    <ClientShell>
      <div className="mb-5">
        <h1 className="text-2xl font-700">Product Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse popular products sourced from verified Chinese manufacturers</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} className="input-field pl-9" placeholder="Search products, categories..." />
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${cat === c ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden card-hover">
            <div className={`aspect-square ${p.bg} flex items-center justify-center text-6xl`}>{p.emoji}</div>
            <div className="p-3">
              <p className="font-600 text-sm leading-tight">{p.name}</p>
              <span className="inline-block mt-1 badge bg-muted text-muted-foreground text-[10px]">{p.category}</span>
              <p className="font-tabular font-700 text-foreground mt-2">{p.priceCny} <span className="text-[11px] text-muted-foreground font-500">/ unit</span></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">MOQ: {p.moq} units</p>
              <button onClick={() => openModal(p)} className="btn-primary w-full py-2 mt-3 text-xs">Request Quote</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">No products match your search.</div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 fade-in" onClick={closeModal}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-700">Request Quote</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 mb-3">
              <div className={`w-14 h-14 rounded-lg ${active.bg} flex items-center justify-center text-3xl`}>{active.emoji}</div>
              <div className="min-w-0"><p className="font-600 text-sm truncate">{active.name}</p><p className="text-xs text-muted-foreground">{active.priceCny} / unit • MOQ {active.moq}</p></div>
            </div>
            <div className="space-y-2">
              <div><label className="text-xs font-600 text-muted-foreground uppercase">Quantity</label><input value={qty} onChange={e => setQty(e.target.value)} type="number" min={active.moq} className="input-field mt-1" /></div>
              <div><label className="text-xs font-600 text-muted-foreground uppercase">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-field mt-1" placeholder="Colour, branding, packaging notes..." /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={submitRequest} disabled={submitting} className="btn-primary flex-1 py-2 text-sm">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
