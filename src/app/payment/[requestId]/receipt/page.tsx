'use client';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockRequests } from '@/lib/mockData';
import { loadRfqLineItems } from '@/lib/rfqLineItems';
import {
  loadPaymentTimestamp,
  loadReceiptId,
  loadPaymentConfirmed,
} from '@/lib/paymentStore';
import type { RequestLineItem } from '@/lib/mockData';
import { CheckCircle2, Clock, Printer, ArrowLeft } from 'lucide-react';

function fmt(iso: string | null): string {
  if (!iso) return new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ReceiptPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const req = mockRequests.find(r => r.id === requestId);
  if (!req) return notFound();

  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setLineItems(loadRfqLineItems(req));
    setTimestamp(loadPaymentTimestamp(requestId));
    setReceiptId(loadReceiptId(requestId));
    setConfirmed(loadPaymentConfirmed(requestId));
  }, [requestId]);

  // Poll for admin confirmation (same browser session demo)
  useEffect(() => {
    if (confirmed) return;
    const id = setInterval(() => {
      const now = loadPaymentConfirmed(requestId);
      if (now) setConfirmed(true);
    }, 2000);
    return () => clearInterval(id);
  }, [requestId, confirmed]);

  const pricedItems = lineItems.filter(l => l.unitPriceInr != null);
  const total = pricedItems.reduce((sum, l) => sum + l.unitPriceInr! * l.quantity, 0);

  return (
    <>
      {/* Hide nav in print */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="min-h-screen bg-background py-6 px-4">
        {/* Back link — hidden on print */}
        <div className="no-print max-w-xl mx-auto mb-4">
          <Link
            href={`/client-dashboard/requests/${requestId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Request
          </Link>
        </div>

        {/* Receipt card */}
        <div className="max-w-xl mx-auto bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Header strip */}
          <div className="bg-[#4A3B52] px-6 py-5 text-white">
            <p className="text-xs font-600 uppercase tracking-widest opacity-80 mb-1">Payment Receipt</p>
            <p className="text-2xl font-700">{receiptId ?? 'BK-PAY-2026-XXXX'}</p>
            <p className="text-xs opacity-75 mt-1">Request: {req.requestId}</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Status banner */}
            {confirmed ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-700 text-emerald-800">Payment Confirmed — Order Placed</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your order is now being processed.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-700 text-amber-800">Payment Under Review</p>
                  <p className="text-xs text-amber-700 mt-0.5">Our team will verify and confirm your order shortly.</p>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Payment Submitted</p>
                <p className="font-600">{fmt(timestamp)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className={`font-600 ${confirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {confirmed ? 'Confirmed' : 'Under Review'}
                </p>
              </div>
            </div>

            {/* Products */}
            <div>
              <p className="text-xs font-600 uppercase text-muted-foreground tracking-wide mb-2">Products Ordered</p>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {lineItems.map(line => (
                  <div key={line.id} className="flex items-start justify-between gap-3 px-4 py-3 bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-500">{line.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {line.quantity}</p>
                      {line.specs && <p className="text-xs text-muted-foreground truncate">{line.specs}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {line.unitPriceInr != null ? (
                        <>
                          <p className="text-sm font-700 font-tabular">
                            ₹{(line.unitPriceInr * line.quantity).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{line.unitPriceInr.toLocaleString('en-IN')} / unit
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">TBD</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center border-t border-border pt-4">
              <span className="font-700 text-base">Total Paid</span>
              <span className="font-700 font-tabular text-2xl text-[#4A3B52]">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Footer note */}
            <p className="text-xs text-muted-foreground text-center">
              EliosWholesale Pvt Ltd • Keep this receipt for your records
            </p>
          </div>
        </div>

        {/* Download button — hidden on print */}
        <div className="no-print max-w-xl mx-auto mt-4">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-sm font-600 hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" /> Download Receipt
          </button>
        </div>
      </div>
    </>
  );
}
