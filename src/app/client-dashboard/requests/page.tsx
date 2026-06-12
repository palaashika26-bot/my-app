'use client';
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { requestsApi } from '@/lib/api/requests.api';
import { requestsCache } from '@/lib/api/requestsCache';
import { Plus, Eye } from 'lucide-react';

const tabs = ['All', 'Pending', 'Quotation Ready', 'In Progress', 'Completed'];

// Server-side filter: each tab maps to the SourcingRequest enum statuses it
// covers. undefined = no filter (All Requests).
// This mirrors the admin-side TAB_TO_STATUSES so filtering is done on the DB,
// not in-memory on a limit:50 dump of every request the client ever submitted.
const TAB_TO_STATUSES: Record<string, string | undefined> = {
  'All': undefined,
  'Pending': 'SUBMITTED,REVIEWING',
  'Quotation Ready': 'QUOTED,PARTIALLY_ACCEPTED',
  'In Progress': 'ACCEPTED',
  'Completed': 'CONVERTED',
};

// Map API RequestStatus → tab grouping (client-side guard for edge-case values)
function matchesTab(status: string, tab: string): boolean {
  if (tab === 'All') return true;
  if (tab === 'Pending') return ['SUBMITTED', 'REVIEWING', 'Request Submitted', 'Awaiting Approval'].includes(status);
  if (tab === 'Quotation Ready') return ['QUOTED', 'PARTIALLY_ACCEPTED', 'Quotation in Progress'].includes(status);
  if (tab === 'In Progress') return ['ACCEPTED', 'Sourcing', 'At China Warehouse', 'Payment Pending'].includes(status);
  if (tab === 'Completed') return ['CONVERTED', 'Completed'].includes(status);
  return true;
}

interface DisplayRequest {
  id: string;
  requestId: string;
  date: string;
  items: number;
  itemNames: string;
  status: string;
  totalBudget: string;
  source?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBudget(amount: number | null | undefined): string {
  if (!amount) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function AllRequestsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('All');
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'awaiting-approval') setTab('Pending');
  }, [searchParams]);

  // Re-fetch whenever the active tab changes. Filtering is applied server-side
  // so only the rows for the selected tab are fetched (not a full dump of 50).
  useEffect(() => {
    const abortController = new AbortController();
    const statuses = TAB_TO_STATUSES[tab];

    async function load(attempt = 0) {
      setLoading(true);
      // 25s, not 5s: the Render free instance sleeps on inactivity and can take
      // ~50s to wake, so a short timeout shows an empty list on the first load
      // (especially on slower mobile networks) even though requests exist.
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000));
      try {
        const r: any = await Promise.race([
          requestsApi.getRequests(
            {
              limit: 25,
              statuses: statuses || undefined,
            },
            abortController.signal
          ),
          timeout,
        ]);
        if (abortController.signal.aborted) return;
        const apiData = r.data?.data ?? [];
        // Only cache the full list when "All" is selected (used by detail page)
        if (!statuses) requestsCache.setList(apiData);
        const mapped: DisplayRequest[] = apiData.map((req: any) => ({
          id: req.id,
          requestId: req.requestNumber,
          date: formatDate(req.createdAt),
          items: req.items?.length ?? 0,
          itemNames: (req.items ?? []).map((i: any) => i.productName).join(', '),
          status: req.status,
          totalBudget: formatBudget(req.totalBudgetINR),
          source: undefined,
        }));
        setRequests(mapped);
        setLoading(false);
      } catch {
        if (abortController.signal.aborted) return;
        // First failure is often the Render free instance still waking up — retry
        // once (keeping the loading state on) before giving up to an empty list.
        if (attempt === 0) { load(1); return; }
        setRequests([]); // API failed — show empty list, never fall back to mock data
        setLoading(false);
      }
    }

    load();
    return () => abortController.abort();
  }, [tab]);

  // Client-side guard: handles any status values not covered by TAB_TO_STATUSES
  const filtered = useMemo(
    () => requests.filter((r) => matchesTab(r.status, tab)),
    [requests, tab]
  );

  return (
    <ClientLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-700 text-foreground">My Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Sourcing requests submitted to EliosWholesale</p>
        </div>
        <div className="flex gap-2">
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
              {loading ? (
                // Skeleton rows while loading — avoids a false "No requests" flash
                // during the (possibly cold-start) fetch, which can take 20-30s.
                [0, 1, 2, 3].map(i => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 bg-muted rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-32 bg-muted rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-16 bg-muted rounded-full" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 bg-muted rounded" /></td>
                    <td className="px-4 py-3.5"><div className="h-7 w-14 bg-muted rounded-lg" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No requests in this filter.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="table-row-hover">
                  <td className="px-4 py-3.5"><span className="text-sm font-600 text-primary font-tabular">{r.requestId}</span></td>
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

export default function AllRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AllRequestsContent />
    </Suspense>
  );
}
