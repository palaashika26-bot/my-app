'use client';
import React, { useState } from 'react';
import { Eye, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, Truck } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { mockOrders, type OrderRow } from '@/lib/mockData';
import Link from 'next/link';
import type { OrderStatus } from '@/components/ui/StatusBadge';

type SortKey = 'orderId' | 'date' | 'amount' | 'status';
type SortDir = 'asc' | 'desc' | null;

const PIPELINE_STEP: Record<OrderStatus, number> = {
  'Request Submitted': 1,
  'Quotation in Progress': 2,
  'Awaiting Approval': 3,
  'Payment Pending': 4,
  'Payment Confirmed': 5,
  Sourcing: 6,
  'At China Warehouse': 7,
  'Repacking Warehouse': 8,
  'Ready for Shipping': 9,
  'Ready for Logistics': 9,
  'Return from China': 0,
  'Shipped from China': 10,
  'In Transit': 10,
  'Arrived India Warehouse': 11,
  'Out for Delivery': 12,
  Completed: 13,
  Exception: 0,
  Cancelled: 0,
};

function MiniProgressBar({ status }: { status: OrderStatus }) {
  if (status === 'Exception') {
    return (
      <div className="flex items-center gap-1 mt-1">
        <div className="flex-1 h-1 rounded-full bg-red-200">
          <div className="h-1 rounded-full bg-red-500 w-1/2" />
        </div>
        <span className="text-[10px] text-red-500 font-500">Exception</span>
      </div>
    );
  }
  const step = PIPELINE_STEP[status] || 0;
  const pct = Math.round((step / 13) * 100);
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${
            status === 'Completed' ? 'bg-emerald-500' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Order progress: ${pct}%`}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-tabular w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function RecentOrdersTable() {
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

  const sorted = [...mockOrders].sort((a, b) => {
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
          <h2 className="text-sm font-600 text-foreground">Recent Orders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mockOrders.length} total orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/client-dashboard/orders"
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <Truck className="w-3.5 h-3.5" aria-hidden="true" />
            All Orders
          </Link>
        </div>
      </div>

      {/* Exception alert */}
      {mockOrders.some((o) => o.status === 'Exception') && (
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-red-50 border-b border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-red-700 font-500">
            Order BK-ORD-2024-0241 has an exception — item shortage reported by supplier
          </p>
          <Link href="/client-dashboard/orders/ord-008" className="ml-auto text-xs text-red-600 font-600 hover:text-red-700 transition-colors">
            View →
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[700px]" role="table" aria-label="Recent orders">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="px-5 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('orderId')}
              >
                Order ID <SortIcon col="orderId" />
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
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('amount')}
              >
                Amount <SortIcon col="amount" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider"
              >
                Est. Delivery
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
              <TableSkeleton rows={6} cols={7} />
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState variant="orders" />
                </td>
              </tr>
            ) : (
              sorted.map((row: OrderRow) => (
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
                        {row.orderId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-muted-foreground font-tabular">{row.date}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-500 text-foreground">{row.itemCount} items</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <span className="text-sm font-600 text-foreground font-tabular">{row.amount}</span>
                      <p className="text-[11px] text-muted-foreground font-tabular">{row.amountCny}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-xs font-500 font-tabular ${
                        row.estimatedDelivery === 'On Hold' ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    >
                      {row.estimatedDelivery}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <StatusBadge status={row.status as OrderStatus} />
                      <MiniProgressBar status={row.status as OrderStatus} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/client-dashboard/orders/${row.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors"
                        aria-label={`View order ${row.orderId}`}
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        Track
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
          <span className="font-600 text-foreground">47</span> orders
        </p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-xs font-500 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-40" disabled>
            Previous
          </button>
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={`ord-page-${p}`}
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