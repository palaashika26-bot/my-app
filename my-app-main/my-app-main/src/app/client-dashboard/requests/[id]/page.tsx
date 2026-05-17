'use client';
import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests } from '@/lib/mockData';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { defaultLineItemsFromRequest, loadRfqLineItems, persistRfqLineItems } from '@/lib/rfqLineItems';
import { loadPaymentProof, loadPaymentConfirmed } from '@/lib/paymentStore';
import { ArrowLeft, Check, MessageSquare, CheckCircle2, Circle, ImageIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

const CNY_TO_INR = 11.5;

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
  const router = useRouter();
  const { addToast } = useToast();
  const [lineItems, setLineItems] = useState<RequestLineItem[]>(() =>
    req ? defaultLineItemsFromRequest(req) : []
  );
  const [activeCounterInput, setActiveCounterInput] = useState<string | null>(null);
  const [counterInputValues, setCounterInputValues] = useState<Record<string, string>>({});
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
    const row = mockRequests.find(r => r.id === id);
    if (!row) return;
    setLineItems(loadRfqLineItems(row));
    setPaymentSubmitted(!!loadPaymentProof(id));
    setOrderConfirmed(loadPaymentConfirmed(id));
  }, [id]);

  // Poll for admin confirmation so timeline updates in the same session
  useEffect(() => {
    if (orderConfirmed) return;
    const interval = setInterval(() => {
      if (loadPaymentConfirmed(id)) setOrderConfirmed(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [id, orderConfirmed]);

  if (!req) return notFound();

  // completedUpTo: highest stage index fully completed (green).
  // Stage at completedUpTo+1 is the current active stage (orange).
  const completedUpTo = (() => {
    if (orderConfirmed) return 4;      // all 5 stages done
    if (paymentSubmitted) return 3;    // stages 0-3 done, stage 4 = Order Confirmed is active
    const s = req.status as string;
    if (['Request Submitted'].includes(s)) return 0;
    if (['Quotation in Progress'].includes(s)) return 0;
    if (['Awaiting Approval'].includes(s)) return 1;
    if (['Payment Pending'].includes(s)) return 2;
    return 3;
  })();

  const showQuote = completedUpTo >= 1;

  function persist(next: RequestLineItem[]) {
    setLineItems(next);
    persistRfqLineItems(id, next);
  }

  function acceptLine(lineId: string) {
    if (!window.confirm('Accept this quotation? You will be taken to the payment page.')) return;
    persist(
      lineItems.map(l =>
        l.id === lineId ? { ...l, status: 'Accepted' as const, revisionRequested: false } : l
      )
    );
    router.push(`/payment/${id}`);
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

  function submitCounter(lineId: string) {
    const raw = counterInputValues[lineId] ?? '';
    let proposed: number | undefined;
    if (raw.trim() !== '') {
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
    setActiveCounterInput(null);
    setCounterInputValues(prev => { const next = { ...prev }; delete next[lineId]; return next; });
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
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600 w-12">Image</th>
                    <th className="py-2 text-left font-600 pl-3">Item</th>
                    <th className="text-right font-600">Qty</th>
                    <th className="text-left font-600 pl-3">Specs / Notes</th>
                    {showQuote && <th className="text-right font-600">Price (INR / CNY)</th>}
                    {showQuote && <th className="text-right font-600 pl-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map(line => {
                    const canRespond = showQuote && line.status === 'Quoted';
                    const isCountering = activeCounterInput === line.id;
                    return (
                      <tr key={line.id}>
                        <td className="py-3 align-middle">
                          {line.imageUrl ? (
                            <img src={line.imageUrl} alt={line.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-500 pl-3">
                          <div>{line.name}</div>
                          {showQuote && (
                            <div className="mt-0.5 flex flex-col gap-0.5">
                              <ClientStatusPill status={line.status} revisionRequested={line.revisionRequested} />
                              {line.status === 'Pending' && line.revisionRequested && (
                                <span className="text-[10px] text-muted-foreground">Awaiting revised quote</span>
                              )}
                              {line.clientProposedInr != null && line.revisionRequested && (
                                <span className="text-[10px] text-muted-foreground">
                                  Your offer: ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-right font-tabular align-top py-3">{line.quantity}</td>
                        <td className="pl-3 text-xs text-muted-foreground align-top py-3">{line.specs}</td>
                        {showQuote && (
                          <td className="text-right align-top py-3">
                            {line.unitPriceInr != null ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-tabular font-500">₹{line.unitPriceInr.toLocaleString('en-IN')}</span>
                                <span className="font-tabular text-muted-foreground text-[11px]">
                                  ≈ ¥{(line.unitPriceInr / CNY_TO_INR).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70">¥1 = ₹{CNY_TO_INR.toFixed(2)}</span>
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {showQuote && (
                          <td className="text-right align-top py-3 pl-3">
                            {canRespond ? (
                              <div className="flex flex-col gap-1 items-end">
                                {isCountering ? (
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="number"
                                      min="1"
                                      className="input-field text-xs py-1 px-2 w-24"
                                      placeholder="₹ price"
                                      value={counterInputValues[line.id] ?? ''}
                                      onChange={e => setCounterInputValues(prev => ({ ...prev, [line.id]: e.target.value }))}
                                      onKeyDown={e => { if (e.key === 'Enter') submitCounter(line.id); if (e.key === 'Escape') setActiveCounterInput(null); }}
                                      autoFocus
                                    />
                                    <button type="button" onClick={() => submitCounter(line.id)} className="btn-primary px-2 py-1 text-xs">Send</button>
                                    <button type="button" onClick={() => setActiveCounterInput(null)} className="btn-secondary px-2 py-1 text-xs">✕</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-end">
                                    <button type="button" onClick={() => acceptLine(line.id)} className="btn-primary px-2 py-1 text-xs inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Accept
                                    </button>
                                    <button type="button" onClick={() => rejectLine(line.id)} className="btn-secondary px-2 py-1 text-xs">
                                      Reject
                                    </button>
                                    <button type="button" onClick={() => setActiveCounterInput(line.id)} className="btn-secondary px-2 py-1 text-xs">
                                      Counter Offer
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
              const done    = i <= completedUpTo;
              const current = i === completedUpTo + 1;
              return (
                <li key={s} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done    ? 'bg-emerald-500 text-white' :
                    current ? 'bg-accent text-white animate-pulse' :
                              'bg-muted text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <p className={`text-sm pt-0.5 ${
                    done    ? 'font-500 text-foreground' :
                    current ? 'font-700 text-accent' :
                              'font-500 text-muted-foreground'
                  }`}>{s}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </ClientShell>
  );
}
