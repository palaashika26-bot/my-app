'use client';
import React, { useState, use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { requestsApi } from '@/lib/api/requests.api';
import { requestsCache } from '@/lib/api/requestsCache';
import { paymentsApi } from '@/lib/api/payments.api';
import { ArrowLeft, Check, MessageSquare, CheckCircle2, Circle, X, ImageIcon, Ban } from 'lucide-react';

type PerProductQuoteStatus = 'Pending' | 'Quoted' | 'Accepted' | 'Rejected';

interface RequestLineItem {
  id: string;
  name: string;
  quantity: number;
  specs?: string;
  imageUrl?: string;
  referenceImageUrls?: string[];
  targetPriceINR?: number;
  rmbCostPerUnit: number;
  unitPriceCny?: number;
  unitPriceInr?: number;
  status: PerProductQuoteStatus;
  revisionRequested?: boolean;
  clientProposedInr?: number;
  clientResponse?: string;
  counterPriceINR?: number;
  counterNote?: string;
}
import { useToast } from '@/components/ui/Toast';
import { useExchangeRate } from '@/lib/useExchangeRate';

const stages =['Request Submitted', 'Quotation in Progress', 'Awaiting Approval', 'Payment Pending', 'Order Confirmed'];

function ClientStatusPill({ status }: { status: PerProductQuoteStatus }) {
  const base = 'text-[10px] font-600 px-2 py-0.5 rounded';
  const map: Record<PerProductQuoteStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Quoted: 'bg-sky-100 text-sky-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  return <span className={`${base} ${map[status]}`}>{status}</span>;
}

function ResponseBadge({ response }: { response: string }) {
  const map: Record<string, string> = {
    ACCEPTED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    COUNTERED: 'bg-amber-100 text-amber-800',
  };
  const label: Record<string, string> = { ACCEPTED: '✅ Accepted', REJECTED: '❌ Rejected', COUNTERED: '💬 Counter Sent' };
  return (
    <span className={`text-[10px] font-600 px-2 py-0.5 rounded ${map[response] ?? 'bg-muted text-muted-foreground'}`}>
      {label[response] ?? response}
    </span>
  );
}

function statusToCompletedUpTo(status: string): number {
  if (['CONVERTED', 'Completed'].includes(status)) return 4;
  if (['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(status)) return 2;
  if (['QUOTED', 'REVIEWING', 'Awaiting Approval'].includes(status)) return 1;
  return 0;
}

function mapItemStatus(apiStatus: string): PerProductQuoteStatus {
  if (apiStatus === 'QUOTED') return 'Quoted';
  if (apiStatus === 'ACCEPTED') return 'Accepted';
  if (apiStatus === 'REJECTED') return 'Rejected';
  return 'Pending';
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const CNY_TO_INR = useExchangeRate();

  const [apiRequest, setApiRequest] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);

  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);

  // Response state per item
  const [itemResponses, setItemResponses] = useState<Record<string, 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | null>>({});
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>({});
  const [counterNotes, setCounterNotes] = useState<Record<string, string>>({});
  const [activeCounterForm, setActiveCounterForm] = useState<string | null>(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responsesSubmitted, setResponsesSubmitted] = useState(false);
  const [autoCreatedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const [requestPayments, setRequestPayments] = useState<any[]>([]);
  const [logistics, setLogistics] = useState<null | { weight: string; mode: string; pricePerKg: string; note: string }>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Cancel request state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelledLocally, setCancelledLocally] = useState(false);

  const [reqChatInput, setReqChatInput] = useState('');
  const lastReqSent = React.useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; senderRole: string; text: string; createdAt: string }[]>([]);
  // Empty so the first poll fetches the full history (no `since` param). It is
  // then advanced to the newest message's ISO timestamp so later polls only
  // pull new messages. (Was Date.now() millis, which both 500'd the API and
  // skipped all existing messages on open.)
  const [lastMsgSeen, setLastMsgSeen] = useState('');

  function applyApiRequest(req: any) {
    setApiRequest(req);
    // Hydrate the persisted Stage 2 logistics estimate (replaces localStorage).
    if (req.logisticsWeight != null || req.logisticsMode != null || req.logisticsPricePerKg != null || req.logisticsNote != null) {
      setLogistics({
        weight: req.logisticsWeight ?? '',
        mode: req.logisticsMode ?? '',
        pricePerKg: req.logisticsPricePerKg != null ? String(req.logisticsPricePerKg) : '',
        note: req.logisticsNote ?? '',
      });
    }
    const apiLineItems: RequestLineItem[] = (req.items ?? []).map((item: any) => ({
      id: item.id,
      name: item.productName,
      specs: item.productDescription ?? '',
      quantity: item.quantity,
      rmbCostPerUnit: item.quotedRMB ? parseFloat(item.quotedRMB) : 0,
      unitPriceCny: item.quotedRMB ? parseFloat(item.quotedRMB) : undefined,
      unitPriceInr: item.quotedINR ? parseFloat(item.quotedINR) : undefined,
      status: mapItemStatus(item.status),
      revisionRequested: false,
      imageUrl: item.imageUrl ?? undefined,
      referenceImageUrls: item.referenceImageUrls ?? [],
      targetPriceINR: item.targetPriceINR ? parseFloat(item.targetPriceINR) : undefined,
      clientResponse: item.clientResponse ?? undefined,
      counterPriceINR: item.counterPriceINR ? parseFloat(item.counterPriceINR) : undefined,
      counterNote: item.counterNote ?? undefined,
    }));
    setLineItems(apiLineItems);

    const existingResponses: Record<string, any> = {};
    for (const item of req.items ?? []) {
      if (item.clientResponse) existingResponses[item.id] = item.clientResponse;
    }
    if (Object.keys(existingResponses).length > 0) {
      setItemResponses(existingResponses);
      setResponsesSubmitted(true);
    }
  }

  function fetchRequestData(signal?: AbortSignal) {
    // 120s, matching uploadClient: the request payload inlines each item's base64
    // referenceImageUrls and can be large. The old 5s race always lost that race,
    // so live data was silently dropped and the page only ever showed cache.
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 120000));
    return Promise.race([
      requestsApi.getRequestById(id, signal),
      timeout,
    ])
      .then((r: any) => {
        if (signal?.aborted) return;
        const req = r.data?.data;
        if (req) {
          requestsCache.set(id, req);
          applyApiRequest(req);
        }
      })
      .catch(() => {});
  }

  function fetchPayments(signal?: AbortSignal) {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    Promise.race([
      paymentsApi.getRequestPayments(id),
      timeout,
    ])
      .then((r: any) => { if (signal?.aborted) return; setRequestPayments(r.data?.data ?? []); })
      .catch(() => {});
  }

  // Cache-first: show cached data instantly, then poll every 30s + on focus
  useEffect(() => {
    const abortController = new AbortController();

    // Try cache first for instant render
    const cached = requestsCache.get<any>(id);
    if (cached) {
      applyApiRequest(cached);
      setApiLoading(false);
    } else {
      setApiLoading(true);
    }

    // Initial background fetch
    Promise.allSettled([
      fetchRequestData(abortController.signal),
      fetchPayments(abortController.signal),
    ]).finally(() => {
      if (!abortController.signal.aborted && !cached) setApiLoading(false);
    });

    // Poll every 30s for fresh data (catches status changes from admin)
    const interval = setInterval(() => {
      fetchRequestData(abortController.signal);
      fetchPayments(abortController.signal);
    }, 30000);

    // Re-fetch on window focus (user switching back to this tab)
    const onFocus = () => {
      fetchRequestData(abortController.signal);
      fetchPayments(abortController.signal);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      abortController.abort();
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [id]);

  async function sendReqMessage() {
    const now = Date.now();
    if (now - lastReqSent.current < 2000) { alert('Please wait before sending again.'); return; }
    const sanitized = reqChatInput.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized || !apiRequest) return;
    lastReqSent.current = now;
    setReqChatInput('');
    try {
      await requestsApi.sendMessage(id, sanitized);
      await fetchMessages();
    } catch { addToast({ type: 'error', title: 'Failed to send message' }); }
  }

  async function fetchMessages() {
    try {
      const res = await requestsApi.getMessages(id, lastMsgSeen);
      const newMsgs = res.data?.data ?? [];
      if (newMsgs.length > 0) {
        setChatMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const unique = newMsgs.filter((m: any) => !existing.has(m.id));
          if (unique.length > 0) {
            const adminMsgs = unique.filter((m: any) => m.senderRole === 'ADMIN' || m.senderRole === 'STAFF');
            if (adminMsgs.length > 0 && prev.length > 0) {
              addToast({ type: 'info', title: `New message from team`, description: adminMsgs[adminMsgs.length - 1].text.slice(0, 100) });
            }
          }
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
        const last = newMsgs[newMsgs.length - 1];
        setLastMsgSeen(last.createdAt);
      }
    } catch { /* silent */ }
  }

  // Scroll to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Poll messages every 8 seconds
  useEffect(() => {
    if (!apiRequest) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [apiRequest, id]);

  const displayStatus = cancelledLocally ? 'CANCELLED' : (apiRequest?.status ?? 'SUBMITTED');
  const displayRequestId = apiRequest?.requestNumber ?? id;
  const displayDate = apiRequest
    ? new Date(apiRequest.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const displayBudget = apiRequest?.totalBudgetINR
    ? `₹${Number(apiRequest.totalBudgetINR).toLocaleString('en-IN')}`
    : '—';

  // Payment / order status derived from API data (not sessionStorage)
  const latestPaymentStatus: string | null = requestPayments[0]?.status ?? null;
  const paymentSubmitted = latestPaymentStatus === 'SUBMITTED';
  const orderConfirmed = latestPaymentStatus === 'VERIFIED' || displayStatus === 'CONVERTED';

  const completedUpTo = (() => {
    if (orderConfirmed) return 4;
    if (paymentSubmitted) return 3;
    return statusToCompletedUpTo(displayStatus);
  })();

  const showQuote = completedUpTo >= 1;

  // Determine if client can respond (QUOTED or REVIEWING status)
  const canRespond = ['QUOTED', 'REVIEWING'].includes(displayStatus) && !responsesSubmitted;
  const alreadyResponded = responsesSubmitted || ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REVIEWING'].includes(displayStatus);

  // Response counts
  const quotedItems = lineItems.filter(l => l.unitPriceInr != null);
  const respondedItems = Object.entries(itemResponses).filter(([, v]) => v != null);
  const acceptedItems = respondedItems.filter(([, v]) => v === 'ACCEPTED');
  const rejectedItems = respondedItems.filter(([, v]) => v === 'REJECTED');
  const counteredItems = respondedItems.filter(([, v]) => v === 'COUNTERED');

  const allQuotedResponded = quotedItems.length > 0 && respondedItems.length >= quotedItems.length;
  const allAccepted = allQuotedResponded && acceptedItems.length === quotedItems.length;
  const hasCounters = counteredItems.length > 0;
  const hasMix = acceptedItems.length > 0 && rejectedItems.length > 0 && counteredItems.length === 0;

  function setResponse(itemId: string, response: 'ACCEPTED' | 'REJECTED' | 'COUNTERED') {
    setItemResponses(prev => ({ ...prev, [itemId]: response }));
    if (response !== 'COUNTERED') {
      setActiveCounterForm(null);
    }
  }

  function handleProceedToPayment() {
    if (displayStatus === 'CONVERTED') {
      router.push('/client-dashboard/orders');
      return;
    }
    // Navigate to payment page with request ID — order is created after payment verified
    router.push(`/payment/${id}`);
  }

  async function submitResponses() {
    const items = Object.entries(itemResponses)
      .filter(([, v]) => v != null)
      .map(([itemId, response]) => ({
        id: itemId,
        response: response!,
        counterPriceINR: response === 'COUNTERED' ? (parseFloat(counterInputs[itemId] ?? '') || undefined) : undefined,
        counterNote: response === 'COUNTERED' ? (counterNotes[itemId]?.trim() || undefined) : undefined,
      }));

    if (!items.length) {
      addToast({ type: 'warning', title: 'No responses', description: 'Please respond to at least one item.' });
      return;
    }

    if (!apiRequest) {
      addToast({ type: 'error', title: 'Cannot submit', description: 'Request data not loaded yet. Please wait and try again.' });
      return;
    }

    setSubmittingResponse(true);
    try {
      await Promise.race([
        requestsApi.respondToQuotation(id, items),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
      ]);
      setResponsesSubmitted(true);
      fetchRequestData();
      addToast({ type: 'success', title: 'Responses submitted', description: 'Please proceed to payment to confirm your order.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to submit', description: err?.message || err?.response?.data?.message || 'Please try again.' });
    } finally {
      setSubmittingResponse(false);
    }
  }

  // Cancel request handler
  async function handleCancelRequest() {
    if (cancelSubmitting) return;
    setCancelSubmitting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('elios_access_token') ?? '' : '';
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancelReason: cancelReason.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelOpen(false);
        setCancelReason('');
        setCancelledLocally(true);
        addToast({ type: 'success', title: 'Request cancelled', description: 'Your request has been cancelled.' });
      } else {
        addToast({ type: 'error', title: 'Could not cancel', description: data.message ?? 'Please try again.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error', description: 'Please check your connection and try again.' });
    } finally {
      setCancelSubmitting(false);
    }
  }

  // Check if a line item already has a server-side response
  function getItemServerResponse(line: RequestLineItem): string | undefined {
    return line.clientResponse;
  }

  // Summary totals
  const acceptedTotal = quotedItems
    .filter(l => itemResponses[l.id] === 'ACCEPTED' || getItemServerResponse(l) === 'ACCEPTED')
    .reduce((sum, l) => sum + (l.unitPriceInr ?? 0) * l.quantity, 0);

  if (apiLoading && !apiRequest) {
    return (
      <ClientLayout>
        <div className="animate-pulse space-y-4 pb-10">
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="h-5 bg-muted rounded w-44 mb-2" />
            <div className="h-4 bg-muted rounded w-60" />
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded mb-2" />)}
              </div>
            </div>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Reference" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X className="w-5 h-5" /></button>
        </div>
      )}
      <div className="px-0 sm:px-0">
      <Link href="/client-dashboard/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-tabular font-700">{displayRequestId}</span>
          <StatusBadge status={displayStatus as never} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Submitted: {displayDate} • Budget: {displayBudget}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">

          <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-5">
            <h3 className="text-sm font-700 mb-3">Items requested</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600 w-12">Image</th>
                    <th className="py-2 text-left font-600 pl-3">Item</th>
                    <th className="text-right font-600 w-10">Qty</th>
                    <th className="text-left font-600 pl-3 hidden sm:table-cell">Specs / Notes</th>
                    {showQuote && <th className="text-right font-600">Price (INR / CNY)</th>}
                    {showQuote && <th className="text-right font-600 pl-3">Response</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map(line => {
                    const serverResponse = getItemServerResponse(line);
                    const localResponse = itemResponses[line.id];
                    const effectiveResponse = serverResponse ?? localResponse;
                    const isQuoted = line.unitPriceInr != null;
                    const isCountering = activeCounterForm === line.id;

                    return (
                      <tr key={line.id}>
                        <td className="py-3 pr-3 align-top">
                          {line.referenceImageUrls && line.referenceImageUrls.length > 0 ? (
                            <img
                              src={line.referenceImageUrls[0]}
                              alt={line.name}
                              onClick={() => setLightboxUrl(line.referenceImageUrls![0])}
                              className="w-14 h-14 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-500 pl-3 align-top">
                          <div>{line.name}</div>
                          {showQuote && line.targetPriceINR != null && (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-blue-700">Your target: ₹{line.targetPriceINR.toLocaleString('en-IN')}/unit</span>
                            </div>
                          )}
                          {/* Additional reference images (index 1+, since index 0 is shown in Image column) */}
                          {line.referenceImageUrls && line.referenceImageUrls.length > 1 && (
                            <div className="mt-2">
                              <p className="text-[10px] text-muted-foreground mb-1">Reference Images:</p>
                              <div className="flex gap-1 flex-wrap">
                                {line.referenceImageUrls.slice(1).map((url, idx) => (
                                  <img key={idx} src={url} alt={`ref-${idx + 1}`}
                                    onClick={() => setLightboxUrl(url)}
                                    className="w-10 h-10 rounded object-cover border border-border cursor-pointer hover:opacity-80" />
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Existing server response for this item */}
                          {serverResponse && (
                            <div className="mt-1">
                              <ResponseBadge response={serverResponse} />
                              {serverResponse === 'COUNTERED' && line.counterPriceINR != null && (
                                <p className="text-[10px] text-amber-700 mt-0.5">Counter: ₹{line.counterPriceINR.toLocaleString('en-IN')}/unit</p>
                              )}
                              {serverResponse === 'COUNTERED' && displayStatus === 'REVIEWING' && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Waiting for staff reply...</p>
                              )}
                              {serverResponse === 'COUNTERED' && line.status === 'Quoted' && (
                                <p className="text-[10px] text-emerald-700 mt-0.5">Staff updated price — please review above</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-right font-tabular align-top py-3">{line.quantity}</td>
                        <td className="pl-3 text-xs text-muted-foreground align-top py-3 hidden sm:table-cell max-w-[120px]">
                          <span className="line-clamp-2">{line.specs}</span>
                        </td>
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
                            {!isQuoted ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : serverResponse ? (
                              // Already responded via API — read-only
                              <span className="text-xs text-muted-foreground">Submitted</span>
                            ) : canRespond ? (
                              <div className="flex flex-col gap-1 items-end">
                                {localResponse ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <ResponseBadge response={localResponse} />
                                    {localResponse === 'COUNTERED' && (
                                      <div className="text-[10px] text-amber-700">
                                        {counterInputs[line.id] ? `₹${parseFloat(counterInputs[line.id]).toLocaleString('en-IN')}/unit` : 'Price not set'}
                                      </div>
                                    )}
                                    <button type="button" onClick={() => {
                                      setItemResponses(prev => { const n = {...prev}; delete n[line.id]; return n; });
                                      setActiveCounterForm(null);
                                    }} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                                      Change
                                    </button>
                                  </div>
                                ) : isCountering ? (
                                  <div className="space-y-1.5 w-44">
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">Your counter price (₹/unit)</label>
                                      <input
                                        type="number" min="1" autoFocus
                                        className="input-field text-xs py-1 px-2 w-full mt-0.5"
                                        placeholder="Price"
                                        value={counterInputs[line.id] ?? ''}
                                        onChange={e => setCounterInputs(prev => ({ ...prev, [line.id]: e.target.value }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">Note (optional)</label>
                                      <input
                                        type="text"
                                        className="input-field text-xs py-1 px-2 w-full mt-0.5"
                                        placeholder="Reason for counter..."
                                        value={counterNotes[line.id] ?? ''}
                                        onChange={e => setCounterNotes(prev => ({ ...prev, [line.id]: e.target.value }))}
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <button type="button" onClick={() => { setResponse(line.id, 'COUNTERED'); setActiveCounterForm(null); }}
                                        className="btn-primary px-2 py-1 text-xs flex-1">Submit Counter</button>
                                      <button type="button" onClick={() => setActiveCounterForm(null)} className="btn-secondary px-2 py-1 text-xs">✕</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 items-stretch">
                                    <button type="button" onClick={() => setResponse(line.id, 'ACCEPTED')}
                                      className="btn-primary px-2 py-1.5 text-xs inline-flex items-center justify-center gap-1 min-h-[36px]">
                                      <Check className="w-3 h-3" /> Accept
                                    </button>
                                    <button type="button" onClick={() => setResponse(line.id, 'REJECTED')}
                                      className="btn-secondary px-2 py-1.5 text-xs min-h-[36px]">
                                      <X className="w-3 h-3 inline mr-1" />Reject
                                    </button>
                                    <button type="button" onClick={() => setActiveCounterForm(line.id)}
                                      className="btn-secondary px-2 py-1.5 text-xs min-h-[36px] whitespace-nowrap">
                                      💬 Counter Offer
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

            {/* Response Summary + Submit */}
            {showQuote && canRespond && respondedItems.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border space-y-3">
                <h4 className="text-sm font-700">Response Summary:</h4>
                <div className="space-y-1 text-sm">
                  {acceptedItems.length > 0 && (
                    <p className="text-emerald-700">✅ Accepted: {acceptedItems.length} item{acceptedItems.length > 1 ? 's' : ''}
                      {acceptedTotal > 0 && ` (₹${acceptedTotal.toLocaleString('en-IN')} total)`}
                    </p>
                  )}
                  {rejectedItems.length > 0 && (
                    <p className="text-red-700">❌ Rejected: {rejectedItems.length} item{rejectedItems.length > 1 ? 's' : ''}</p>
                  )}
                  {counteredItems.length > 0 && (
                    <p className="text-amber-700">💬 Countered: {counteredItems.length} item{counteredItems.length > 1 ? 's' : ''} (waiting for staff reply)</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={submitResponses}
                  disabled={submittingResponse || responsesSubmitted}
                  className={`w-full py-2.5 text-sm rounded-lg transition-colors disabled:opacity-60 ${
                    responsesSubmitted
                      ? 'bg-emerald-500 text-white font-600'
                      : 'btn-primary'
                  }`}
                >
                  {responsesSubmitted ? (
                    <><Check className="w-4 h-4" /> Responses Submitted ✓</>
                  ) : submittingResponse ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-1" /> Submitting...</>
                  ) : (
                    'Submit All Responses'
                  )}
                </button>
              </div>
            )}

            {/* CONVERTED — order created, guide client to My Orders */}
            {showQuote && displayStatus === 'CONVERTED' && !responsesSubmitted && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-800 font-600 text-sm">✓ Your order has been confirmed!</p>
                <p className="text-emerald-700 text-xs mt-1 mb-3">Payment verified — your order has been created. Check My Orders for status.</p>
                <Link
                  href="/client-dashboard/orders"
                  className="w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                >
                  View My Orders →
                </Link>
              </div>
            )}

            {/* Post-submission state banners */}
            {showQuote && responsesSubmitted && (
              <div className="mt-4 space-y-3">

                {/* State 1 — All accepted → prompt payment or show payment status */}
                {(displayStatus === 'ACCEPTED' || (allAccepted && !hasCounters)) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-emerald-800 font-600 text-sm">All items accepted! ✓</p>
                    {latestPaymentStatus === 'SUBMITTED' ? (
                      <>
                        <p className="text-amber-800 font-600 text-sm mt-3">Payment Submitted – Under Review</p>
                        <p className="text-amber-700 text-xs mt-1">Our team will verify your payment within 24 hours.</p>
                      </>
                    ) : latestPaymentStatus === 'VERIFIED' || displayStatus === 'CONVERTED' ? (
                      <>
                        <p className="text-emerald-800 font-600 text-sm mt-3">Payment Verified – Order Created</p>
                        <p className="text-emerald-700 text-xs mt-1">Your order has been created. <Link href="/client-dashboard/orders" className="underline font-600">View in My Orders.</Link></p>
                      </>
                    ) : latestPaymentStatus === 'REJECTED' ? (
                      <>
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-red-800 font-600 text-sm">Payment Rejected</p>
                          <p className="text-red-700 text-xs mt-1">Please resubmit your payment proof.</p>
                        </div>
                        <button
                          onClick={handleProceedToPayment}
                          className="mt-3 w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                        >
                          Proceed to Payment →
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-emerald-700 text-xs mt-1">Please make payment to confirm your order.</p>
                        <button
                          onClick={handleProceedToPayment}
                          className="mt-3 w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                        >
                          Proceed to Payment →
                        </button>
                        <button
                          onClick={() => setCancelOpen(true)}
                          className="mt-2 w-full py-2 rounded-lg border border-red-400 text-red-500 bg-white hover:bg-red-50 text-sm font-500 inline-flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel Order
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* State 2 — Mix of accepted + rejected → prompt payment for accepted items */}
                {hasMix && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 font-600 text-sm">{acceptedItems.length} item{acceptedItems.length > 1 ? 's' : ''} accepted, {rejectedItems.length} rejected</p>
                    <p className="text-amber-700 text-xs mt-1">Would you like to proceed with accepted items only?</p>
                    {latestPaymentStatus === 'SUBMITTED' ? (
                      <div className="mt-3 bg-amber-100 border border-amber-300 rounded-lg p-3">
                        <p className="text-amber-800 font-600 text-sm">Payment Submitted – Under Review</p>
                        <p className="text-amber-700 text-xs mt-1">Our team will verify your payment within 24 hours.</p>
                      </div>
                    ) : latestPaymentStatus === 'VERIFIED' || displayStatus === 'CONVERTED' ? (
                      <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-emerald-800 font-600 text-sm">Payment Verified – Order Created</p>
                        <p className="text-emerald-700 text-xs mt-1">Your order has been created. <Link href="/client-dashboard/orders" className="underline font-600">View in My Orders.</Link></p>
                      </div>
                    ) : latestPaymentStatus === 'REJECTED' ? (
                      <>
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-red-800 font-600 text-sm">Payment Rejected</p>
                          <p className="text-red-700 text-xs mt-1">Please resubmit your payment proof.</p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleProceedToPayment}
                            className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-600 hover:bg-amber-600 inline-flex items-center justify-center gap-1.5">
                            Proceed with Accepted Items →
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleProceedToPayment}
                          className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-600 hover:bg-amber-600 inline-flex items-center justify-center gap-1.5">
                          Proceed with Accepted Items →
                        </button>
                        <button className="px-4 py-2 rounded-lg border border-border text-sm font-500 hover:bg-muted">
                          Wait / Reconsider
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* State 3 — Counter offers pending */}
                {hasCounters && displayStatus === 'REVIEWING' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 font-600 text-sm">Counter offer sent for {counteredItems.length} item{counteredItems.length > 1 ? 's' : ''}</p>
                    <p className="text-blue-700 text-xs mt-1">Waiting for Elios team to respond...</p>
                    {acceptedItems.length > 0 && (
                      <button onClick={() => router.push(`/payment/${id}`)}
                        className="mt-3 w-full py-2 rounded-lg bg-blue-100 text-blue-800 text-sm font-600 border border-blue-200 opacity-60 cursor-not-allowed">
                        Proceed with Other Accepted Items (waiting for counter resolution)
                      </button>
                    )}
                  </div>
                )}

                {/* State 4 — Already responded, read-only */}
                {displayStatus === 'REVIEWING' && (
                  <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
                    <p className="font-500 text-foreground">Your responses have been submitted</p>
                    <p className="mt-0.5">Elios team will review your counter offers and get back to you.</p>
                  </div>
                )}
              </div>
            )}

            {showQuote && logistics && (
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="text-sm font-700 mb-3">Logistics Total on Quotation</h4>
                <div className="space-y-1.5 text-sm">
                  {logistics.weight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approx Weight</span>
                      <span className="font-500">{logistics.weight}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-500">{logistics.mode}</span>
                  </div>
                  {logistics.pricePerKg && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price per KG</span>
                      <span className="font-tabular font-500">¥{logistics.pricePerKg}</span>
                    </div>
                  )}
                  {logistics.note && (
                    <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border">{logistics.note}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-5">
            <h3 className="text-sm font-700 mb-3">Conversation</h3>
            <div className="space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start a conversation with the team.</p>
              )}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'bg-[#4f6f8f] text-white' : 'bg-[#8f6b4f] text-white'}`}>
                    {msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'AS' : 'You'}
                  </div>
                  <div className={`max-w-[85%] rounded-lg p-3 break-words ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                    <p className="text-xs font-600">{msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'Team' : 'You'}</p>
                    <p className="text-sm mt-1">{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 mt-4">
              <input
                className="input-field flex-1 min-w-0"
                placeholder="Type a message..."
                value={reqChatInput}
                onChange={e => setReqChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendReqMessage(); }}
              />
              <button
                onClick={sendReqMessage}
                className="btn-primary px-3 sm:px-4 inline-flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
              >
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
                    current ? 'bg-[#4A3B52] text-white animate-pulse' :
                              'bg-muted text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <p className={`text-sm pt-0.5 ${
                    done    ? 'font-500 text-foreground' :
                    current ? 'font-700 text-[#4A3B52]' :
                              'font-500 text-muted-foreground'
                  }`}>{s}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      </div>

      {/* Cancel Request Modal */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-red-600">
                <Ban className="w-5 h-5" />
                <h3 className="font-700">Cancel Order</h3>
              </div>
              <button onClick={() => setCancelOpen(false)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-600 text-red-800">Are you sure you want to cancel this request?</p>
                <p className="text-xs text-red-700 mt-1">This action cannot be undone.</p>
              </div>

              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">
                  Reason for cancellation <span className="text-muted-foreground font-400">(optional)</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value.slice(0, 500))}
                  placeholder="Tell us why you're cancelling..."
                  rows={3}
                  className="input-field w-full resize-none text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setCancelOpen(false); setCancelReason(''); }}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Keep Request
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={cancelSubmitting}
                  className="flex-1 py-2.5 text-sm font-600 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
