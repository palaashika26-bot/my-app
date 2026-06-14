'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge, { type OrderStatus } from '@/components/ui/StatusBadge';
import { ordersApi } from '@/lib/api/orders.api';
import { requestsApi } from '@/lib/api/requests.api';
import { deriveOrderStatus, REQUEST_STATUS_MAP } from '@/app/client-dashboard/useDashboardData';

interface OrderResult { id: string; orderId: string; itemNames: string; status: OrderStatus }
interface RequestResult { id: string; requestId: string; itemNames: string; status: OrderStatus }

function SearchResults() {
  const params = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();

  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [requests, setRequests] = useState<RequestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      ordersApi.getOrders({ limit: 100 }),
      requestsApi.getRequests({ limit: 100 }),
    ]).then(([ordersRes, requestsRes]) => {
      if (cancelled) return;
      const apiOrders = ordersRes.status === 'fulfilled' ? (ordersRes.value as any).data?.data ?? [] : [];
      const apiRequests = requestsRes.status === 'fulfilled' ? (requestsRes.value as any).data?.data ?? [] : [];
      setOrders(apiOrders.map((o: any) => ({
        id: o.id,
        orderId: o.orderNumber,
        itemNames: (o.items ?? []).map((i: any) => i.product?.name ?? i.notes ?? '').filter(Boolean).join(', '),
        status: deriveOrderStatus(o),
      })));
      setRequests(apiRequests.map((r: any) => ({
        id: r.id,
        requestId: r.requestNumber,
        itemNames: (r.items ?? []).map((i: any) => i.productName).filter(Boolean).join(', '),
        status: (REQUEST_STATUS_MAP[r.status] ?? 'Request Submitted') as OrderStatus,
      })));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredOrders = useMemo(
    () => (q ? orders.filter(o => o.orderId.toLowerCase().includes(q) || o.itemNames.toLowerCase().includes(q)) : []),
    [orders, q],
  );
  const filteredRequests = useMemo(
    () => (q ? requests.filter(r => r.requestId.toLowerCase().includes(q) || r.itemNames.toLowerCase().includes(q)) : []),
    [requests, q],
  );

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Search Results</h1>
      <p className="text-sm text-muted-foreground mb-5">Showing results for &quot;<span className="font-semibold text-foreground">{q}</span>&quot;</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">Orders ({filteredOrders.length})</h3>
            {filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            ) : (
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {filteredOrders.map(o => (
                  <Link key={o.id} href={`/client-dashboard/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40">
                    <div>
                      <p className="font-tabular font-semibold">{o.orderId}</p>
                      <p className="text-xs text-muted-foreground">{o.itemNames}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold mb-2">Requests ({filteredRequests.length})</h3>
            {filteredRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests found.</p>
            ) : (
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {filteredRequests.map(r => (
                  <Link key={r.id} href={`/client-dashboard/requests/${r.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40">
                    <div>
                      <p className="font-tabular font-semibold">{r.requestId}</p>
                      <p className="text-xs text-muted-foreground">{r.itemNames}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <ClientLayout>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <SearchResults />
      </Suspense>
    </ClientLayout>
  );
}
