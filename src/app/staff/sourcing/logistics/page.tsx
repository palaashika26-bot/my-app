'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { MessageSquare, Package, Edit3, Building2, CheckCircle2 } from 'lucide-react';
import {
  logisticsApi,
  LOGISTICS_STATUS_COLORS,
  LOGISTICS_STATUS_LABELS,
} from '@/lib/api/logistics.api';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  QUOTED: 'bg-[#e4eeee] text-[#6b8f90] border border-[#bcd9d9]',
  CONFIRMED: 'bg-green-100 text-green-700 border border-green-300',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 border border-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
};
const statusLabel: Record<string, string> = { PENDING: 'Pending', QUOTED: 'Quoted', CONFIRMED: 'Confirmed', IN_TRANSIT: 'In Transit', COMPLETED: 'Completed' };
const TABS = ['All', 'PENDING', 'QUOTED', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED'];

export default function SourcingLogisticsPage() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouseAddress, setWarehouseAddress] = useState<any>(DEFAULT_WAREHOUSE_ADDRESS);
  const [warehouseAddressUpdatedAt, setWarehouseAddressUpdatedAt] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({ ...DEFAULT_WAREHOUSE_ADDRESS });
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const fetchRequests = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi.getList({ limit: 100 }, signal)
      .then(r => setRequests(r.data?.data ?? []))
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') setError('Failed to load logistics requests.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchRequests(ac.signal);
    try {
      const raw = localStorage.getItem('elios-warehouse-address');
      const addr = raw ? JSON.parse(raw) : DEFAULT_WAREHOUSE_ADDRESS;
      setWarehouseAddress(addr);
      if (addr.updatedAt) setWarehouseAddressUpdatedAt(addr.updatedAt);
      const { updatedAt: _u, ...formFields } = addr;
      setAddressForm(formFields);
    } catch {}
    return () => ac.abort();
  }, [fetchRequests]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => {
    if (tab !== 'All' && r.status !== tab) return false;
    if (!q) return true;
    return [r.requestNumber, r.clientName, r.companyName, r.shippingMethod].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [rows, q, tab]);

  const pendingCount = rows.filter(r => r.status === 'PENDING').length;

  const pendingCount = requests.filter(r => r.status === 'SUBMITTED').length;

  return (
    <div>
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

      {/* Logistics Requests */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-[#4A3B52]" />
          <h3 className="font-700">Logistics Requests</h3>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-600 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>

        {error ? (
          <div className="px-5 py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button onClick={() => fetchRequests()} className="text-xs font-600 text-red-700 hover:underline">Retry</button>
            </div>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No logistics requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-[11px] uppercase text-muted-foreground">
                  <th className="px-3 py-3 text-left font-600">Client</th>
                  <th className="px-3 py-3 text-left font-600">Request #</th>
                  <th className="px-3 py-3 text-left font-600">Weight</th>
                  <th className="px-3 py-3 text-left font-600">CBM</th>
                  <th className="px-3 py-3 text-left font-600">Method</th>
                  <th className="px-3 py-3 text-left font-600">Submitted</th>
                  <th className="px-3 py-3 text-left font-600">Status</th>
                  <th className="px-3 py-3 text-right font-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => (
                  <tr key={req.id} className="table-row-hover">
                    <td className="px-3 py-3">
                      <p className="font-600 text-sm">{req.client?.companyName || req.client?.user?.email || '—'}</p>
                      <p className="text-xs text-muted-foreground">{req.client?.user?.email || ''}</p>
                    </td>
                    <td className="px-3 py-3 font-tabular text-xs">{req.requestNumber || req.id}</td>
                    <td className="px-3 py-3 text-sm">{req.weightKg ? `${Number(req.weightKg)} KG` : '— KG'}</td>
                    <td className="px-3 py-3 text-sm">{req.volumeCbm ? `${Number(req.volumeCbm)} CBM` : '— CBM'}</td>
                    <td className="px-3 py-3 text-sm">{req.shippingMethod}</td>
                    <td className="px-3 py-3 text-xs font-tabular">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
                        {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/staff/sourcing/logistics/${req.id}`} className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#4A3B52]/90 transition-colors w-fit">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {req.status === 'QUOTED' ? 'Edit Quote' : req.status === 'SUBMITTED' ? 'Reply / Quote' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
