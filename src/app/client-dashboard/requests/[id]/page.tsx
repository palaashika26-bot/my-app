'use client';
import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests } from '@/lib/mockData';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { defaultLineItemsFromRequest, loadRfqLineItems, persistRfqLineItems } from '@/lib/rfqLineItems';
import { ArrowLeft, Check, MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

const stages = ['Request Submitted', 'Quotation in Progress', 'Awaiting Approval', 'Payment Pending', 'Order Confirmed'];

function clientStatusLabel(s: PerProductQuoteStatus, revisionRequested?: boolean) {
  if (s === 'Pending' && revisionRequested) return 'Pending';
  return s;
}

function ClientStatusPill({ status, revisionRequested }: { status: PerProductQuoteStatus; revisionRequested?: boolean }) {
  const base = 'text-[10px] font-600 px-2 py-0.5 rounded';
  const map: Record<PerProductQuoteStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Quoted: 'bg-sky-100 text-sky-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`${base} ${map[status]}`}>
      {clientStatusLabel(status, revisionRequested)}
      {revisionRequested && <span className="sr-only"> revision requested</span>}
    </span>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const req = mockRequests.find(r => r.id === id);
  const { addToast } = useToast();
  const [lineItems, setLineItems] = useState<RequestLineItem[]>(() =>
    req ? defaultLineItemsFromRequest(req) : []
  );

  useEffect(() => {
    const row = mockRequests.find(r => r.id === id);
    if (!row) return;
    setLineItems(loadRfqLineItems(row));
  }, [id]);

  if (!req) return notFound();

  const currentStage = (() => {
    const s = req.status as string;
    if (['Request Submitted'].includes(s)) return 0;
    if (['Quotation in Progress'].includes(s)) return 1;
    if (['Awaiting Approval'].includes(s)) return 2;
    if (['Payment Pending'].includes(s)) return 3;
    return 4;
  })();

  const showQuote = currentStage >= 1;

  function persist(next: RequestLineItem[]) {
    setLineItems(next);
    persistRfqLineItems(id, next);
  }

  function acceptLine(lineId: string) {
    persist(
      lineItems.map(l =>
        l.id === lineId ? { ...l, status: 'Accepted' as const, revisionRequested: false } : l
      )
    );
    addToast({ type: 'success', title: 'Line accepted', description: 'We will proceed with this product at the quoted price.' });
  }

  function rejectLine(lineId: string) {
    if (!window.confirm('Reject the quotation for this product?')) return;
    persist(
      lineItems.map(l =>
        l.id === lineId ? { ...l, status: 'Rejected' as const, revisionRequested: false } : l
      )
    );
    addToast({ type: 'warning', title: 'Line rejected', description: 'Your team has been notified for this product.' });
  }

  function counterLine(lineId: string) {
    const raw = window.prompt('Optional: target unit price in INR (leave blank if you only want to negotiate)', '');
    let proposed: number | undefined;
    if (raw != null && raw.trim() !== '') {
      const n = parseFloat(raw.replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0) proposed = Math.round(n);
    }
    persist(
      lineItems.map(l =>
        l.id === lineId
          ? {
              ...l,
              status: 'Pending' as const,
              revisionRequested: true,
              clientProposedInr: proposed,
            }
          : l
      )
    );
    addToast({
      type: 'info',
      title: 'Counter-offer sent',
      description: 'Our team can revise the unit price and send an updated quotation for this product.',
    });
  }

  return (
    <ClientShell>
      <Link href="/client-dashboard/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-tabular font-700">{req.requestId}</span>
          <StatusBadge status={req.status as never} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Submitted: {req.date} • Budget: {req.totalBudget}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {req.imageAttached && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-700 mb-3">Photo-Scan Submission</h3>
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-xl bg-muted flex items-center justify-center text-4xl">📷</div>
                <div className="flex-1">
                  <p className="text-sm">
                    AI Detected: <span className="font-600">{req.detectedProduct}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{req.confidence}% confidence match</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Items requested</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600">Product</th>
                    <th className="text-right font-600">Qty</th>
                    <th className="text-left font-600 pl-3">Specs / notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map(line => (
                    <tr key={line.id}>
                      <td className="py-3 font-500">{line.name}</td>
                      <td className="text-right font-tabular">{line.quantity}</td>
                      <td className="pl-3 text-xs text-muted-foreground">{line.specs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showQuote && (
            <div className="bg-card rounded-xl border-2 border-accent/30 shadow-card p-5 bg-gradient-to-br from-orange-50/40 to-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-700">Per-product quotations</h3>
                <span className="text-[10px] font-600 bg-orange-100 text-orange-700 px-2 py-1 rounded">Valid till 18 May 2026</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Each product has its own unit price and status. You can accept, reject, or counter-offer per line.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                      <th className="py-2 text-left font-600">Product</th>
                      <th className="text-right font-600">Qty</th>
                      <th className="text-right font-600">Unit ₹</th>
                      <th className="text-right font-600">Total ₹</th>
                      <th className="text-left font-600 pl-2">Status</th>
                      <th className="text-right font-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map(line => {
                      const totalInr =
                        line.unitPriceInr != null && line.unitPriceInr > 0 ? line.quantity * line.unitPriceInr : null;
                      const canRespond = line.status === 'Quoted';
                      return (
                        <tr key={`q-${line.id}`}>
                          <td className="py-3 font-500">{line.name}</td>
                          <td className="text-right font-tabular">{line.quantity}</td>
                          <td className="text-right font-tabular">
                            {line.unitPriceInr != null ? `₹${line.unitPriceInr.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="text-right font-tabular">{totalInr != null ? `₹${totalInr.toLocaleString('en-IN')}` : '—'}</td>
                          <td className="pl-2 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <ClientStatusPill status={line.status} revisionRequested={line.revisionRequested} />
                              {line.status === 'Pending' && line.revisionRequested && (
                                <span className="text-[10px] text-muted-foreground">Awaiting revised quote</span>
                              )}
                              {line.clientProposedInr != null && line.revisionRequested && (
                                <span className="text-[10px] text-muted-foreground">
                                  Your note: ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right align-middle">
                            {canRespond ? (
                              <div className="flex flex-col sm:flex-row gap-1 justify-end">
                                <button type="button" onClick={() => acceptLine(line.id)} className="btn-primary px-2 py-1 text-xs inline-flex items-center justify-center gap-1">
                                  <Check className="w-3 h-3" /> Accept
                                </button>
                                <button type="button" onClick={() => rejectLine(line.id)} className="btn-secondary px-2 py-1 text-xs">
                                  Reject
                                </button>
                                <button type="button" onClick={() => counterLine(line.id)} className="btn-secondary px-2 py-1 text-xs">
                                  Counter-offer
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Conversation</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-700">AS</div>
                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-600">Arjun (Admin)</p>
                  <p className="text-sm mt-1">
                    We&apos;ve sourced this from 3 suppliers in Yiwu. Best price attached above. Lead time: 12–15 days.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-700">RK</div>
                <div className="flex-1 bg-orange-50/40 rounded-lg p-3">
                  <p className="text-xs font-600">You</p>
                  <p className="text-sm mt-1">Can we get a sample first before placing the bulk order?</p>
                  <p className="text-[10px] text-muted-foreground mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <input className="input-field flex-1" placeholder="Type a message..." />
              <button className="btn-primary px-4 inline-flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5 h-fit">
          <h3 className="text-sm font-700 mb-4">Request Timeline</h3>
          <ol className="space-y-3">
            {stages.map((s, i) => {
              const done = i <= currentStage;
              const current = i === currentStage;
              return (
                <li key={s} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : current ? 'bg-accent text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <p className={`text-sm ${current ? 'font-700 text-accent' : done ? 'font-500' : 'font-500 text-muted-foreground'}`}>{s}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </ClientShell>
  );
}
