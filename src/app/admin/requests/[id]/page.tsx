'use client';
import React, { useState, use, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Check, X, MessageSquare, Send, Package, Pencil, Upload, ImageIcon, Ban } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { persistRfqLineItems } from '@/lib/rfqLineItems';
import { downscaleImageToDataUrl } from '@/lib/upload';
import { loadPaymentProof, savePaymentConfirmed, loadPaymentConfirmed } from '@/lib/paymentStore';
import { requestsApi } from '@/lib/api/requests.api';
import { paymentsApi } from '@/lib/api/payments.api';

const CNY_TO_INR = 11.5;
const DEFAULT_LOGISTICS_NOTE = 'This is an approx weight, exact will be given upon final repackaging. To be paid when in India.';

function statusLabel(s: PerProductQuoteStatus, revisionRequested?: boolean) {
  if (s === 'Pending' && revisionRequested) return 'Pending (counter-offer)';
  return s;
}

function StatusPill({ status, revisionRequested }: { status: PerProductQuoteStatus; revisionRequested?: boolean }) {
  const base = 'text-[10px] font-600 px-2 py-0.5 rounded';
  const map: Record<PerProductQuoteStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Quoted: 'bg-sky-100 text-sky-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  return <span className={`${base} ${map[status]}`}>{statusLabel(status, revisionRequested)}</span>;
}

function ClientResponseBadge({ response }: { response: string }) {
  const map: Record<string, string> = {
    ACCEPTED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    COUNTERED: 'bg-amber-100 text-amber-800',
  };
  const label: Record<string, string> = { ACCEPTED: 'Accepted', REJECTED: 'Rejected', COUNTERED: 'Countered' };
  return (
    <span className={`text-[10px] font-600 px-2 py-0.5 rounded ${map[response] ?? 'bg-muted text-muted-foreground'}`}>
      {label[response] ?? response}
    </span>
  );
}

function mapItemStatus(apiStatus: string): PerProductQuoteStatus {
  if (apiStatus === 'QUOTED') return 'Quoted';
  if (apiStatus === 'ACCEPTED') return 'Accepted';
  if (apiStatus === 'REJECTED') return 'Rejected';
  return 'Pending';
}

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const router = useRouter();
  const perms = useAdminPermissions();
  const qs = perms.quotationScope;

  const [apiRequest, setApiRequest] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  // Mirror of lineItems for reading the latest value inside async handlers
  // (e.g. image upload) without persisting from within a setState updater.
  const lineItemsRef = useRef<RequestLineItem[]>([]);
  useEffect(() => { lineItemsRef.current = lineItems; }, [lineItems]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [draftUnitCny, setDraftUnitCny] = useState('');
  const [draftRmb, setDraftRmb] = useState('');
  const [msg, setMsg] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [logisticsWeight, setLogisticsWeight] = useState('');
  const [logisticsMode, setLogisticsMode] = useState('Standard Air');
  const [logisticsPricePerKg, setLogisticsPricePerKg] = useState('');
  const [logisticsNote, setLogisticsNote] = useState(DEFAULT_LOGISTICS_NOTE);
  const [logisticsSaved, setLogisticsSaved] = useState(false);
  const [counterResponseInputs, setCounterResponseInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [advanceAmountINR, setAdvanceAmountINR] = useState('');
  const [quotationSent, setQuotationSent] = useState(false);
  const lastMsgSent = useRef(0);
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ id: string; senderRole: string; text: string; createdAt: string }[]>([]);
  // Empty so the first poll fetches the full history (no `since` param). It is
  // then advanced to the newest message's ISO timestamp so later polls only
  // pull new messages. (Was Date.now() millis, which both 500'd the API and
  // skipped all existing messages on open.)
  const [lastMsgSeen, setLastMsgSeen] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Payment verification state
  const [requestPayments, setRequestPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [paymentRejectReason, setPaymentRejectReason] = useState('');
  const [lightboxProof, setLightboxProof] = useState<string | null>(null);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxUrl || lightboxProof) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxUrl, lightboxProof]);

  function applyApiItems(apiReq: any) {
    const apiLineItems: RequestLineItem[] = (apiReq.items ?? []).map((item: any) => ({
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
  }

  function fetchRequest() {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 15000));
    Promise.race([
      requestsApi.getRequestById(id),
      timeout,
    ])
      .then((r: any) => {
        const apiReq = r.data?.data;
        if (apiReq) {
          setApiRequest(apiReq);
          applyApiItems(apiReq);
          if (['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONVERTED'].includes(apiReq.status)) {
            fetchRequestPayments();
          }
        } else {
          const row = null;
        }
      })
      .catch(() => {})
      .finally(() => setApiLoading(false));
  }

  function fetchRequestPayments() {
    setPaymentsLoading(true);
    paymentsApi.getRequestPayments(id)
      .then(r => {
        if (r.data?.data) setRequestPayments(r.data.data);
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }

  async function handleVerifyPayment(paymentId: string) {
    setVerifyingId(paymentId);
    try {
      const result = await paymentsApi.verifyRequestPayment(paymentId, 'VERIFY');
      const order = result?.data?.data?.order;
      addToast({ type: 'success', title: 'Payment verified!', description: `Order ${order?.orderNumber ?? ''} created successfully.` });
      if (order?.id) {
        router.push(`/admin/orders/${order.id}`);
      } else {
        fetchRequest();
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to verify', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleRejectPayment() {
    if (!rejectPaymentId) return;
    if (!paymentRejectReason.trim()) {
      addToast({ type: 'warning', title: 'Reason required', description: 'Please enter a rejection reason.' });
      return;
    }
    setVerifyingId(rejectPaymentId);
    try {
      await paymentsApi.verifyRequestPayment(rejectPaymentId, 'REJECT', paymentRejectReason.trim());
      addToast({ type: 'warning', title: 'Payment rejected', description: 'Client has been notified.' });
      setRejectPaymentId(null);
      setPaymentRejectReason('');
      fetchRequestPayments();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to reject', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setVerifyingId(null);
    }
  }

  useEffect(() => {
    fetchRequest();
    setPaymentProof(loadPaymentProof(id));
    setPaymentConfirmed(loadPaymentConfirmed(id));
    const savedLogistics = localStorage.getItem(`logistics-estimate-${id}`);
    if (savedLogistics) {
      try {
        const l = JSON.parse(savedLogistics);
        setLogisticsWeight(l.weight ?? '');
        setLogisticsMode(l.mode ?? 'Standard Air');
        setLogisticsPricePerKg(l.pricePerKg ?? '');
        setLogisticsNote(l.note ?? DEFAULT_LOGISTICS_NOTE);
        setLogisticsSaved(true);
      } catch {}
    }
  }, [id]);

  const client = apiRequest?.client ?? null;
  const displayBudget = apiRequest?.totalBudgetINR
    ? `₹${Number(apiRequest.totalBudgetINR).toLocaleString('en-IN')}`
    : '—';

  function beginEdit(line: RequestLineItem) {
    setEditingLineId(line.id);
    setDraftUnitCny(line.unitPriceCny != null ? String(line.unitPriceCny) : '');
    setDraftRmb(String(line.rmbCostPerUnit));
  }

  function cancelEdit() {
    setEditingLineId(null);
    setDraftUnitCny('');
    setDraftRmb('');
  }

  function saveLine(lineId: string) {
    if (qs !== 'full') return;
    const n = parseFloat(draftUnitCny.replace(/,/g, ''));
    const unitCny = Number.isFinite(n) && n > 0 ? n : undefined;
    const unitInr = unitCny != null ? Math.round(unitCny * CNY_TO_INR) : undefined;
    const r = parseFloat(draftRmb.replace(/,/g, ''));
    const rmb = Number.isFinite(r) && r > 0 ? r : undefined;
    setLineItems(prev => {
      const next = prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              rmbCostPerUnit: rmb ?? l.rmbCostPerUnit,
              unitPriceCny: unitCny,
              unitPriceInr: unitInr,
              status: unitCny != null ? ('Quoted' as const) : ('Pending' as const),
              revisionRequested: false,
              clientProposedInr: undefined,
            }
          : l
      );
      persistRfqLineItems(id, next);
      return next;
    });
    setEditingLineId(null);
    setDraftUnitCny('');
    setDraftRmb('');
    addToast({
      type: 'success',
      title: unitCny != null ? 'Price saved' : 'Line cleared',
      description: unitCny != null ? 'Unit price updated for this product.' : 'This line is pending a unit price.',
    });
  }

  async function sendQuotationsToClient() {
    if (qs !== 'full') return;
    const quoted = lineItems.filter(l => l.status === 'Quoted');
    if (!quoted.length) {
      addToast({ type: 'warning', title: 'Nothing to send', description: 'Save a unit price in CNY for at least one product first.' });
      return;
    }
    if (apiRequest) {
      setActionLoading(true);
      try {
        const advAmt = parseFloat(advanceAmountINR.replace(/,/g, ''));
        await Promise.race([
          requestsApi.sendQuotation(id, {
            items: quoted.map(l => ({ id: l.id, quotedRMB: l.rmbCostPerUnit || (l.unitPriceCny ?? 0) })),
            advanceAmountINR: Number.isFinite(advAmt) && advAmt > 0 ? advAmt : undefined,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Server is not responding. Please try again.')), 25000)),
        ]);
        addToast({ type: 'success', title: 'Quotation sent', description: `${quoted.length} item${quoted.length === 1 ? '' : 's'} quoted to client.` });
        setQuotationSent(true);
        fetchRequest();
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to send quotation', description: err?.message || err?.response?.data?.message || 'Please try again.' });
      } finally {
        setActionLoading(false);
      }
    } else {
      addToast({ type: 'success', title: 'Quotations sent', description: `Per-product quotes (${quoted.length} line${quoted.length === 1 ? '' : 's'}) shared with ${client?.email ?? 'the client'}.` });
    }
  }

  async function handleImageUpload(lineId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Accept any image/* (iPhone camera capture can deliver HEIC, which the
    // downscale step normalises to JPEG). Reject obvious non-images only.
    if (file.type && !file.type.startsWith('image/')) {
      addToast({ type: 'warning', title: 'Only image files are allowed.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      addToast({ type: 'warning', title: 'File too large', description: 'Maximum size is 25MB.' });
      return;
    }

    // Downscale to a compact data URL before persisting. iPhone photos as raw
    // base64 overflow Safari's sessionStorage quota; the previous code threw
    // QuotaExceededError inside a setState updater and crashed the page.
    let dataUrl: string;
    try {
      dataUrl = await downscaleImageToDataUrl(file);
    } catch {
      addToast({ type: 'error', title: 'Could not read image', description: 'Please try a different photo.' });
      return;
    }

    const next = lineItemsRef.current.map(l => (l.id === lineId ? { ...l, imageUrl: dataUrl } : l));
    setLineItems(next);
    // Persist outside the updater so a storage failure can never crash React.
    const ok = persistRfqLineItems(id, next);
    if (!ok) {
      addToast({
        type: 'warning',
        title: 'Image shown but not saved locally',
        description: 'Storage is full on this device — the preview works but may not survive a refresh.',
      });
    }
  }

  async function handleRespondToCounter(lineId: string) {
    const raw = counterResponseInputs[lineId] ?? '';
    const n = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      addToast({ type: 'warning', title: 'Enter a valid price' });
      return;
    }
    setActionLoading(true);
    try {
      await requestsApi.respondToCounter(id, [{ id: lineId, newQuotedRMB: n }]);
      addToast({ type: 'success', title: 'Response sent', description: 'Client will be notified of the updated price.' });
      setCounterResponseInputs(prev => { const next = { ...prev }; delete next[lineId]; return next; });
      // Refresh
      const r = await requestsApi.getRequestById(id);
      const apiReq = r.data?.data;
      if (apiReq) {
        setApiRequest(apiReq);
        applyApiItems(apiReq);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to respond', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptCounter(lineId: string, counterPriceINR: number) {
    const newRMB = counterPriceINR / CNY_TO_INR;
    setActionLoading(true);
    try {
      await requestsApi.respondToCounter(id, [{ id: lineId, newQuotedRMB: newRMB }]);
      addToast({ type: 'success', title: 'Counter accepted', description: 'Client will be notified of the accepted price.' });
      fetchRequest();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to accept counter', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function approve() {
    if (!apiRequest) {
      addToast({ type: 'success', title: 'Request approved', description: 'Converted to order.' });
      return;
    }
    if (!window.confirm('Approve this request and create an order?')) return;
    setActionLoading(true);
    try {
      await requestsApi.approveRequest(id);
      addToast({ type: 'success', title: 'Request approved!', description: 'Order created automatically.' });
      router.push('/admin/requests');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to approve', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!apiRequest) {
      addToast({ type: 'warning', title: 'Request rejected', description: 'Client has been notified.' });
      setShowRejectModal(false);
      return;
    }
    setActionLoading(true);
    try {
      await requestsApi.rejectRequest(id, rejectReason || undefined);
      addToast({ type: 'warning', title: 'Request rejected', description: 'Client has been notified.' });
      setShowRejectModal(false);
      router.push('/admin/requests');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to reject', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }
  function moreInfo() {
    addToast({ type: 'info', title: 'Info requested from client' });
  }
  function saveLogistics() {
    localStorage.setItem(`logistics-estimate-${id}`, JSON.stringify({
      weight: logisticsWeight,
      mode: logisticsMode,
      pricePerKg: logisticsPricePerKg,
      note: logisticsNote,
    }));
    setLogisticsSaved(true);
    addToast({ type: 'success', title: 'Logistics saved', description: 'Logistics estimate is now visible to client.' });
  }
  function confirmPayment() {
    savePaymentConfirmed(id);
    setPaymentConfirmed(true);
    addToast({ type: 'success', title: 'Payment confirmed', description: 'Order status updated to Payment Confirmed.' });
  }
  // ── Chat functions ────────────────────────────────────────────────────────────
  async function sendChatMsg() {
    const now = Date.now();
    if (now - lastMsgSent.current < 2000) { addToast({ type: 'warning', title: 'Please wait before sending again.' }); return; }
    const sanitized = msg.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized || !apiRequest) return;
    lastMsgSent.current = now;
    setMsg('');
    try {
      await requestsApi.sendMessage(id, sanitized);
      await fetchMessages();
    } catch { addToast({ type: 'error', title: 'Failed to send' }); }
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
            // Notify on incoming client messages
            const clientMsgs = unique.filter((m: any) => m.senderRole === 'CLIENT');
            if (clientMsgs.length > 0 && prev.length > 0) {
              addToast({ type: 'info', title: `New message${clientMsgs.length > 1 ? 's' : ''} from client`, description: clientMsgs[clientMsgs.length - 1].text.slice(0, 100) });
            }
          }
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
        const last = newMsgs[newMsgs.length - 1];
        setLastMsgSeen(last.createdAt);
      }
    } catch { /* silent — chat is non-critical */ }
  }

  // Scroll chat to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Poll messages every 8 seconds when the request is loaded
  useEffect(() => {
    if (!apiRequest) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [apiRequest, id]);

  const showFullQuoteCols = qs === 'full';
  // ── Skeleton while loading real data (no mock fallback available) ──────────
  if (apiLoading) {
    return (
      <AdminLayout>
        <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </Link>
        <div className="animate-pulse space-y-4 w-full max-w-full">
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="h-6 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-64" />
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="h-4 bg-muted rounded w-40 mb-4" />
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded mb-2" />)}
              </div>
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="h-4 bg-muted rounded w-28 mb-4" />
                {[1,2].map(i => <div key={i} className="h-8 bg-muted rounded mb-2" />)}
              </div>
            </div>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const displayStatus: string = apiRequest?.status ?? 'SUBMITTED';
  const counteredCount = lineItems.filter(l => l.clientResponse === 'COUNTERED').length;
  const convertedOrderNumber: string | null = (() => {
    if (displayStatus !== 'CONVERTED') return null;
    const act = (apiRequest?.activities ?? []).find((a: any) =>
      typeof a.action === 'string' && a.action.includes('Request approved — order')
    );
    if (!act) return null;
    const match = (act.action as string).match(/order (\S+) created/);
    return match ? match[1] : null;
  })();

  return (
    <AdminLayout>
      {/* Page wrapper: full width, no horizontal overflow, no side gaps */}
      <div className="w-full max-w-full overflow-x-hidden pb-20">

        {/* Lightbox — portal to body to avoid scroll jumps */}
        {typeof window === 'object' && lightboxUrl && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]"
                 onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black/80"
              >
                ✕
              </button>
              <img
                src={lightboxUrl}
                alt="Enlarged image"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>,
          document.body
        )}

        {/* Reject Request Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md">
              <h3 className="font-700 text-lg mb-3">Reject Request</h3>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="input-field w-full mb-4"
                rows={3}
                placeholder="Reason for rejection (optional — will be sent to client)"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRejectModal(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-600 hover:bg-red-600 disabled:opacity-50">
                  {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Payment Modal */}
        {rejectPaymentId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md">
              <h3 className="font-700 text-lg mb-3">Reject Payment Proof</h3>
              <p className="text-sm text-muted-foreground mb-3">The client will be notified and asked to resubmit.</p>
              <textarea
                value={paymentRejectReason}
                onChange={e => setPaymentRejectReason(e.target.value)}
                className="input-field w-full mb-4"
                rows={3}
                placeholder="Reason (required — will be sent to client)"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setRejectPaymentId(null); setPaymentRejectReason(''); }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleRejectPayment} disabled={!!verifyingId} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-600 hover:bg-red-600 disabled:opacity-50">
                  {verifyingId ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proof Image Lightbox — portal to body */}
        {typeof window === 'object' && lightboxProof && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxProof(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]"
                 onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLightboxProof(null)}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black/80"
              >
                ✕
              </button>
              <img
                src={lightboxProof}
                alt="Payment Proof"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>,
          document.body
        )}

        <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {counteredCount > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-600 text-amber-800">
              {counteredCount} item{counteredCount > 1 ? 's' : ''} have counter offer{counteredCount > 1 ? 's' : ''} from the client — please respond
            </p>
          </div>
        )}

        {/* Request header card */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-tabular font-700 text-lg">{apiRequest?.requestNumber ?? '—'}</span>
            <StatusBadge status={paymentConfirmed ? ('Payment Confirmed' as never) : ((apiRequest?.status ?? 'SUBMITTED') as never)} />
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {apiRequest?.client?.companyName ?? '—'} • {apiRequest?.client?.user?.email ?? '—'} • {apiRequest ? new Date(apiRequest.createdAt).toLocaleDateString('en-IN') : '—'}
            {perms.canSeeRequestBudget ? ` • Budget ${displayBudget}` : ''}
          </p>
        </div>

        {/* Cancellation banner — shown when request was cancelled by client */}
        {displayStatus === 'CANCELLED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex gap-3">
            <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-600 text-red-700">Request Cancelled</p>
              <p className="text-sm text-red-600 mt-0.5">This request was cancelled by the client.</p>
              {apiRequest?.cancelledAt && (
                <p className="text-xs text-red-500 mt-1">
                  Cancelled on:{' '}
                  {new Date(apiRequest.cancelledAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
              <p className="text-xs text-red-500 mt-0.5">
                Reason:{' '}
                <span className="font-500">
                  {apiRequest?.cancelReason?.trim() || 'No reason provided by client'}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 min-w-0">


            {/* Quotations / Items card */}
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h3 className="font-700 mb-1">{showFullQuoteCols ? 'Per-product quotations' : 'Items Requested'}</h3>
              {showFullQuoteCols && (
                <p className="text-xs text-muted-foreground mb-3">
                  Enter RMB cost and unit price in CNY (¥) for each product, then Save.
                  <span className="ml-1 font-600 text-[#4A3B52]">¥1 = ₹{CNY_TO_INR.toFixed(2)}</span>
                </p>
              )}

              {/* ── MOBILE: card-per-product layout ── */}
              <div className="sm:hidden space-y-3">
                {lineItems.map(line => {
                  const marginInr = line.unitPriceCny != null
                    ? Math.round((line.unitPriceCny - line.rmbCostPerUnit) * CNY_TO_INR)
                    : null;
                  const editing = editingLineId === line.id;
                  return (
                    <div key={line.id} className={`border rounded-xl p-3 space-y-3 ${line.clientResponse === 'COUNTERED' ? 'border-amber-400 bg-amber-50' : 'border-border'}`}>
                      {/* Product header */}
                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 flex flex-col gap-2 min-w-[56px]">
                          {/* Client reference images */}
                          {line.referenceImageUrls && line.referenceImageUrls.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-500 mb-1">Client ref:</p>
                              <div className="flex gap-1 flex-wrap">
                                {line.referenceImageUrls.map((url, idx) => (
                                  <img key={idx} src={url} alt={`ref-${idx}`} onClick={() => setLightboxUrl(url)}
                                    className="w-10 h-10 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80" />
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Supplier image */}
                          <div>
                            <p className="text-[10px] text-muted-foreground font-500 mb-1">Supplier:</p>
                            {line.imageUrl ? (
                              <img src={line.imageUrl} alt={line.name} onClick={() => setLightboxUrl(line.imageUrl!)}
                                className="w-10 h-10 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            {showFullQuoteCols && (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={el => { fileInputRefs.current[line.id] = el; }}
                                  onChange={e => handleImageUpload(line.id, e)}
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRefs.current[line.id]?.click()}
                                  className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 flex items-center gap-0.5 w-full justify-center mt-1"
                                >
                                  <Upload className="w-2.5 h-2.5" /> Upload
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-500 text-sm break-words">{line.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words">{line.specs}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Qty: <span className="font-tabular font-500 text-foreground">{line.quantity}</span></span>
                            <StatusPill status={line.status} revisionRequested={line.revisionRequested} />
                          </div>
                          {line.clientProposedInr != null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Client suggested ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                            </p>
                          )}
                          {line.clientResponse && (
                            <div className="mt-1.5 flex flex-col gap-1">
                              {line.clientResponse === 'COUNTERED' && (
                                <div className="border border-amber-300 rounded-lg p-2.5 bg-white space-y-2 mt-1">
                                  <p className="text-xs font-700 text-amber-800">💬 Client Counter Offer</p>
                                  {line.counterPriceINR != null && (
                                    <p className="text-sm font-700 text-amber-700">₹{line.counterPriceINR.toLocaleString('en-IN')}/unit</p>
                                  )}
                                  {line.counterNote && <p className="text-[10px] text-muted-foreground">Note: {line.counterNote}</p>}
                                  {line.rmbCostPerUnit > 0 && (
                                    <p className="text-[10px] text-muted-foreground">Your quoted: ¥{line.rmbCostPerUnit}{line.unitPriceInr != null ? ` = ₹${line.unitPriceInr.toLocaleString('en-IN')}` : ''}</p>
                                  )}
                                  <div className="pt-1 border-t border-amber-200 space-y-1.5">
                                    <p className="text-[10px] font-600 text-muted-foreground">Respond:</p>
                                    {line.counterPriceINR != null && (
                                      <button
                                        onClick={() => handleAcceptCounter(line.id, line.counterPriceINR!)}
                                        disabled={actionLoading}
                                        className="w-full py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-600 hover:bg-emerald-600 disabled:opacity-50"
                                      >
                                        Accept Counter
                                      </button>
                                    )}
                                    <div className="flex gap-1">
                                      <input
                                        type="number" min={0} placeholder="New ¥ price"
                                        className="input-field py-1 text-xs flex-1"
                                        value={counterResponseInputs[line.id] ?? ''}
                                        onChange={e => setCounterResponseInputs(p => ({ ...p, [line.id]: e.target.value }))}
                                      />
                                      <button onClick={() => handleRespondToCounter(line.id)} disabled={actionLoading} className="btn-primary px-2 py-1 text-xs">
                                        Offer New Price
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price inputs — full quote only */}
                      {showFullQuoteCols && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">RMB / unit</label>
                            {editing ? (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                <input
                                  type="number"
                                  min={0}
                                  className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                  value={draftRmb}
                                  onChange={e => setDraftRmb(e.target.value)}
                                  placeholder="RMB"
                                />
                              </div>
                            ) : (
                              <span className="text-sm font-tabular text-muted-foreground">¥{line.rmbCostPerUnit}</span>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Unit ¥ (CNY)</label>
                            {editing ? (
                              <div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                    value={draftUnitCny}
                                    onChange={e => setDraftUnitCny(e.target.value)}
                                    placeholder="CNY"
                                  />
                                </div>
                                {(() => {
                                  const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                                  return Number.isFinite(n) && n > 0 ? (
                                    <span className="text-[11px] text-muted-foreground font-tabular">
                                      ≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            ) : (
                              <span className="text-sm font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Margin + actions */}
                      {showFullQuoteCols && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-600">BK Margin</span>
                            <div className="text-sm font-tabular font-500">
                              {marginInr != null ? (
                                <span className={marginInr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  ₹{marginInr.toLocaleString('en-IN')}
                                </span>
                              ) : '—'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {editing ? (
                              <>
                                <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-3 py-1.5 text-xs">Save</button>
                                <button type="button" onClick={cancelEdit} className="btn-secondary px-3 py-1.5 text-xs">Cancel</button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEdit(line)}
                                className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" /> Edit price
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Non-full-quote: specs only */}
                      {!showFullQuoteCols && (
                        <p className="text-xs text-muted-foreground break-words">{line.specs}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: full table layout ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                      <th className="py-2 text-left font-600 w-16">Image</th>
                      <th className="py-2 text-left font-600">Product</th>
                      <th className="text-right font-600 w-16">Qty</th>
                      {showFullQuoteCols && (
                        <>
                          <th className="text-right font-600 w-32 text-blue-700">Client Target</th>
                          <th className="text-right font-600 w-28">RMB / unit</th>
                          <th className="text-right font-600 w-36">Unit ¥ (CNY)</th>
                          <th className="text-right font-600 w-28 text-[#4A3B52]">BK Margin ₹</th>
                          <th className="text-left font-600 pl-3 w-36">Status</th>
                          <th className="text-right font-600 w-40">Actions</th>
                        </>
                      )}
                      {!showFullQuoteCols && <th className="text-left font-600 pl-3">Specs</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map(line => {
                      const marginInr =
                        line.unitPriceCny != null ? Math.round((line.unitPriceCny - line.rmbCostPerUnit) * CNY_TO_INR) : null;
                      const editing = editingLineId === line.id;
                      return (
                        <React.Fragment key={line.id}>
                        <tr className={line.clientResponse === 'COUNTERED' ? 'bg-amber-50' : ''}>
                          <td className="py-3 align-top w-28">
                            <div className="flex flex-col gap-2.5">
                              {/* Client reference images */}
                              {line.referenceImageUrls && line.referenceImageUrls.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-500 mb-1">Client reference:</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {line.referenceImageUrls.map((url, idx) => (
                                      <img key={idx} src={url} alt={`ref-${idx}`} onClick={() => setLightboxUrl(url)}
                                        className="w-12 h-12 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Supplier image */}
                              <div>
                                <p className="text-[10px] text-muted-foreground font-500 mb-1">Supplier image:</p>
                                {line.imageUrl ? (
                                  <img src={line.imageUrl} alt={line.name} onClick={() => setLightboxUrl(line.imageUrl!)}
                                    className="w-12 h-12 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                {showFullQuoteCols && (
                                  <>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      ref={el => { fileInputRefs.current[line.id] = el; }}
                                      onChange={e => handleImageUpload(line.id, e)}
                                      className="hidden"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.current[line.id]?.click()}
                                      className="btn-secondary px-1.5 py-0.5 text-[10px] inline-flex items-center gap-0.5 mt-1"
                                      title="Upload supplier image"
                                    >
                                      <Upload className="w-2.5 h-2.5" /> Upload
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 align-top">
                            <p className="font-500">{line.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{line.specs}</p>
                            {/* Client response */}
                            {line.clientResponse && (
                              <div className="mt-1.5">
                                <ClientResponseBadge response={line.clientResponse} />
                              </div>
                            )}
                          </td>
                          <td className="text-right font-tabular align-top py-3">{line.quantity}</td>
                          {showFullQuoteCols && (
                            <>
                              <td className="text-right align-top py-3">
                                {line.targetPriceINR != null ? (
                                  <span className="font-tabular text-blue-700 font-500 text-xs">₹{line.targetPriceINR.toLocaleString('en-IN')}</span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="relative w-full max-w-[6rem] ml-auto">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                    <input
                                      type="number"
                                      min={0}
                                      className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                      value={draftRmb}
                                      onChange={e => setDraftRmb(e.target.value)}
                                      placeholder="RMB"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-tabular text-muted-foreground">¥{line.rmbCostPerUnit}</span>
                                )}
                              </td>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="relative w-full max-w-[7.5rem] ml-auto">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                      <input
                                        type="number"
                                        min={0}
                                        className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                        value={draftUnitCny}
                                        onChange={e => setDraftUnitCny(e.target.value)}
                                        placeholder="CNY"
                                      />
                                    </div>
                                    {(() => {
                                      const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                                      return Number.isFinite(n) && n > 0 ? (
                                        <span className="text-[11px] text-muted-foreground font-tabular">
                                          ≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')} INR
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                ) : (
                                  <span className="font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                                )}
                              </td>
                              <td className="text-right font-tabular">
                                {marginInr != null ? (
                                  <span className={marginInr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                    ₹{marginInr.toLocaleString('en-IN')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="pl-3 align-middle">
                                <div className="flex flex-col gap-1">
                                  <StatusPill status={line.status} revisionRequested={line.revisionRequested} />
                                  {line.clientResponse === 'COUNTERED' && (
                                    <span className="text-[10px] font-700 px-2 py-0.5 rounded bg-amber-400 text-white w-fit">COUNTERED</span>
                                  )}
                                  {line.clientProposedInr != null && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Client suggested ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="flex flex-col gap-1 items-end">
                                    <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-2 py-1 text-xs">
                                      Save
                                    </button>
                                    <button type="button" onClick={cancelEdit} className="btn-secondary px-2 py-1 text-xs">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => beginEdit(line)}
                                    className="btn-secondary px-2 py-1.5 text-xs inline-flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit price
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {!showFullQuoteCols && <td className="pl-3 text-xs text-muted-foreground">{line.specs}</td>}
                        </tr>
                        {line.clientResponse === 'COUNTERED' && line.counterPriceINR != null && (
                          <tr className="bg-amber-50">
                            <td colSpan={showFullQuoteCols ? 9 : 4} className="px-4 pb-4 pt-0">
                              <div className="border border-amber-300 rounded-xl p-4 bg-white space-y-3">
                                <p className="text-sm font-700 text-amber-800">💬 CLIENT COUNTER OFFER</p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Client's counter price</p>
                                    <p className="text-base font-700 text-amber-700">₹{line.counterPriceINR.toLocaleString('en-IN')}/unit</p>
                                    {line.counterNote && <p className="text-xs text-muted-foreground mt-0.5">Note: {line.counterNote}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Your quoted price</p>
                                    <p className="text-sm font-600">
                                      {line.rmbCostPerUnit ? `¥${line.rmbCostPerUnit}` : '—'}
                                      {line.unitPriceInr != null ? ` = ₹${line.unitPriceInr.toLocaleString('en-IN')}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="border-t border-amber-200 pt-3">
                                  <p className="text-xs font-600 text-muted-foreground mb-2">Respond:</p>
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <button
                                      onClick={() => handleAcceptCounter(line.id, line.counterPriceINR!)}
                                      disabled={actionLoading}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-600 hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                      Accept Counter
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-muted-foreground">New price ¥</span>
                                      <input
                                        type="number" min={0} placeholder="RMB"
                                        className="input-field py-1 text-xs w-24"
                                        value={counterResponseInputs[line.id] ?? ''}
                                        onChange={e => setCounterResponseInputs(p => ({ ...p, [line.id]: e.target.value }))}
                                      />
                                      <button
                                        onClick={() => handleRespondToCounter(line.id)}
                                        disabled={actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#3a2d40] disabled:opacity-50"
                                      >
                                        Offer New Price
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {showFullQuoteCols && displayStatus !== 'CONVERTED' && displayStatus !== 'REJECTED' && displayStatus !== 'CANCELLED' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">
                      Advance Amount Required (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={advanceAmountINR}
                      onChange={e => setAdvanceAmountINR(e.target.value)}
                      placeholder="Leave blank for flexible payment"
                      className="input-field w-full text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendQuotationsToClient}
                    disabled={quotationSent || actionLoading}
                    className={`w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 rounded-lg transition-colors ${
                      quotationSent
                        ? 'bg-emerald-500 text-white'
                        : 'btn-primary'
                    } disabled:opacity-60`}
                  >
                    {quotationSent ? (
                      <><Check className="w-4 h-4" /> Quotation Sent Successfully</>
                    ) : actionLoading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending quotation...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send quotations to client</>
                    )}
                  </button>
                </div>
              )}

              {/* Logistics Estimate */}
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="font-700 mb-3">Logistics Estimate</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Approx Weight</label>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={logisticsWeight}
                      onChange={e => { setLogisticsWeight(e.target.value); setLogisticsSaved(false); }}
                      placeholder="e.g. 10kg / 0.2 CBM"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Shipping Mode</label>
                    <select
                      className="input-field w-full text-sm"
                      value={logisticsMode}
                      onChange={e => { setLogisticsMode(e.target.value); setLogisticsSaved(false); }}
                    >
                      <option>Standard Air</option>
                      <option>Express Air</option>
                      <option>Sea Freight</option>
                      <option>Express Courier</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Price per KG (¥ CNY)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                      <input
                        type="number"
                        min={0}
                        className="input-field w-full pl-5 text-sm"
                        value={logisticsPricePerKg}
                        onChange={e => { setLogisticsPricePerKg(e.target.value); setLogisticsSaved(false); }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Note</label>
                  <textarea
                    className="input-field w-full text-sm resize-none"
                    rows={2}
                    value={logisticsNote}
                    onChange={e => { setLogisticsNote(e.target.value); setLogisticsSaved(false); }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveLogistics}
                  className="btn-primary mt-3 px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  {logisticsSaved && <Check className="w-4 h-4" />}
                  {logisticsSaved ? 'Logistics Saved' : 'Save Logistics'}
                </button>
              </div>
            </div>

            {qs === 'names_qty' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#4A3B52]" /> Warehouse view
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can see product names and quantities for picking and packing. Per-line INR pricing and RMB costs are hidden for your role.
                </p>
              </div>
            )}
            {qs === 'verification' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-2">Repacking Warehouse verification</h3>
                <p className="text-sm text-muted-foreground">
                  Use the item list above to verify goods against the request. Pricing fields are restricted — contact an administrator to update quotations.
                </p>
              </div>
            )}
            {qs === 'logistics_dims' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-3">Shipment weights & dimensions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Logistics view — plan cartons and chargeable weight. Product and client pricing fields are not shown for your role.
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Est. gross weight</dt>
                    <dd className="font-tabular font-700 mt-1">42.6 kg</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Chargeable volume</dt>
                    <dd className="font-tabular font-700 mt-1">0.38 CBM</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Carton count</dt>
                    <dd className="font-tabular font-700 mt-1">6</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Longest side</dt>
                    <dd className="font-tabular font-700 mt-1">112 cm</dd>
                  </div>
                </dl>
              </div>
            )}
            {qs === 'none' && (
              <div className="bg-muted/40 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Quotation tools are not enabled for your role on this screen.
              </div>
            )}

            {/* Conversation — real-time chat */}
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h3 className="font-700 mb-3">Conversation</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start a conversation with the client.</p>
                )}
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.senderRole === 'ADMIN' || m.senderRole === 'STAFF' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${m.senderRole === 'ADMIN' || m.senderRole === 'STAFF' ? 'bg-[#4f6f8f]' : 'bg-[#8f6b4f]'}`}>
                      {m.senderRole === 'ADMIN' || m.senderRole === 'STAFF' ? 'AS' : 'CL'}
                    </div>
                    <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${m.senderRole === 'ADMIN' || m.senderRole === 'STAFF' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                      <p>{m.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChatMsg(); }}
                  className="input-field flex-1 min-w-0"
                  placeholder="Reply to client..."
                />
                <button onClick={sendChatMsg} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar column */}
          <div className="space-y-3 h-fit">
            {paymentProof && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h4 className="font-700 text-sm mb-3">Payment Proof</h4>
                <img
                  src={paymentProof}
                  alt="Client payment proof"
                  onClick={() => setLightboxUrl(paymentProof)}
                  className="w-full rounded-lg border border-border object-contain max-h-48 bg-muted cursor-pointer hover:opacity-80"
                />
                {paymentConfirmed ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm font-600">
                    <Check className="w-4 h-4" /> Payment Confirmed
                  </div>
                ) : (
                  <button
                    onClick={confirmPayment}
                    className="w-full mt-3 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Confirm Payment & Place Order
                  </button>
                )}
              </div>
            )}

            {/* ── Payment Verification Section ── */}
            {['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(displayStatus) && perms.isFullAdmin && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h4 className="font-700 text-sm mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Payment Verification
                </h4>
                {paymentsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading payments…</p>
                ) : requestPayments.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 font-600">Awaiting client payment</p>
                    <p className="text-xs text-amber-700 mt-0.5">Client has accepted the quotation. Waiting for them to submit payment proof.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requestPayments.map((pmt: any) => {
                      const amount = parseFloat(pmt.amountINR || '0');
                      const isVerifying = verifyingId === pmt.id;
                      return (
                        <div key={pmt.id} className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-600">₹{amount.toLocaleString('en-IN')} — {pmt.type === 'FULL' ? 'Full Payment' : 'Advance'}</p>
                              <p className="text-[10px] text-muted-foreground">{pmt.submittedAt ? new Date(pmt.submittedAt).toLocaleString('en-IN') : ''}</p>
                            </div>
                            <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                              pmt.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                              pmt.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {pmt.status}
                            </span>
                          </div>
                          {pmt.proofImageBase64 && (
                            <button
                              onClick={() => setLightboxProof(pmt.proofImageBase64)}
                              className="w-full"
                            >
                              <img
                                src={pmt.proofImageBase64}
                                alt="Payment proof"
                                className="w-full max-h-32 object-contain rounded-lg border border-border bg-muted hover:opacity-80 cursor-pointer"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">Click to enlarge</p>
                            </button>
                          )}
                          {pmt.status === 'SUBMITTED' && perms.isFullAdmin && (
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleVerifyPayment(pmt.id)}
                                disabled={!!verifyingId}
                                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                {isVerifying ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</> : <><Check className="w-3.5 h-3.5" /> Verify</>}
                              </button>
                              <button
                                onClick={() => { setRejectPaymentId(pmt.id); setPaymentRejectReason(''); }}
                                disabled={!!verifyingId}
                                className="flex-1 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-600 hover:bg-red-200 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                          {pmt.status === 'REJECTED' && pmt.rejectionReason && (
                            <p className="text-[10px] text-red-700 bg-red-50 rounded p-2">Rejected: {pmt.rejectionReason}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {displayStatus === 'CANCELLED' ? (
              <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-600 cursor-default select-none">
                <Ban className="w-4 h-4" /> Request Cancelled
              </div>
            ) : displayStatus === 'CONVERTED' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-600 text-emerald-800 flex items-start gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This request has been converted to order{' '}
                    <Link href="/admin/all-orders" className="font-700 underline hover:no-underline">
                      {convertedOrderNumber ?? 'an order'}
                    </Link>
                  </span>
                </p>
              </div>
            ) : displayStatus === 'REJECTED' ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-600 text-red-800">This request was rejected</p>
              </div>
            ) : !['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(displayStatus) && perms.isFullAdmin ? (
              <>
                <button
                  onClick={approve}
                  disabled={actionLoading}
                  title="Order is usually created after payment verification. Use this only if needed."
                  className="w-full px-4 py-2.5 rounded-lg border border-emerald-500 text-emerald-700 text-sm font-600 hover:bg-emerald-50 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Manually Convert to Order
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject Request
                </button>
              </>
            ) : displayStatus !== 'CONVERTED' && displayStatus !== 'REJECTED' && perms.isFullAdmin ? (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Reject Request
              </button>
            ) : null}
            <button onClick={moreInfo} className="btn-secondary w-full py-2.5 text-sm">
              Request More Info
            </button>
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h4 className="font-700 text-sm mb-2">Client Snapshot</h4>
              <div className="text-xs space-y-1">
                <p>
                  <span className="text-muted-foreground">Company:</span> <span className="font-500">{apiRequest?.client?.companyName ?? client?.company}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">GSTIN:</span> <span className="font-tabular">{client?.gstin ?? '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total Orders:</span> <span className="font-500">{client?.totalOrders ?? '—'}</span>
                </p>
                {perms.canSeeClientSpendInSnapshot && (
                  <p>
                    <span className="text-muted-foreground">Spend:</span> <span className="font-500">{client?.totalSpend ?? '—'}</span>
                  </p>
                )}
                {apiRequest?.totalBudgetINR && (
                  <p>
                    <span className="text-muted-foreground">Total Budget:</span>{' '}
                    <span className="font-tabular font-500 text-[#4A3B52]">₹{Number(apiRequest.totalBudgetINR).toLocaleString('en-IN')}</span>
                  </p>
                )}
                {apiRequest?.referenceNote && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-muted-foreground mb-0.5">Reference Note:</p>
                    <p className="text-foreground italic">{apiRequest.referenceNote}</p>
                  </div>
                )}
              </div>
            </div>
            {apiRequest?.activities?.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h4 className="font-700 text-sm mb-2">Activity Log</h4>
                <div className="space-y-2">
                  {apiRequest.activities.slice(0, 5).map((act: any) => (
                    <div key={act.id} className="text-xs">
                      <p className="font-500 text-foreground">{act.action}</p>
                      <p className="text-muted-foreground">{new Date(act.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
