'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests, mockClients } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Search, Download, Camera, Eye, Send, AlertTriangle } from 'lucide-react';

const tabs = ['All Requests','Pending Quotations','Awaiting Approval','Approved','Rejected','Exception'];

export default function AdminRequestsPage() {
  const { addToast } = useToast();
  const perms = useAdminPermissions();
  const [items, setItems] = useState(mockRequests);
  const [tab, setTab] = useState('All Requests');
  const [q, setQ] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => items.filter(r => {
    if (q && !(r.requestId.toLowerCase().includes(q.toLowerCase()) || (r.client||'').toLowerCase().includes(q.toLowerCase()) || r.itemNames.toLowerCase().includes(q.toLowerCase()))) return false;
    if (clientFilter !== 'All' && r.client !== clientFilter) return false;
    if (tab === 'Pending Quotations' && r.status !== 'Quotation in Progress') return false;
    if (tab === 'Awaiting Approval' && r.status !== 'Awaiting Approval') return false;
    if (tab === 'Approved' && !['Sourcing','At China Warehouse','Payment Pending','Completed'].includes(r.status as string)) return false;
    if (tab === 'Rejected' && r.status !== 'Cancelled' as any) return false;
    if (tab === 'Exception' && r.status !== 'Exception') return false;
    return true;
  }), [items, q, clientFilter, tab]);

  function sendQuote(id: string) { setItems(p => p.map(r => r.id === id ? { ...r, status: 'Quotation in Progress' } as any : r)); addToast({ type: 'success', title: 'Quotation sent', description: 'Client has been notified.' }); }
  function markException(id: string) { setItems(p => p.map(r => r.id === id ? { ...r, status: 'Exception' } as any : r)); addToast({ type: 'warning', title: 'Marked as exception' }); }
  function deleteSelected() { const ids = Object.keys(selected).filter(k => selected[k]); setItems(p => p.filter(r => !ids.includes(r.id))); setSelected({}); addToast({ type: 'success', title: `Deleted ${ids.length} request(s)` }); }
  function exportSelected() { addToast({ type: 'info', title: 'Exporting...', description: `${Object.values(selected).filter(Boolean).length} rows` }); }

  return (
    <AdminLayout>
      <div className="mb-5"><h1 className="text-2xl font-700">Sourcing Requests</h1><p className="text-sm text-muted-foreground mt-1">Manage client requests</p></div>
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${tab === t ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>)}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Request ID, client, items..." className="input-field pl-9" /></div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="input-field"><option>All</option>{mockClients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
      </div>
      {Object.values(selected).some(Boolean) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
          <p className="text-sm font-600 text-orange-800">{Object.values(selected).filter(Boolean).length} selected</p>
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
                  No requests match.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const client = mockClients.find((c) => c.name === r.client);
                return (
                <tr key={r.id} className={`table-row-hover ${r.status === 'Exception' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-3"><input type="checkbox" checked={!!selected[r.id]} onChange={() => setSelected(s => ({ ...s, [r.id]: !s[r.id] }))} className="accent-accent" /></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2">{r.source === 'photo_scan' && <Camera className="w-3.5 h-3.5 text-accent" aria-label="Photo-scan submission" />}<Link href={`/admin/requests/${r.id}`} className="font-tabular font-600 text-primary hover:text-accent">{r.requestId}</Link></div></td>
                  <td className="px-3 py-3"><p className="text-sm">{r.client}</p><p className="text-[11px] text-muted-foreground">{client?.email}</p></td>
                  <td className="px-3 py-3">
                    <p className="text-sm">{r.items} items</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.itemNames}</p>
                  </td>
                  {perms.canSeeRequestBudget && (
                    <td className="px-3 py-3 text-right font-tabular font-600">{r.totalBudget}</td>
                  )}
                  <td className="px-3 py-3 text-xs text-muted-foreground font-tabular">{r.date}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status as any} /></td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/requests/${r.id}`} className="p-1.5 rounded-md hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                      {perms.quotationScope === 'full' && (
                        <button onClick={() => sendQuote(r.id)} className="p-1.5 rounded-md hover:bg-muted text-accent" title="Send Quotation"><Send className="w-3.5 h-3.5" /></button>
                      )}
                      {perms.isFullAdmin && (
                        <button onClick={() => markException(r.id)} className="p-1.5 rounded-md hover:bg-muted text-red-500" title="Mark Exception"><AlertTriangle className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table></div>
      </div>
    </AdminLayout>
  );
}
