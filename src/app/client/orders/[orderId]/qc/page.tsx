'use client';

import React, { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { mockOrders } from '@/lib/mockData';
import { getOrderLineItems, resolveOrderFromParam } from '@/lib/orderLineItems';
import {
  getEffectiveOrderStatus,
  getOrderQcBundle,
  setClientProductDecision,
  subscribeOrderQc,
} from '@/lib/orderQcStore';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function ClientOrderQcPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId: orderParam } = use(params);
  const { addToast } = useToast();
  const { user } = useAuth();
  const [, bump] = useState(0);
  const force = useCallback(() => bump((x) => x + 1), []);

  useEffect(() => {
    return subscribeOrderQc(force);
  }, [force]);

  const order = useMemo(() => resolveOrderFromParam(orderParam, mockOrders), [orderParam]);
  const lineItems = useMemo(() => (order ? getOrderLineItems(order) : []), [order]);
  const productIds = useMemo(() => lineItems.map((l) => l.id), [lineItems]);

  const bundle = order ? getOrderQcBundle(order.id) : null;
  const effectiveStatus = order ? getEffectiveOrderStatus(order.id, order.status) : null;

  const [rejectText, setRejectText] = useState<Record<string, string>>({});

  if (!order) return notFound();
  const o = order;

  if (o.client && user?.name && o.client !== user.name) {
    return (
      <ClientLayout>
        <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
          <p className="text-sm font-600">Access denied</p>
          <p className="text-xs text-muted-foreground mt-2">This order belongs to another account.</p>
          <Link href="/client-dashboard/orders" className="inline-block mt-4 text-sm text-[#4A3B52] font-500">
            Back to orders
          </Link>
        </div>
      </ClientLayout>
    );
  }

  const anyRejected = productIds.some((pid) => bundle?.clientByProduct[pid]?.decision === 'rejected');
  const allApproved = productIds.length > 0 && productIds.every((pid) => bundle?.clientByProduct[pid]?.decision === 'approved');

  function approve(pid: string, productName: string) {
    if (anyRejected) return;
    setClientProductDecision(o.id, pid, 'approved', undefined, {
      productIds,
      displayOrderId: o.orderId,
      clientName: o.client ?? user?.name ?? 'Client',
      productName,
    });
    addToast({ type: 'success', title: 'Product approved', description: productName });
    force();
  }

  function reject(pid: string, productName: string) {
    if (anyRejected) return;
    const reason = rejectText[pid]?.trim();
    if (!reason) {
      addToast({ type: 'error', title: 'Reason required', description: 'Please explain why you are rejecting this product.' });
      return;
    }
    setClientProductDecision(o.id, pid, 'rejected', reason, {
      productIds,
      displayOrderId: o.orderId,
      clientName: o.client ?? user?.name ?? 'Client',
      productName,
    });
    addToast({
      type: 'warning',
      title: 'Product rejected',
      description: 'Order status is now Return from China. Our team has been notified.',
    });
    force();
  }

  return (
    <ClientLayout>
      <Link
        href={`/client-dashboard/orders/${o.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to order
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <p className="text-xs text-muted-foreground font-500 uppercase tracking-wide">Client Repacking Warehouse review</p>
        <h1 className="text-xl font-800 font-tabular mt-1">{o.orderId}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={effectiveStatus as any} size="md" />
        </div>
      </div>

      {!bundle?.submittedForClient && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6 text-sm text-muted-foreground">
          Warehouse has not submitted Repacking Warehouse photos for your approval yet. Please check back later.
        </div>
      )}

      {bundle?.submittedForClient && anyRejected && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 mb-6 text-sm">
          <p className="font-600">This order was rejected on Repacking Warehouse</p>
          <p className="text-xs mt-1 opacity-90">Status: Return from China. Our admin team has been notified.</p>
        </div>
      )}

      {bundle?.submittedForClient && allApproved && effectiveStatus === 'Ready for Logistics' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 mb-6 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-600">All products approved</p>
            <p className="text-xs mt-1">Your order is now Ready for Logistics.</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {lineItems.map((line) => {
          const d = bundle?.drafts[line.id];
          const decision = bundle?.clientByProduct[line.id]?.decision ?? 'pending';
          const rejectReason = bundle?.clientByProduct[line.id]?.rejectReason;

          return (
            <div key={line.id} className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-700">{line.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {line.quantity}</p>
                </div>
                {decision === 'approved' && (
                  <span className="text-xs font-600 text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                )}
                {decision === 'rejected' && (
                  <span className="text-xs font-600 text-rose-700 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Rejected
                  </span>
                )}
              </div>

              {!bundle?.submittedForClient ? null : (
                <>
                  <PhotoBlock title="Product photos" images={d?.product ?? []} />
                  <PhotoBlock title="Packaging photos" images={d?.packaging ?? []} />
                  {(d?.damage?.length ?? 0) > 0 && <PhotoBlock title="Damage / defect photos" images={d?.damage ?? []} />}

                  {decision === 'rejected' && rejectReason && (
                    <p className="text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-lg p-3 mt-3">
                      <span className="font-600">Your reason: </span>
                      {rejectReason}
                    </p>
                  )}

                  {bundle.submittedForClient && !anyRejected && decision === 'pending' && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <label className="block text-xs font-600 text-muted-foreground">Rejection reason (required if you reject)</label>
                      <textarea
                        value={rejectText[line.id] ?? ''}
                        onChange={(e) => setRejectText((prev) => ({ ...prev, [line.id]: e.target.value }))}
                        rows={2}
                        placeholder="Explain issues, wrong item, damage, etc."
                        className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-[#4A3B52]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5"
                          onClick={() => approve(line.id, line.name)}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button
                          type="button"
                          className="btn-secondary px-4 py-2 text-sm text-rose-700 border-rose-200 hover:bg-rose-50 inline-flex items-center gap-1.5"
                          onClick={() => reject(line.id, line.name)}
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </ClientLayout>
  );
}

function PhotoBlock({ title, images }: { title: string; images: { id: string; dataUrl: string; fileName: string }[] }) {
  if (!images.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-600 text-muted-foreground mb-2">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {images.map((img) => (
          <li key={img.id} className="w-24 h-24 rounded-md overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.dataUrl} alt={img.fileName} className="w-full h-full object-cover" title={img.fileName} />
          </li>
        ))}
      </ul>
    </div>
  );
}
