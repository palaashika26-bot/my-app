'use client';
import React, { useState } from 'react';
import { Eye, ChevronUp, ChevronDown, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { mockRequests, type RequestRow } from '@/lib/mockData';
import Link from 'next/link';
import type { OrderStatus } from '@/components/ui/StatusBadge';

type SortKey = 'requestId' | 'date' | 'items' | 'status';
type SortDir = 'asc' | 'desc' | null;

export default function RecentRequestsTable() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [isLoading] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...mockRequests].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50 ml-1 inline" aria-hidden="true" />;
    if (sortDir === 'asc')
      return <ChevronUp className="w-3.5 h-3.5 text-accent ml-1 inline" aria-hidden="true" />;
    return <ChevronDown className="w-3.5 h-3.5 text-accent ml-1 inline" aria-hidden="true" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-600 text-foreground">Recent Requests</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mockRequests.length} total requests
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

      {/* Exception alert */}
      {mockRequests.some((r) => r.status === 'Exception') && (
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-red-50 border-b border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-red-700 font-500">
            1 request has an exception — please review BK-REQ-2024-0265
          </p>
          <Link href="/client-dashboard/requests/req-008" className="ml-auto text-xs text-red-600 font-600 hover:text-red-700 transition-colors">
            View →
          </Link>
        </div>
      )}

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
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('date')}
              >
                Date <SortIcon col="date" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider"
              >
                Items
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider"
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
            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    variant="requests"
                    action={{
                      label: 'Submit New Request',
                      onClick: () => {},
                    }}
                  />
                </td>
              </tr>
            ) : (
              sorted.map((row: RequestRow) => (
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
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-muted-foreground font-tabular">{row.date}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <span className="text-sm font-500 text-foreground">{row.items} items</span>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px] truncate" title={row.itemNames}>
                        {row.itemNames}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-500 text-foreground font-tabular">{row.totalBudget}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status as OrderStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/client-dashboard/requests/${row.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors"
                        aria-label={`View request ${row.requestId}`}
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        View
                      </Link>
                    </div>
                    <div className="opacity-100 group-hover:opacity-0 transition-opacity absolute -mt-7">
                      <Link
                        href={`/client-dashboard/requests/${row.id}`}
                        className="text-xs text-accent font-500"
                        aria-label={`View request ${row.requestId}`}
                        tabIndex={-1}
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-600 text-foreground">8</span> of{' '}
          <span className="font-600 text-foreground">23</span> requests
        </p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-40" disabled>
            Previous
          </button>
          {[1, 2, 3].map((p) => (
            <button
              key={`req-page-${p}`}
              className={`w-7 h-7 flex items-center justify-center text-xs font-500 rounded-lg transition-colors ${
                p === 1
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              aria-current={p === 1 ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button className="px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}