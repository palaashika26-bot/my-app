'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import { Search, Package } from 'lucide-react';

interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string;
  completedStages: string[];
  createdAt: string;
  client?: { companyName?: string; user?: { firstName: string; lastName: string } };
  items?: { product?: { name?: string }; notes?: string; quantity: number }[];
  warehouseReport?: { reportSubmitted?: boolean; sentToChina?: boolean } | null;
}

function StatusChip({ order }: { order: ApiOrder }) {
  if (order.warehouseReport?.sentToChina) {
    return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sent to China</span>;
  }
  if (order.warehouseReport?.reportSubmitted) {
    return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Report Submitted</span>;
  }
  return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Awaiting Report</span>;
}

type FilterTab = 'all' | 'pending' | 'submitted';

export default function WarehouseOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/orders`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const all: ApiOrder[] = json?.data ?? [];
        // Warehouse staff see orders in the Repacking Warehouse stage.
        setOrders(all.filter((o) =>
          o.status === 'REPACKING' || o.completedStages?.includes('Repacking Warehouse'),
        ));
      })
      .catch(() => { if (!cancelled) setOrders([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'pending') setTab('pending');
    else if (filter === 'submitted' || filter === 'awaiting') setTab('submitted');
  }, [searchParams]);

  const isSubmitted = (o: ApiOrder) => !!o.warehouseReport?.reportSubmitted || !!o.warehouseReport?.sentToChina;

  const filtered = orders.filter((o) => {
    const clientName = o.client?.companyName
      ?? (o.client?.user ? `${o.client.user.firstName} ${o.client.user.lastName}` : '');
    const matchesQuery =
      !query.trim() ||
      o.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
      clientName.toLowerCase().includes(query.toLowerCase());
    const matchesTab =
      tab === 'all' ||
      (tab === 'pending' && !isSubmitted(o)) ||
      (tab === 'submitted' && isSubmitted(o));
    return matchesQuery && matchesTab;
  });

  const tabCounts = {
    all: orders.length,
    pending: orders.filter((o) => !isSubmitted(o)).length,
    submitted: orders.filter((o) => isSubmitted(o)).length,
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

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders in the Repacking Warehouse stage will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const clientName = order.client?.companyName
              ?? (order.client?.user ? `${order.client.user.firstName} ${order.client.user.lastName}` : '—');
            const itemNames = (order.items ?? [])
              .slice(0, 2)
              .map((i) => i.product?.name ?? i.notes ?? 'Item')
              .join(', ');
            const extra = (order.items?.length ?? 0) - 2;
            const currentStage = order.completedStages?.length > 0
              ? order.completedStages[order.completedStages.length - 1]
              : 'Repacking Warehouse';

            return (
              <Link
                key={order.id}
                href={`/staff/warehouse/orders/${order.id}`}
                className="bg-card rounded-xl border border-border shadow-card p-4 block hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-tabular font-700 text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
                  </div>
                  <StatusChip order={order} />
                </div>
                {itemNames && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {itemNames}{extra > 0 ? ` +${extra} more` : ''}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
                    {currentStage}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Created{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
