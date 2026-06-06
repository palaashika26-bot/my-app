'use client';
import React, { useState, useEffect } from 'react';
import { suppliersApi, type ApiSupplier } from '@/lib/api/suppliers.api';
import { Star, X, Search } from 'lucide-react';

interface LocalSupplier {
  id: string;
  name: string;
  city: string;
  province: string;
  contactPerson: string;
  phone: string;
  email: string;
  categories: string[];
  rating: number;
  status: 'Active' | 'Inactive';
  joined: string;
  productsCount: number;
}

function apiToSupplier(s: ApiSupplier): LocalSupplier {
  return {
    id: s.id,
    name: s.companyName,
    city: s.city ?? '',
    province: s.province ?? '',
    contactPerson: s.contactPerson ?? '—',
    phone: s.phone ?? '—',
    email: s.email ?? '',
    categories: [],
    rating: s.rating ?? 0,
    status: s.isVerified ? 'Active' : 'Inactive',
    joined: new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    productsCount: s._count?.products ?? 0,
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function SourcingSuppliersPage() {
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [viewing, setViewing] = useState<LocalSupplier | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    suppliersApi.getSuppliers({ limit: 100 })
      .then(r => {
        const apiData = r.data?.data ?? [];
        setSuppliers(apiData.map(apiToSupplier));
      })
      .catch(() => {});
  }, []);

  const filtered = suppliers.filter(s =>
    !q || [s.name, s.city, s.contactPerson, ...s.categories].join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-700">Supplier Management</h1>
          <p className="text-sm text-muted-foreground mt-1">China-based suppliers • {suppliers.length} total</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, city, category..." className="input-field !pl-10 max-w-md" />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-[11px] uppercase text-muted-foreground">
                <th className="px-3 py-3 text-left font-600">Supplier</th>
                <th className="px-3 py-3 text-left font-600">Location</th>
                <th className="px-3 py-3 text-left font-600">Contact</th>
                <th className="px-3 py-3 text-left font-600">Categories</th>
                <th className="px-3 py-3 text-left font-600">Rating</th>
                <th className="px-3 py-3 text-right font-600">Products</th>
                <th className="px-3 py-3 text-left font-600">Status</th>
                <th className="px-3 py-3 text-right font-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No suppliers found.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-3 py-3"><p className="font-600">{s.name}</p><p className="text-[11px] text-muted-foreground font-tabular">{s.id}</p></td>
                  <td className="px-3 py-3 text-xs">{s.city}, {s.province}</td>
                  <td className="px-3 py-3"><p className="text-sm">{s.contactPerson}</p><p className="text-[11px] text-muted-foreground font-tabular">{s.phone}</p></td>
                  <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{s.categories.slice(0, 2).map(c => (<span key={c} className="badge bg-muted text-muted-foreground text-[10px]">{c}</span>))}{s.categories.length > 2 && (<span className="badge bg-muted text-muted-foreground text-[10px]">+{s.categories.length - 2}</span>)}</div></td>
                  <td className="px-3 py-3"><Stars rating={s.rating} /></td>
                  <td className="px-3 py-3 text-right font-tabular font-600">{s.productsCount}</td>
                  <td className="px-3 py-3"><span className={`badge ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{s.status}</span></td>
                  <td className="px-3 py-3 text-right"><button onClick={() => setViewing(s)} className="text-[11px] font-600 text-[#4A3B52] hover:underline">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto pt-4 md:pt-8" onClick={() => setViewing(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-lg p-5 mb-4 mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-700">{viewing.name}</h3>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-[10px] uppercase text-muted-foreground">Location</p><p className="font-500">{viewing.city}, {viewing.province}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Contact</p><p className="font-500">{viewing.contactPerson}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-tabular font-500">{viewing.phone}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500 truncate">{viewing.email}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Rating</p><Stars rating={viewing.rating} /></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Products</p><p className="font-tabular font-700">{viewing.productsCount}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
