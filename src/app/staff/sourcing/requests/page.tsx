'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { requestsApi } from '@/lib/api/requests.api';
import { useToast } from '@/components/ui/Toast';
import { Search, Download, Camera, Eye, Send, AlertTriangle } from 'lucide-react';

const tabs = ['All Requests', 'Pending Quotations', 'Awaiting Approval', 'Approved', 'Rejected', 'Exception'];

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

function matchesTab(status: string, tab: string): boolean {
  if (tab === 'All Requests') return true;
  if (tab === 'Pending Quotations') return ['SUBMITTED', 'REVIEWING', 'Quotation in Progress'].includes(status);
  if (tab === 'Awaiting Approval') return ['QUOTED', 'Awaiting Approval'].includes(status);
  if (tab === 'Approved') return ['ACCEPTED', 'CONVERTED', 'Sourcing', 'At China Warehouse', 'Payment Pending', 'Completed'].includes(status);
  if (tab === 'Rejected') return ['REJECTED', 'CANCELLED', 'Cancelled'].includes(status);
  if (tab === 'Exception') return status === 'Exception';
  return true;
}

export default function SourcingRequestsPage() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All Requests');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    requestsApi.getRequests({ limit: 100 })
      .then((r) => {
        const apiData = r.data?.data ?? [];
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
      })
      .catch(() => { setRequests([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => requests.filter(r => {
    if (q && !(
      r.requestId.toLowerCase().includes(q.toLowerCase()) ||
      r.client.toLowerCase().includes(q.toLowerCase()) ||
      r.itemNames.toLowerCase().includes(q.toLowerCase())
    )) return false;
    return matchesTab(r.status, tab);
  }), [requests, q, tab]);

  function exportSelected() {
    addToast({ type: 'info', title: 'Exporting...', description: `${Object.values(selected).filter(Boolean).length} rows` });
  }

  return (
    <div>
      <div className="mb-5"><h1 className="text-2xl font-700">Sourcing Requests</h1><p className="text-sm text-muted-foreground mt-1">Manage client requests</p></div>
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-600 whitespace-nowrap ${tab === t ? 'bg-[#5c5470] text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>)}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Request ID, client, items..." className="input-field !pl-10" /></div>
        <div className="input-field flex items-center text-sm text-muted-foreground">{requests.length} requests loaded</div>
      </div>
      {Object.values(selected).some(Boolean) && (
        <div className="bg-[#f5f4f7] border border-[#e8e4f0] rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-600 text-[#5c5470]">{Object.values(selected).filter(Boolean).length} selected</p>
          <div className="ml-auto flex gap-2">
            <button onClick={exportSelected} className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
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
            <th className="px-3 py-3 text-right font-600">Budget</th>
            <th className="px-3 py-3 text-left font-600">Date</th>
            <th className="px-3 py-3 text-left font-600">Status</th>
            <th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground text-sm">Loading requests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground text-sm">No requests match.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-3 py-3"><input type="checkbox" checked={!!selected[r.id]} onChange={() => setSelected(s => ({ ...s, [r.id]: !s[r.id] }))} className="accent-accent" /></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2">{r.source === 'photo_scan' && <Camera className="w-3.5 h-3.5 text-[#4A3B52]" aria-label="Photo-scan submission" />}<Link href={`/staff/sourcing/requests/${r.id}`} className="font-tabular font-600 text-primary hover:text-[#4A3B52]">{r.requestId}</Link></div></td>
                  <td className="px-3 py-3"><p className="text-sm">{r.client}</p><p className="text-[11px] text-muted-foreground">{r.clientEmail}</p></td>
                  <td className="px-3 py-3"><p className="text-sm">{r.items} items</p><p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.itemNames}</p></td>
                  <td className="px-3 py-3 text-right font-tabular font-600">{r.totalBudget}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground font-tabular">{r.date}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status as any} /></td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/staff/sourcing/requests/${r.id}`} className="p-1.5 rounded-md hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                      <Link href={`/staff/sourcing/requests/${r.id}`} className="p-1.5 rounded-md hover:bg-muted text-[#4A3B52]" title="Send Quotation"><Send className="w-3.5 h-3.5" /></Link>
                      <button className="p-1.5 rounded-md hover:bg-muted text-red-500" title="Mark Exception" onClick={() => addToast({ type: 'warning', title: 'Mark Exception', description: 'Open the request to take action.' })}><AlertTriangle className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
