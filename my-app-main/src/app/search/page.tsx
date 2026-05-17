'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockOrders, mockRequests } from '@/lib/mockData';

function SearchResults() {
  const params = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();
  const orders = q ? mockOrders.filter(o => o.orderId.toLowerCase().includes(q) || (o.itemNames || '').toLowerCase().includes(q)) : [];
  const requests = q ? mockRequests.filter(r => r.requestId.toLowerCase().includes(q) || r.itemNames.toLowerCase().includes(q)) : [];

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Search Results</h1>
      <p className="text-sm text-muted-foreground mb-5">Showing results for &quot;<span className="font-semibold text-foreground">{q}</span>&quot;</p>
      <div className="space-y-6">
        <div>
          <h3 className="font-bold mb-2">Orders ({orders.length})</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {orders.map(o => (
                <Link key={o.id} href={`/client-dashboard/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40">
                  <div>
                    <p className="font-tabular font-semibold">{o.orderId}</p>
                    <p className="text-xs text-muted-foreground">{o.itemNames}</p>
                  </div>
                  <StatusBadge status={o.status as any} />
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold mb-2">Requests ({requests.length})</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests found.</p>
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {requests.map(r => (
                <Link key={r.id} href={`/client-dashboard/requests/${r.id}`} className="flex items-center justify-between p-4 hover:bg-muted/40">
                  <div>
                    <p className="font-tabular font-semibold">{r.requestId}</p>
                    <p className="text-xs text-muted-foreground">{r.itemNames}</p>
                  </div>
                  <StatusBadge status={r.status as any} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <ClientShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <SearchResults />
      </Suspense>
    </ClientShell>
  );
}
