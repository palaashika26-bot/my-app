'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockOrders } from '@/lib/mockData';
import { getOrders } from '@/lib/ordersStore';
import type { OrderRow } from '@/lib/ordersStore';
import { ordersApi } from '@/lib/api/orders.api';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import type { ApiOrder } from '@/lib/types/api.types';
import { Search, Eye, ChevronDown, ChevronUp, Package, Warehouse, MapPin, CheckCircle2, Clock, FileText, Truck, AlertCircle, DollarSign, ShoppingCart, List } from 'lucide-react';
import { SkeletonTable } from '@/components/SkeletonLoader';

const statusFilters = ['All', 'Active', 'Completed', 'Exception'];

// ── Map backend order to the frontend OrderRow shape ─────────────────────────
const ORDER_STATUS_MAP: Record<string, string> = {
  CONFIRMED:  'Order Confirmed',
  SOURCING:   'Sourcing',
  QC_PENDING: 'At China Warehouse',
  QC_PASSED:  'At China Warehouse',
  QC_FAILED:  'Exception',
  REPACKING:  'China Consolidation Warehouse',
  SHIPPED:    'Shipped from China',
  DELIVERED:  'Completed',
  CANCELLED:  'Exception',
};

function mapApiOrder(o: ApiOrder): OrderRow {
  const totalINR = parseFloat(o.totalINR || '0');
  return {
    id: o.id,
    orderId: o.orderNumber,
    date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    itemCount: o.items?.length ?? 0,
    itemNames: o.items?.map((i) => i.product.name).join(', ') || '',
    amount: `₹${totalINR.toLocaleString('en-IN')}`,
    estimatedDelivery: o.shipment?.estimatedDelivery
      ? new Date(o.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—',
    status: ORDER_STATUS_MAP[o.status] ?? o.status,
    client: o.client?.companyName,
  } as OrderRow;
}

const ALL_STAGES = [
  { id: 'quote-requested',    label: 'Quote Requested',              statuses: ['Quote Requested'],                           icon: FileText,      color: 'text-slate-600',    bg: 'bg-slate-100' },
  { id: 'sourcing',           label: 'Sourcing',                     statuses: ['Sourcing'],                                  icon: Search,        color: 'text-blue-600',     bg: 'bg-blue-50'   },
  { id: 'payment-pending',    label: 'Payment Pending',              statuses: ['Payment Pending'],                           icon: DollarSign,    color: 'text-yellow-600',   bg: 'bg-yellow-50' },
  { id: 'order-confirmed',    label: 'Order Confirmed',              statuses: ['Order Confirmed'],                           icon: ShoppingCart,  color: 'text-purple-600',   bg: 'bg-purple-50' },
  { id: 'china-wh',           label: 'At China Warehouse',          statuses: ['At China Warehouse'],                        icon: Package,       color: 'text-cyan-600',     bg: 'bg-cyan-50'   },
  { id: 'consolidation',      label: 'Consolidation / Repacking',   statuses: ['China Consolidation Warehouse', 'Repacking Warehouse'], icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'shipped',            label: 'Shipped from China',          statuses: ['Shipped from China'],                        icon: Truck,         color: 'text-orange-600',   bg: 'bg-orange-50' },
  { id: 'in-transit',         label: 'In Transit',                  statuses: ['In Transit'],                                icon: MapPin,        color: 'text-[#5c5470]',    bg: 'bg-[#f0eef8]' },
  { id: 'india-wh',           label: 'Arrived India Warehouse',     statuses: ['Arrived India Warehouse'],                   icon: CheckCircle2,  color: 'text-green-600',    bg: 'bg-green-50'  },
  { id: 'delivery',           label: 'Out for Delivery',            statuses: ['Out for Delivery'],                          icon: Clock,         color: 'text-emerald-600',  bg: 'bg-emerald-50'},
  { id: 'completed',          label: 'Completed',                   statuses: ['Completed'],                                 icon: CheckCircle2,  color: 'text-teal-600',     bg: 'bg-teal-50'   },
  { id: 'exception',          label: 'Exception',                   statuses: ['Exception'],                                 icon: AlertCircle,   color: 'text-red-600',      bg: 'bg-red-50'    },
];

function PipelineView() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const loaded = getOrders();
    setOrders(loaded);
    // Auto-expand stages that have orders
    const initExpanded: Record<string, boolean> = {};
    ALL_STAGES.forEach(stage => {
      if (loaded.some(o => stage.statuses.includes(o.status as string))) {
        initExpanded[stage.id] = true;
      }
    });
    setExpanded(initExpanded);
  }, []);

  return (
    <div className="space-y-3">
      {ALL_STAGES.map(stage => {
        const stageOrders = orders.filter(o => stage.statuses.includes(o.status as string));
        const count = stageOrders.length;
        const isEmpty = count === 0;
        const isExpanded = expanded[stage.id];

        return (
          <div key={stage.id} className={`rounded-xl border transition-colors ${isEmpty ? 'border-border/40 opacity-60' : 'border-border'}`}>
            <button
              onClick={() => !isEmpty && setExpanded(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-colors ${isEmpty ? 'cursor-default' : 'hover:bg-muted/40 cursor-pointer'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${stage.bg}`}>
                <stage.icon className={`w-4 h-4 ${stage.color}`} />
              </div>
              <span className={`text-sm font-600 flex-1 ${isEmpty ? 'text-muted-foreground' : 'text-foreground'}`}>
                {stage.label}
              </span>
              <span className={`text-sm font-700 font-tabular mr-1 ${isEmpty ? 'text-muted-foreground' : stage.color}`}>
                {count}
              </span>
              {!isEmpty && (
                isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {isExpanded && !isEmpty && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/50 pt-3">
                {stageOrders.map(o => (
                  <Link
                    key={o.id}
                    href={`/client-dashboard/orders/${o.id}`}
                    className="block rounded-lg border border-border bg-muted/20 hover:bg-muted/50 p-3 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-sm font-700 font-tabular group-hover:underline ${stage.color}`}>
                        {o.orderId || o.id}
                      </span>
                      <StatusBadge status={o.status as any} />
                    </div>
                    {o.client && (
                      <p className="text-xs text-muted-foreground truncate mb-1">{o.client}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-tabular">
                      {o.itemCount !== undefined && <span>{o.itemCount} items</span>}
                      {o.date && <span>{o.date}</span>}
                      {o.estimatedDelivery && <span>ETA: {o.estimatedDelivery}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AllOrdersPage() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  const filterParam = searchParams.get('filter');

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'pipeline'>(viewParam === 'pipeline' ? 'pipeline' : 'list');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(
    filterParam === 'completed' ? 'Completed' :
    filterParam === 'pending-payment' ? 'Active' :
    'All'
  );

  // ── Live orders from the backend (shown when a JWT is present) ─────────────
  const [liveOrders, setLiveOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setTimeout(() => setIsLoading(false), 300);
      return;
    }
    ordersApi
      .getOrders({ limit: 100 })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setLiveOrders(res.data.data.map(mapApiOrder));
        }
      })
      .catch(() => {/* Fall back to mockOrders silently */})
      .finally(() => setIsLoading(false));
  }, []);

  // Prefer live backend orders; fall back to mock when not logged in
  const allOrders = liveOrders.length > 0 ? liveOrders : mockOrders;

  const filtered = useMemo(() => allOrders.filter(o => {
    const matchesSearch = !q || o.orderId.toLowerCase().includes(q.toLowerCase()) || (o.itemNames || '').toLowerCase().includes(q.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Completed') return o.status === 'Completed';
    if (filter === 'Exception') return o.status === 'Exception';
    if (filter === 'Active') return !['Completed', 'Exception'].includes(o.status as string);
    return true;
  }), [q, filter, allOrders]);

  return (
    <ClientLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-700 text-foreground">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all your sourcing orders</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 bg-muted/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-500 transition-colors ${activeTab === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <List className="w-4 h-4" /> List View
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-500 transition-colors ${activeTab === 'pipeline' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Package className="w-4 h-4" /> Pipeline View
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input value={q} onChange={e => setQ(e.target.value)} className="input-field pl-10" style={{ paddingLeft: '2.5rem' }} placeholder="Search by order ID or item..." />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field sm:w-44">
              {statusFilters.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    {['Order ID', 'Date', 'Items', 'Amount', 'Est. Delivery', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <SkeletonTable rows={5} cols={7} />
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders match your filters.</td></tr>
                  ) : filtered.map(o => (
                    <tr key={o.id} className="table-row-hover">
                      <td className="px-4 py-3.5"><span className="text-sm font-600 text-primary font-tabular">{o.orderId}</span></td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground font-tabular">{o.date}</td>
                      <td className="px-4 py-3.5"><div><p className="text-sm font-500">{o.itemCount} items</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{o.itemNames}</p></div></td>
                      <td className="px-4 py-3.5"><div><p className="text-sm font-600 font-tabular">{o.amount}</p><p className="text-[11px] text-muted-foreground font-tabular">{(o as any).amountCny}</p></div></td>
                      <td className="px-4 py-3.5 text-xs font-500 font-tabular text-muted-foreground">{o.estimatedDelivery}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={o.status as any} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link href={`/client-dashboard/orders/${o.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-[#4A3B52] border border-[#4A3B52]/30 rounded-lg hover:bg-[#4A3B52]/10"><Eye className="w-3.5 h-3.5" /> View</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <PipelineView />
      )}
    </ClientLayout>
  );
}
