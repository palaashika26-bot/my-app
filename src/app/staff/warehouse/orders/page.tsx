'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Package } from 'lucide-react';

interface DemoOrder {
  orderId: string;
  clientName: string;
  items: string[];
  stage: string;
  assignedAt: string;
  packagingListUploaded: boolean;
  reportSubmitted: boolean;
}

function StatusChip({ order }: { order: DemoOrder }) {
  if (order.reportSubmitted) {
    return (
      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        Report Submitted
      </span>
    );
  }
  if (order.packagingListUploaded) {
    return (
      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        Packaging List Ready
      </span>
    );
  }
  return (
    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Awaiting Packaging List
    </span>
  );
}

type FilterTab = 'all' | 'pending' | 'submitted';

export default function WarehouseOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('warehouse-demo-orders');
      if (stored) setOrders(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'pending') setTab('pending');
    else if (filter === 'submitted' || filter === 'awaiting') setTab('submitted');
  }, [searchParams]);

  const filtered = orders.filter((o) => {
    const matchesQuery =
      !query.trim() ||
      o.orderId.toLowerCase().includes(query.toLowerCase()) ||
      o.clientName.toLowerCase().includes(query.toLowerCase());
    const matchesTab =
      tab === 'all' ||
      (tab === 'pending' && !o.reportSubmitted) ||
      (tab === 'submitted' && o.reportSubmitted);
    return matchesQuery && matchesTab;
  });

  const tabCounts = {
    all: orders.length,
    pending: orders.filter((o) => !o.reportSubmitted).length,
    submitted: orders.filter((o) => o.reportSubmitted).length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-700">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All orders assigned to you for repacking and QC.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID or client name..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-[#4A3B52] text-sm outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'submitted'] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${
                tab === t
                  ? 'bg-[#4A3B52] text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All' : t === 'pending' ? 'Pending' : 'Submitted'} ({tabCounts[t]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.orderId}
              href={`/staff/warehouse/orders/${order.orderId}`}
              className="bg-card rounded-xl border border-border shadow-card p-4 block hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-tabular font-700 text-sm">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.clientName}</p>
                </div>
                <StatusChip order={order} />
              </div>
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {order.items.slice(0, 2).join(', ')}
                {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
                  {order.stage}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Assigned{' '}
                  {new Date(order.assignedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
