'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronUp, ChevronDown, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { RequestRow } from '@/lib/mockData';
import Link from 'next/link';
import type { OrderStatus } from '@/components/ui/StatusBadge';

type SortKey = 'requestId' | 'date' | 'items' | 'status';
type SortDir = 'asc' | 'desc' | null;

export default function RecentRequestsTable({
  requests,
  loading,
}: {
  requests: RequestRow[];
  loading: boolean;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...requests].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const recent = sorted.slice(0, 5);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50 ml-1 inline" aria-hidden="true" />;
    if (sortDir === 'asc')
      return <ChevronUp className="w-3.5 h-3.5 text-[#4A3B52] ml-1 inline" aria-hidden="true" />;
    return <ChevronDown className="w-3.5 h-3.5 text-[#4A3B52] ml-1 inline" aria-hidden="true" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-600 text-foreground">Recent Requests</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {requests.length} total requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
          href="/client-dashboard/requests/new"
            className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New Request
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[640px]" role="table" aria-label="Recent sourcing requests">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="px-5 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('requestId')}
              >
                Request ID <SortIcon col="requestId" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors hidden sm:table-cell"
                onClick={() => handleSort('date')}
              >
                Date <SortIcon col="date" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider hidden sm:table-cell"
              >
                Items
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider hidden sm:table-cell"
              >
                Budget Est.
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon col="status" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-600 text-muted-foreground uppercase tracking-wider"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    variant="requests"
                    action={{
                      label: 'Submit New Request',
                      onClick: () => router.push('/client-dashboard/requests/new'),
                    }}
                  />
                </td>
              </tr>
            ) : (
              recent.map((row: RequestRow) => (
                <tr
                  key={row.id}
                  className={`table-row-hover group ${
                    row.status === 'Exception' ? 'bg-red-50/40' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {row.status === 'Exception' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className="text-sm font-600 text-primary font-tabular">
                        {row.requestId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground font-tabular">{row.date}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div>
                      <span className="text-sm font-500 text-foreground">{row.items} items</span>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px] truncate" title={row.itemNames}>
                        {row.itemNames}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-sm font-500 text-foreground font-tabular">{row.totalBudget}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status as OrderStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/client-dashboard/requests/${row.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-[#4A3B52] border border-[#4A3B52]/30 rounded-lg hover:bg-[#4A3B52]/10 transition-colors"
                      aria-label={`View request ${row.requestId}`}
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — link to the full requests list */}
      {!loading && requests.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-600 text-foreground">{recent.length}</span> of{' '}
            <span className="font-600 text-foreground">{requests.length}</span> request{requests.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/client-dashboard/requests"
            className="text-xs font-600 text-[#4A3B52] hover:underline"
          >
            View all requests →
          </Link>
        </div>
      )}
    </div>
  );
}