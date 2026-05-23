'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests } from '@/lib/mockData';
import { Plus, Eye, Camera } from 'lucide-react';

const tabs = ['All', 'Pending', 'Quotation Ready', 'In Progress', 'Completed'];

export default function AllRequestsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('All');

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'awaiting-approval') setTab('Pending');
  }, [searchParams]);
  const filtered = useMemo(() => mockRequests.filter(r => {
    if (tab === 'All') return true;
    if (tab === 'Pending') return ['Request Submitted', 'Awaiting Approval'].includes(r.status as string);
    if (tab === 'Quotation Ready') return r.status === 'Quotation in Progress';
    if (tab === 'In Progress') return ['Sourcing', 'At China Warehouse', 'Payment Pending'].includes(r.status as string);
    if (tab === 'Completed') return r.status === 'Completed';
    return true;
  }), [tab]);

  return (
    <ClientLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-700 text-foreground">My Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Sourcing requests submitted to EliosWholesale</p>
        </div>
        <div className="flex gap-2">
          <Link href="/client-dashboard/requests/photo" className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"><Camera className="w-4 h-4" /> Photo Request</Link>
          <Link href="/client-dashboard/requests/new" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> New Request</Link>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-4 scrollbar-hide">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-600 whitespace-nowrap transition-colors ${tab === t ? 'bg-[#5c5470] text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-muted/40"><tr className="border-b border-border">
              {['Request ID', 'Date', 'Items', 'Status', 'Budget', 'Action'].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No requests in this filter.</td></tr> : filtered.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2">{r.source === 'photo_scan' && <Camera className="w-3.5 h-3.5 text-[#4A3B52]" />}<span className="text-sm font-600 text-primary font-tabular">{r.requestId}</span></div></td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground font-tabular">{r.date}</td>
                  <td className="px-4 py-3.5"><p className="text-sm font-500">{r.items} items</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.itemNames}</p></td>
                  <td className="px-4 py-3.5"><StatusBadge status={r.status as any} /></td>
                  <td className="px-4 py-3.5 text-sm font-tabular font-600">{r.totalBudget}</td>
                  <td className="px-4 py-3.5"><Link href={`/client-dashboard/requests/${r.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-[#4A3B52] border border-[#4A3B52]/30 rounded-lg hover:bg-[#4A3B52]/10"><Eye className="w-3.5 h-3.5" /> View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClientLayout>
  );
}
