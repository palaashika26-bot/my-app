'use client';
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { requestsApi } from '@/lib/api/requests.api';

import { useToast } from '@/components/ui/Toast';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Search, Download, Camera, Eye, Send, AlertTriangle } from 'lucide-react';

const tabs = ['All Requests','Pending Quotations','Awaiting Approval','Approved','Rejected','Cancelled','Exception'];

const PER_PAGE = 25;

// Each tab → the SourcingRequest enum statuses it covers (pushed to the server so
// filtering + pagination span the whole dataset, not just the first page).
// undefined = no status filter (All). 'Exception' has no matching request status,
// so it resolves to an empty result without a round-trip.
const TAB_TO_STATUSES: Record<string, string[] | undefined> = {
  'All Requests': undefined,
  'Pending Quotations': ['SUBMITTED', 'REVIEWING'],
  'Awaiting Approval': ['QUOTED', 'PARTIALLY_ACCEPTED'],
  'Approved': ['ACCEPTED', 'CONVERTED'],
  'Rejected': ['REJECTED'],
  'Cancelled': ['CANCELLED'],
  'Exception': [],
};

interface DisplayRequest {
  id: string;
  requestId: string;
  client: string;
  clientEmail: string;
  items: number;
  itemNames: string;
  totalBudget: string;
  date: string;
  status: string;
  source?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AdminRequestsContent() {
  const { addToast } = useToast();
  const perms = useAdminPermissions();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState('All Requests');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'awaiting-approval') setTab('Awaiting Approval');
  }, [searchParams]);

  // Debounce the search box so each keystroke doesn't fire a server query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Switching tab or changing the search resets to the first page.
  useEffect(() => { setPage(1); }, [tab, debouncedQ]);

  useEffect(() => {
    const ac = new AbortController();
    const statuses = TAB_TO_STATUSES[tab];

    // 'Exception' maps to no request status — show empty without a round-trip.
    if (tab === 'Exception') {
      setRequests([]);
      setPageMeta({ total: 0, totalPages: 1 });
      setLoading(false);
      setError(null);
      return () => ac.abort();
    }

    async function load(attempt = 0) {
      setLoading(true);
      setError(null);
      try {
        const r = await requestsApi.getRequests(
          {
            page,
            limit: PER_PAGE,
            statuses: statuses && statuses.length ? statuses.join(',') : undefined,
            search: debouncedQ || undefined,
          },
          ac.signal
        );
        if (ac.signal.aborted) return;
        const apiData = r.data?.data ?? [];
        const meta = r.data?.pagination;
        const mapped: DisplayRequest[] = apiData.map((req: any) => ({
          id: req.id,
          requestId: req.requestNumber,
          client: req.client?.companyName ?? '—',
          clientEmail: req.client?.user?.email ?? '',
          items: req.items?.length ?? 0,
          itemNames: (req.items ?? []).map((i: any) => i.productName).join(', '),
          totalBudget: req.totalBudgetINR ? `₹${Number(req.totalBudgetINR).toLocaleString('en-IN')}` : '—',
          date: formatDate(req.createdAt),
          status: req.status,
          source: undefined,
        }));
        setRequests(mapped);
        setPageMeta({ total: meta?.total ?? mapped.length, totalPages: Math.max(1, meta?.totalPages ?? 1) });
        setLoading(false);
      } catch (e: any) {
        if (ac.signal.aborted || e?.code === 'ERR_CANCELED') return;
        // First failure is often the Render free instance cold-starting — retry
        // once (keeping loading on) so a slow wake-up isn't shown as "no requests".
        if (attempt === 0) { load(1); return; }
        setError('Failed to load requests. The server may be waking up — please retry.');
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [reloadKey, tab, debouncedQ, page]);

  const uniqueClients = useMemo(() => ['All', ...new Set(requests.map(r => r.client).filter(Boolean))], [requests]);

  // Tab + search are applied server-side; only the client dropdown (a refinement
  // over the current page) is applied here.
  const filtered = useMemo(
    () => requests.filter(r => clientFilter === 'All' || r.client === clientFilter),
    [requests, clientFilter]
  );

  function deleteSelected() {
    const ids = Object.keys(selected).filter(k => selected[k]);
    setRequests(p => p.filter(r => !ids.includes(r.id)));
    setSelected({});
    addToast({ type: 'success', title: `Removed ${ids.length} request(s) from view` });
  }
  function exportSelected() { addToast({ type: 'info', title: 'Exporting...', description: `${Object.values(selected).filter(Boolean).length} rows` }); }

  return (
    <AdminLayout>
      <div className="mb-5"><h1 className="text-2xl font-700">Sourcing Requests</h1><p className="text-sm text-muted-foreground mt-1">Manage client requests</p></div>
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-600 whitespace-nowrap ${tab === t ? 'bg-[#5c5470] text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>)}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Request ID, client, items..." className="input-field !pl-10" /></div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="input-field">{uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700 min-w-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-600 truncate">{error}</p>
          </div>
          <button onClick={() => setReloadKey(k => k + 1)} className="btn-secondary px-3 py-1.5 text-xs font-600 whitespace-nowrap flex-shrink-0">Retry</button>
        </div>
      )}
      {Object.values(selected).some(Boolean) && (
        <div className="bg-[#f5f4f7] border border-[#e8e4f0] rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-600 text-[#5c5470]">{Object.values(selected).filter(Boolean).length} selected</p>
          <div className="ml-auto flex gap-2">
            <button onClick={exportSelected} className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
            {perms.isFullAdmin && (
              <button onClick={deleteSelected} className="px-3 py-1.5 text-xs font-600 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Delete Selected</button>
            )}
          </div>
        </div>
      )}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground">
            <th className="px-3 py-3"><input type="checkbox" onChange={e => { const next: Record<string, boolean> = {}; if (e.target.checked) filtered.forEach(r => next[r.id] = true); setSelected(next); }} className="accent-accent" /></th>
            <th className="px-3 py-3 text-left font-600">Request ID</th>
            <th className="px-3 py-3 text-left font-600">Client</th>
            <th className="px-3 py-3 text-left font-600">Items</th>
            {perms.canSeeRequestBudget && <th className="px-3 py-3 text-right font-600">Budget</th>}
            <th className="px-3 py-3 text-left font-600">Date</th>
            <th className="px-3 py-3 text-left font-600">Status</th>
            <th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={perms.canSeeRequestBudget ? 8 : 7} className="py-10 text-center text-muted-foreground text-sm">
                  {loading ? 'Loading requests…' : error ? '' : 'No requests match.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={`table-row-hover ${r.status === 'Exception' ? 'bg-red-50/40' : r.status === 'CANCELLED' ? 'bg-red-50/20' : ''}`}>
                  <td className="px-3 py-3"><input type="checkbox" checked={!!selected[r.id]} onChange={() => setSelected(s => ({ ...s, [r.id]: !s[r.id] }))} className="accent-accent" /></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2">{r.source === 'photo_scan' && <Camera className="w-3.5 h-3.5 text-[#4A3B52]" aria-label="Photo-scan submission" />}<Link href={`/admin/requests/${r.id}`} className="font-tabular font-600 text-primary hover:text-[#4A3B52]">{r.requestId}</Link></div></td>
                  <td className="px-3 py-3"><p className="text-sm">{r.client}</p><p className="text-[11px] text-muted-foreground">{r.clientEmail}</p></td>
                  <td className="px-3 py-3">
                    <p className="text-sm">{r.items} items</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.itemNames}</p>
                  </td>
                  {perms.canSeeRequestBudget && (
                    <td className="px-3 py-3 text-right font-tabular font-600">{r.totalBudget}</td>
                  )}
                  <td className="px-3 py-3 text-xs text-muted-foreground font-tabular">{r.date}</td>
                  <td className="px-3 py-3"><StatusBadge status={(r.status === 'CANCELLED' ? 'Cancelled' : r.status) as any} /></td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/requests/${r.id}`} className="p-1.5 rounded-md hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                      {perms.quotationScope === 'full' && (
                        <Link href={`/admin/requests/${r.id}`} className="p-1.5 rounded-md hover:bg-muted text-[#4A3B52]" title="Send Quotation"><Send className="w-3.5 h-3.5" /></Link>
                      )}
                      {perms.isFullAdmin && (
                        <button onClick={() => addToast({ type: 'warning', title: 'Mark Exception', description: 'Open the request to take action.' })} className="p-1.5 rounded-md hover:bg-muted text-red-500" title="Mark Exception"><AlertTriangle className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {pageMeta.total > 0
              ? <>Page <span className="font-600 text-foreground">{page}</span> of <span className="font-600 text-foreground">{pageMeta.totalPages}</span> · <span className="font-600 text-foreground">{pageMeta.total}</span> request(s)</>
              : 'No requests'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelected({}); setPage(p => Math.max(1, p - 1)); }} disabled={page <= 1 || loading} className="px-2 py-1 text-xs font-500 rounded hover:bg-muted disabled:opacity-40">Prev</button>
            <span className="text-xs font-600 font-tabular">{page} / {pageMeta.totalPages}</span>
            <button onClick={() => { setSelected({}); setPage(p => Math.min(pageMeta.totalPages, p + 1)); }} disabled={page >= pageMeta.totalPages || loading} className="px-2 py-1 text-xs font-500 rounded hover:bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminRequestsContent />
    </Suspense>
  );
}
