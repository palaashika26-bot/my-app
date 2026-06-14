'use client';
import { useEffect, useState } from 'react';
import { ordersApi } from '@/lib/api/orders.api';
import { requestsApi } from '@/lib/api/requests.api';
import type { ApiOrder } from '@/lib/types/api.types';
import type { OrderStatus } from '@/components/ui/StatusBadge';

interface OrderRow {
  id: string;
  orderId: string;
  date: string;
  amount: string;
  amountCny: string;
  itemCount: number;
  status: OrderStatus;
  estimatedDelivery: string;
  itemNames: string;
}

interface RequestRow {
  id: string;
  requestId: string;
  date: string;
  items: number;
  itemNames: string;
  status: OrderStatus;
  totalBudget: string;
}

// ── Backend status → display status maps (kept in sync with the orders/requests
//    list pages so the dashboard shows the same labels) ───────────────────────
const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED: 'Payment Confirmed',
  ADVANCE_PAID: 'Payment Confirmed',
  FULLY_PAID: 'Payment Confirmed',
  SOURCING: 'Sourcing',
  QC_PENDING: 'At China Warehouse',
  QC_PASSED: 'At China Warehouse',
  QC_FAILED: 'Exception',
  REPACKING: 'Repacking Warehouse',
  SHIPPED: 'Shipped from China',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STAGE_ORDER = [
  'Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse',
  'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China',
  'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed',
];

export function deriveOrderStatus(o: ApiOrder): OrderStatus {
  const cs = o.completedStages;
  if (cs && cs.length > 0) {
    let maxIdx = -1;
    for (let i = 0; i < STAGE_ORDER.length; i++) {
      if (cs.includes(STAGE_ORDER[i])) maxIdx = i;
    }
    if (maxIdx >= 0) return STAGE_ORDER[maxIdx] as OrderStatus;
  }
  return (ORDER_STATUS_MAP[o.status] ?? 'Request Submitted') as OrderStatus;
}

export const REQUEST_STATUS_MAP: Record<string, OrderStatus> = {
  SUBMITTED: 'Request Submitted',
  REVIEWING: 'Quotation in Progress',
  QUOTED: 'Awaiting Approval',
  PARTIALLY_ACCEPTED: 'Awaiting Approval',
  ACCEPTED: 'Payment Pending',
  REJECTED: 'Cancelled',
  CANCELLED: 'Cancelled',
  CONVERTED: 'Completed',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export interface KpiStat {
  value: number;
  change: string;
}
export interface DashboardKpis {
  activeOrders: KpiStat;
  pendingPayments: KpiStat;
  awaitingApproval: KpiStat;
  completed: KpiStat;
}

const EMPTY_KPIS: DashboardKpis = {
  activeOrders: { value: 0, change: 'No active orders' },
  pendingPayments: { value: 0, change: 'All clear' },
  awaitingApproval: { value: 0, change: 'Nothing to review' },
  completed: { value: 0, change: '—' },
};

export interface DashboardData {
  orders: OrderRow[];
  requests: RequestRow[];
  kpis: DashboardKpis;
  loading: boolean;
}

// Fetches the signed-in client's real orders + requests once, maps them to the
// shapes the dashboard widgets render, and derives the KPI counts. On error (or
// for a brand-new client) everything resolves to empty/zero — never mock data.
export function useDashboardData(): DashboardData {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const withTimeout = <T>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);

    Promise.allSettled([
      withTimeout(ordersApi.getOrders({ limit: 100 }, ac.signal)),
      withTimeout(requestsApi.getRequests({ limit: 100 }, ac.signal)),
    ])
      .then(([ordersRes, requestsRes]) => {
        if (ac.signal.aborted) return;

        const apiOrders: ApiOrder[] =
          ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data ?? [] : [];
        apiOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const orderRows: OrderRow[] = apiOrders.map((o) => ({
          id: o.id,
          orderId: o.orderNumber,
          date: fmtDate(o.createdAt),
          amount: fmtINR(parseFloat(o.totalINR || '0')),
          amountCny: '',
          itemCount: o.items?.length ?? 0,
          status: deriveOrderStatus(o),
          estimatedDelivery: o.shipment?.estimatedDelivery
            ? new Date(o.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            : '—',
          itemNames: o.items?.map((i) => i.product?.name ?? i.notes ?? '—').join(', ') || '',
        }));

        const apiRequests: any[] =
          requestsRes.status === 'fulfilled' ? (requestsRes.value as any).data?.data ?? [] : [];
        apiRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const requestRows: RequestRow[] = apiRequests.map((r) => ({
          id: r.id,
          requestId: r.requestNumber,
          date: fmtDate(r.createdAt),
          items: r.items?.length ?? 0,
          itemNames: (r.items ?? []).map((i: any) => i.productName).join(', '),
          status: (REQUEST_STATUS_MAP[r.status] ?? 'Request Submitted') as OrderStatus,
          totalBudget: r.totalBudgetINR ? fmtINR(Number(r.totalBudgetINR)) : '—',
        }));

        // ── Derive KPIs from the real data ──
        const TERMINAL: OrderStatus[] = ['Completed', 'Cancelled', 'Exception'];
        const active = orderRows.filter((o) => !TERMINAL.includes(o.status));
        const paymentPending = apiOrders.filter((o) => o.status === 'PAYMENT_PENDING');
        const dueTotal = paymentPending.reduce((s, o) => s + parseFloat(o.totalINR || '0'), 0);
        const completedCount = orderRows.filter((o) => o.status === 'Completed').length;
        const awaiting = requestRows.filter((r) => r.status === 'Awaiting Approval').length;

        setOrders(orderRows);
        setRequests(requestRows);
        setKpis({
          activeOrders: {
            value: active.length,
            change: active.length > 0 ? `${active.length} in progress` : 'No active orders',
          },
          pendingPayments: {
            value: paymentPending.length,
            change: paymentPending.length > 0 ? `${fmtINR(dueTotal)} due` : 'All clear',
          },
          awaitingApproval: {
            value: awaiting,
            change: awaiting > 0 ? `${awaiting} quote${awaiting !== 1 ? 's' : ''} ready` : 'Nothing to review',
          },
          completed: {
            value: completedCount,
            change: completedCount > 0 ? `${completedCount} delivered` : '—',
          },
        });
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, []);

  return { orders, requests, kpis, loading };
}
