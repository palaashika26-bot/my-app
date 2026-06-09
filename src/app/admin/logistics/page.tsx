'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { logisticsApi, type LogisticsListItem } from '@/lib/api/logistics.api';
import { RefreshCw, Package, Search, Loader2 } from 'lucide-react';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  QUOTED: 'bg-[#e4eeee] text-[#6b8f90] border border-[#bcd9d9]',
  CONFIRMED: 'bg-green-100 text-green-700 border border-green-300',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 border border-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
};
const statusLabel: Record<string, string> = { PENDING: 'Pending', QUOTED: 'Quoted', CONFIRMED: 'Confirmed', IN_TRANSIT: 'In Transit', COMPLETED: 'Completed' };
const TABS = ['All', 'PENDING', 'QUOTED', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED'];

export default function AdminLogisticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LogisticsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await logisticsApi.list(); if (res.data.success) setRows(res.data.data ?? []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => {
    if (tab !== 'All' && r.status !== tab) return false;
    if (!q) return true;
    return [r.requestNumber, r.clientName, r.companyName, r.shippingMethod].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [rows, q, tab]);

  const pendingCount = rows.filter(r => r.status === 'PENDING').length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-700 flex items-center gap-2"><Package className="w-6 h-6" /> Logistics Requests</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} pending · {rows.length} total</p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-1.5 text-sm py-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search request #, client, method…" className="input-field w-full pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(s => (
            <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${tab === s ? 'bg-[#4A3B52] text-white' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
              {s === 'All' ? 'All' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No logistics requests found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/20">
              <tr><th className="text-left py-3 px-4 font-600">Request</th><th className="text-left font-600">Client</th><th className="text-left font-600">Method</th><th className="text-left font-600">Weight</th><th className="text-left font-600">Status</th><th className="text-left font-600 pr-4">Submitted</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r.id} onClick={() => router.push(`/admin/logistics/${r.id}`)} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-tabular font-600 text-primary text-xs">{r.requestNumber}</span>
                      {r.unreadCount > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-700 bg-yellow-100 text-yellow-700">{r.unreadCount}</span>}
                    </div>
                  </td>
                  <td><div className="text-xs"><p className="font-500">{r.clientName}</p><p className="text-muted-foreground">{r.companyName}</p></div></td>
                  <td className="text-xs">{r.shippingMethod || '—'}</td>
                  <td className="text-xs">{r.weightKg || '—'} KG</td>
                  <td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600 ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span></td>
                  <td className="pr-4 text-xs text-muted-foreground font-tabular">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
