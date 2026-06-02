'use client';
import React, { useState, use, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests, mockClients } from '@/lib/adminMockData';
import { requestsApi } from '@/lib/api/requests.api';
import { paymentsApi } from '@/lib/api/payments.api';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Check, X, MessageSquare, Send, Pencil, Upload, ImageIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { defaultLineItemsFromRequest, loadRfqLineItems, persistRfqLineItems } from '@/lib/rfqLineItems';

const CNY_TO_INR = 11.5;
const DEFAULT_LOGISTICS_NOTE = 'This is an approx weight, exact will be given upon final repackaging. To be paid when in India.';

function StatusPill({ status, revisionRequested, label: labelOverride }: { status: PerProductQuoteStatus; revisionRequested?: boolean; label?: string }) {
  const base = 'text-[10px] font-600 px-2 py-0.5 rounded';
  const map: Record<PerProductQuoteStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Quoted: 'bg-sky-100 text-sky-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  const label = labelOverride ?? (status === 'Pending' && revisionRequested ? 'Pending (counter-offer)' : status);
  return <span className={`${base} ${map[status]}`}>{label}</span>;
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

function getEffectiveStatus(requestStatus: string, lineStatus: PerProductQuoteStatus): { status: PerProductQuoteStatus; label: string } {
  if (['CONVERTED', 'Completed', 'Approved'].includes(requestStatus)) return { status: 'Accepted', label: 'Approved' };
  if (['REJECTED', 'Rejected'].includes(requestStatus)) return { status: 'Rejected', label: 'Rejected' };
  if (['QUOTED', 'Awaiting Approval'].includes(requestStatus)) return { status: lineStatus, label: lineStatus };
  return { status: lineStatus, label: lineStatus };
}

function mapItemStatus(apiStatus: string): PerProductQuoteStatus {
  if (apiStatus === 'QUOTED') return 'Quoted';
  if (apiStatus === 'ACCEPTED') return 'Accepted';
  if (apiStatus === 'REJECTED') return 'Rejected';
  return 'Pending';
}

export default function SourcingRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();

  const mockReq = mockRequests.find(r => r.id === id);
  const [apiRequest, setApiRequest] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);

  const [lineItems, setLineItems] = useState<RequestLineItem[]>(() =>
    mockReq ? defaultLineItemsFromRequest(mockReq) : []
  );
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [draftUnitCny, setDraftUnitCny] = useState('');
  const [draftRmb, setDraftRmb] = useState('');
  const [msg, setMsg] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [thread, setThread] = useState([
    { by: 'client', text: 'Hi team, please source these items urgently. Sample required first.', t: '2 hours ago' },
    { by: 'admin', text: 'On it — sample available in 5–7 days. We will share supplier shortlist shortly.', t: '1 hour ago' },
  ]);
  const [logisticsWeight, setLogisticsWeight] = useState('');
  const [logisticsMode, setLogisticsMode] = useState('Standard Air');
  const [logisticsPricePerKg, setLogisticsPricePerKg] = useState('');
  const [logisticsNote, setLogisticsNote] = useState(DEFAULT_LOGISTICS_NOTE);
  const [logisticsSaved, setLogisticsSaved] = useState(false);
  // Counter response state for staff
  const [counterResponseInputs, setCounterResponseInputs] = useState<Record<string, string>>({});
  const [advanceAmountINR, setAdvanceAmountINR] = useState('');
  const lastMsgSent = useRef(0);
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

  function fetchRequest() {
    requestsApi.getRequestById(id)
      .then((r) => {
        const req = r.data?.data;
        if (req) {
          console.log('=== REQUEST DEBUG ===');
          console.log('Request status:', req?.status);
          console.log('Items:', req?.items);
          req?.items?.forEach((item: any, i: number) => {
            console.log(`Item ${i}:`, {
              name: item.productName,
              status: item.status,
              clientResponse: item.clientResponse,
              counterPriceINR: item.counterPriceINR,
              counterNote: item.counterNote,
            });
          });
          setApiRequest(req);
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
            // Use clientResponse if set; fall back to item.status === 'COUNTERED' to handle
            // cases where clientResponse was not persisted but the status enum was updated.
            clientResponse: item.clientResponse ?? (item.status === 'COUNTERED' ? 'COUNTERED' : undefined),
            counterPriceINR: item.counterPriceINR ? parseFloat(item.counterPriceINR) : undefined,
            counterNote: item.counterNote ?? undefined,
          }));
          setLineItems(apiLineItems);
          if (['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONVERTED'].includes(req.status)) {
            fetchRequestPayments();
          }
        }
      })
      .catch(() => {
        if (mockReq) setLineItems(loadRfqLineItems(mockReq));
      })
      .finally(() => setApiLoading(false));
  }

  function fetchRequestPayments() {
    setPaymentsLoading(true);
    paymentsApi.getRequestPayments(id)
      .then(r => { if (r.data?.data) setRequestPayments(r.data.data); })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }

  async function handleVerifyPayment(paymentId: string) {
    setVerifyingId(paymentId);
    try {
      const result = await paymentsApi.verifyRequestPayment(paymentId, 'VERIFY');
      const order = result?.data?.data?.order;
      addToast({ type: 'success', title: 'Payment verified!', description: `Order ${order?.orderNumber ?? ''} created.` });
      if (order?.id) router.push(`/staff/sourcing/orders/${order.id}`);
      else fetchRequest();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to verify', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleRejectPayment() {
    if (!rejectPaymentId) return;
    if (!paymentRejectReason.trim()) {
      addToast({ type: 'warning', title: 'Reason required' });
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
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setVerifyingId(null);
    }
  }

  useEffect(() => {
    fetchRequest();
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

  if (!apiLoading && !apiRequest && !mockReq) return notFound();

  const displayStatus = apiRequest?.status ?? (mockReq?.status as string) ?? 'SUBMITTED';
  const displayRequestId = apiRequest?.requestNumber ?? mockReq?.requestId ?? id;
  const displayDate = apiRequest
    ? new Date(apiRequest.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (mockReq?.date ?? '');
  const displayBudget = apiRequest?.totalBudgetINR
    ? `₹${Number(apiRequest.totalBudgetINR).toLocaleString('en-IN')}`
    : (mockReq?.totalBudget ?? '—');

  const clientCompany = apiRequest?.client?.companyName ?? mockClients.find(c => c.name === mockReq?.client)?.company ?? '—';
  const clientEmail = apiRequest?.client?.user?.email ?? mockClients.find(c => c.name === mockReq?.client)?.email ?? '';
  const clientGstin = mockClients.find(c => c.name === mockReq?.client)?.gstin ?? '—';

  const convertedOrderNumber: string | null = (() => {
    if (displayStatus !== 'CONVERTED') return null;
    const act = (apiRequest?.activities ?? []).find((a: any) =>
      typeof a.action === 'string' && a.action.includes('Request approved — order')
    );
    if (!act) return null;
    const match = (act.action as string).match(/order (\S+) created/);
    return match ? match[1] : null;
  })();

  function beginEdit(line: RequestLineItem) {
    setEditingLineId(line.id);
    setDraftUnitCny(line.unitPriceCny != null ? String(line.unitPriceCny) : '');
    setDraftRmb(String(line.rmbCostPerUnit || ''));
  }

  function cancelEdit() {
    setEditingLineId(null);
    setDraftUnitCny('');
    setDraftRmb('');
  }

  function saveLine(lineId: string) {
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
      if (!apiRequest) persistRfqLineItems(id, next);
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

  function handleImageUpload(lineId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { alert('Only JPG, PNG, and WEBP images are allowed.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum size is 10MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setLineItems(prev => {
        const next = prev.map(l => l.id === lineId ? { ...l, imageUrl: dataUrl } : l);
        if (!apiRequest) persistRfqLineItems(id, next);
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendQuotationsToClient() {
    const quoted = lineItems.filter(l => l.status === 'Quoted');
    if (!quoted.length) {
      addToast({ type: 'warning', title: 'Nothing to send', description: 'Save a unit price for at least one product first.' });
      return;
    }

    if (apiRequest) {
      setActionLoading(true);
      try {
        const advAmt = parseFloat(advanceAmountINR.replace(/,/g, ''));
        await requestsApi.sendQuotation(id, {
          items: quoted.map(l => ({
            id: l.id,
            quotedRMB: l.rmbCostPerUnit || (l.unitPriceCny ?? 0),
          })),
          advanceAmountINR: Number.isFinite(advAmt) && advAmt > 0 ? advAmt : undefined,
        });
        addToast({
          type: 'success',
          title: 'Quotation sent',
          description: `Per-product quotes (${quoted.length} item${quoted.length === 1 ? '' : 's'}) shared with client.`,
        });
        fetchRequest();
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to send quotation', description: err?.response?.data?.message || 'Please try again.' });
      } finally {
        setActionLoading(false);
      }
    } else {
      addToast({
        type: 'success',
        title: 'Quotations sent',
        description: `Per-product quotes (${quoted.length} line${quoted.length === 1 ? '' : 's'}) shared with ${clientEmail || 'the client'}.`,
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
    if (!apiRequest) return;
    setActionLoading(true);
    try {
      await requestsApi.respondToCounter(id, [{ id: lineId, newQuotedRMB: n }]);
      addToast({ type: 'success', title: 'Response sent', description: 'Client will be notified of the updated price.' });
      setCounterResponseInputs(prev => { const next = { ...prev }; delete next[lineId]; return next; });
      fetchRequest();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to respond', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptCounter(lineId: string, counterPriceINR: number) {
    if (!apiRequest) return;
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
      router.push('/staff/sourcing/requests');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to approve request', description: err?.response?.data?.message || 'Please try again.' });
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
      router.push('/staff/sourcing/requests');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to reject request', description: err?.response?.data?.message || 'Please try again.' });
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

  function postMsg() {
    const now = Date.now();
    if (now - lastMsgSent.current < 2000) { addToast({ type: 'warning', title: 'Please wait before sending again.' }); return; }
    const sanitized = msg.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized) return;
    lastMsgSent.current = now;
    setThread(t => [...t, { by: 'admin', text: sanitized, t: 'just now' }]);
    setMsg('');
  }

  const counteredCount = lineItems.filter(l => l.clientResponse === 'COUNTERED').length;

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-20">
      {/* Lightbox — portal to body */}
      {typeof window === 'object' && lightboxUrl && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black/80">✕</button>
            <img src={lightboxUrl} alt="Reference" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>,
        document.body
      )}

      <Link href="/staff/sourcing/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

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
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setLightboxProof(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxProof(null)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black/80">✕</button>
            <img src={lightboxProof} alt="Payment proof" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>,
        document.body
      )}

      {/* Request header card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="font-tabular font-700 text-lg">{displayRequestId}</span>
          <StatusBadge status={displayStatus as any} />
        </div>
        <p className="text-xs text-muted-foreground break-words">
          {clientCompany} • {clientEmail} • {displayDate} • Budget {displayBudget}
        </p>
      </div>

      {counteredCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-600 text-amber-800">
            {counteredCount} item{counteredCount > 1 ? 's' : ''} have counter offer{counteredCount > 1 ? 's' : ''} from the client — please respond
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4 min-w-0">

          {/* Per-product quotations */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h3 className="font-700 mb-1">Per-product quotations</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Enter RMB cost and unit price in CNY (¥) for each product, then Save.
              <span className="ml-1 font-600 text-[#4A3B52]">¥1 = ₹{CNY_TO_INR.toFixed(2)}</span>
            </p>

            {apiLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading items...</p>
            ) : (
            <>
            {/* Mobile: card-per-product layout */}
            <div className="sm:hidden space-y-3">
              {lineItems.map(line => {
                const effectiveStatus = getEffectiveStatus(displayStatus, line.status);
                const editing = editingLineId === line.id;
                return (
                  <div key={line.id} className={`border rounded-xl p-3 space-y-3 ${line.clientResponse === 'COUNTERED' ? 'border-amber-400 bg-amber-50' : 'border-border'}`}>
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
                            <img src={line.imageUrl} alt={line.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <input type="file" accept="image/*" ref={el => { fileInputRefs.current[line.id] = el; }} onChange={e => handleImageUpload(line.id, e)} className="hidden" />
                          <button type="button" onClick={() => fileInputRefs.current[line.id]?.click()} className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 flex items-center gap-0.5 w-full justify-center mt-1">
                            <Upload className="w-2.5 h-2.5" /> Upload
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-500 text-sm break-words">{line.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{line.specs}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Qty: <span className="font-tabular font-500 text-foreground">{line.quantity}</span></span>
                          <StatusPill status={effectiveStatus.status} label={effectiveStatus.label} />
                        </div>
                        {/* Client response */}
                        {line.clientResponse && (
                          <div className="mt-1.5 flex flex-col gap-1">
                            <ClientResponseBadge response={line.clientResponse} />
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">RMB / unit</label>
                        {editing ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                            <input type="number" min={0} className="input-field py-1.5 text-sm font-tabular w-full pl-5" value={draftRmb} onChange={e => setDraftRmb(e.target.value)} placeholder="RMB" />
                          </div>
                        ) : (
                          <span className="text-sm font-tabular text-muted-foreground">{line.rmbCostPerUnit ? `¥${line.rmbCostPerUnit}` : '—'}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Unit ¥ (CNY)</label>
                        {editing ? (
                          <div>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                              <input type="number" min={0} className="input-field py-1.5 text-sm font-tabular w-full pl-5" value={draftUnitCny} onChange={e => setDraftUnitCny(e.target.value)} placeholder="CNY" />
                            </div>
                            {(() => {
                              const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                              return Number.isFinite(n) && n > 0 ? (
                                <span className="text-[11px] text-muted-foreground font-tabular">≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')}</span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-sm font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end pt-1 border-t border-border">
                      {editing ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-3 py-1.5 text-xs">Save</button>
                          <button type="button" onClick={cancelEdit} className="btn-secondary px-3 py-1.5 text-xs">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => beginEdit(line)} className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit price
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: full table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-[1040px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600 w-16">Image</th>
                    <th className="py-2 text-left font-600">Product</th>
                    <th className="text-right font-600 w-16">Qty</th>
                    <th className="text-right font-600 w-28">RMB / unit</th>
                    <th className="text-right font-600 w-36">Unit ¥ (CNY)</th>
                    <th className="text-left font-600 pl-3 w-36">Status</th>
                    <th className="text-right font-600 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map(line => {
                    const effectiveStatus = getEffectiveStatus(displayStatus, line.status);
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
                                <img src={line.imageUrl} alt={line.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <input type="file" accept="image/*" ref={el => { fileInputRefs.current[line.id] = el; }} onChange={e => handleImageUpload(line.id, e)} className="hidden" />
                              <button type="button" onClick={() => fileInputRefs.current[line.id]?.click()}
                                className="btn-secondary px-1.5 py-0.5 text-[10px] inline-flex items-center gap-0.5 mt-1" title="Upload supplier image">
                                <Upload className="w-2.5 h-2.5" /> Upload
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 align-top">
                          <p className="font-500">{line.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{line.specs}</p>
                          {/* Client response in product cell */}
                          {line.clientResponse && (
                            <div className="mt-1.5">
                              <ClientResponseBadge response={line.clientResponse} />
                            </div>
                          )}
                        </td>
                        <td className="text-right font-tabular align-top py-3">{line.quantity}</td>
                        <td className="text-right align-middle py-3">
                          {editing ? (
                            <div className="relative w-full max-w-[6rem] ml-auto">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                              <input type="number" min={0} className="input-field py-1.5 text-sm font-tabular w-full pl-5" value={draftRmb} onChange={e => setDraftRmb(e.target.value)} placeholder="RMB" />
                            </div>
                          ) : (
                            <span className="font-tabular text-muted-foreground">{line.rmbCostPerUnit ? `¥${line.rmbCostPerUnit}` : '—'}</span>
                          )}
                        </td>
                        <td className="text-right align-middle py-3">
                          {editing ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="relative w-full max-w-[7.5rem] ml-auto">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                <input type="number" min={0} className="input-field py-1.5 text-sm font-tabular w-full pl-5" value={draftUnitCny} onChange={e => setDraftUnitCny(e.target.value)} placeholder="CNY" />
                              </div>
                              {(() => {
                                const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                                return Number.isFinite(n) && n > 0 ? (
                                  <span className="text-[11px] text-muted-foreground font-tabular">≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')} INR</span>
                                ) : null;
                              })()}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                              {line.unitPriceInr != null && (
                                <span className="text-[11px] text-muted-foreground font-tabular">₹{line.unitPriceInr.toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="pl-3 align-middle py-3">
                          <div className="flex flex-col gap-1">
                            <StatusPill status={effectiveStatus.status} label={effectiveStatus.label} />
                            {line.clientResponse === 'COUNTERED' && (
                              <span className="text-[10px] font-700 px-2 py-0.5 rounded bg-amber-400 text-white w-fit">COUNTERED</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right align-middle py-3">
                          {editing ? (
                            <div className="flex flex-col gap-1 items-end">
                              <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-2 py-1 text-xs">Save</button>
                              <button type="button" onClick={cancelEdit} className="btn-secondary px-2 py-1 text-xs">Cancel</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => beginEdit(line)} className="btn-secondary px-2 py-1.5 text-xs inline-flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Edit price
                            </button>
                          )}
                        </td>
                      </tr>
                      {line.clientResponse === 'COUNTERED' && line.counterPriceINR != null && (
                        <tr className="bg-amber-50">
                          <td colSpan={7} className="px-4 pb-4 pt-0">
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
            </>
            )}

            {displayStatus !== 'CONVERTED' && displayStatus !== 'REJECTED' && (
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
                  disabled={actionLoading}
                  className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send quotations to client
                </button>
              </div>
            )}

            {/* Logistics Estimate */}
            <div className="mt-5 pt-5 border-t border-border">
              <h4 className="font-700 mb-3">Logistics Estimate</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Approx Weight</label>
                  <input type="text" className="input-field w-full text-sm" value={logisticsWeight} onChange={e => { setLogisticsWeight(e.target.value); setLogisticsSaved(false); }} placeholder="e.g. 10kg / 0.2 CBM" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Shipping Mode</label>
                  <select className="input-field w-full text-sm" value={logisticsMode} onChange={e => { setLogisticsMode(e.target.value); setLogisticsSaved(false); }}>
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
                    <input type="number" min={0} className="input-field w-full pl-5 text-sm" value={logisticsPricePerKg} onChange={e => { setLogisticsPricePerKg(e.target.value); setLogisticsSaved(false); }} placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Note</label>
                <textarea className="input-field w-full text-sm resize-none" rows={2} value={logisticsNote} onChange={e => { setLogisticsNote(e.target.value); setLogisticsSaved(false); }} />
              </div>
              <button type="button" onClick={saveLogistics} className="btn-primary mt-3 px-4 py-2 text-sm inline-flex items-center gap-2">
                {logisticsSaved && <Check className="w-4 h-4" />}
                {logisticsSaved ? 'Logistics Saved' : 'Save Logistics'}
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h3 className="font-700 mb-3">Conversation</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {thread.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.by === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${m.by === 'admin' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}>
                    {m.by === 'admin' ? 'AS' : 'CL'}
                  </div>
                  <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${m.by === 'admin' ? 'bg-[#f0eef8]' : 'bg-muted/50'}`}>
                    <p>{m.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{m.t}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={msg} onChange={e => setMsg(e.target.value)} className="input-field flex-1 min-w-0" placeholder="Reply to client..." />
              <button onClick={postMsg} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-3 h-fit">
          {/* Payment Verification */}
          {['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(displayStatus) && (
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
                  <p className="text-xs text-amber-700 mt-0.5">Client accepted the quotation. Waiting for payment proof.</p>
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
                            <p className="text-xs font-600">₹{amount.toLocaleString('en-IN')} — {pmt.type === 'FULL' ? 'Full' : 'Advance'}</p>
                            <p className="text-[10px] text-muted-foreground">{pmt.submittedAt ? new Date(pmt.submittedAt).toLocaleString('en-IN') : ''}</p>
                          </div>
                          <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                            pmt.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                            pmt.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{pmt.status}</span>
                        </div>
                        {pmt.proofImageBase64 && (
                          <button onClick={() => setLightboxProof(pmt.proofImageBase64)} className="w-full">
                            <img src={pmt.proofImageBase64} alt="Proof" className="w-full max-h-32 object-contain rounded-lg border border-border bg-muted hover:opacity-80 cursor-pointer" />
                            <p className="text-[10px] text-muted-foreground mt-1">Click to enlarge</p>
                          </button>
                        )}
                        {pmt.status === 'SUBMITTED' && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleVerifyPayment(pmt.id)} disabled={!!verifyingId}
                              className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-1 disabled:opacity-50">
                              {isVerifying ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />…</> : <><Check className="w-3.5 h-3.5" /> Verify</>}
                            </button>
                            <button onClick={() => { setRejectPaymentId(pmt.id); setPaymentRejectReason(''); }} disabled={!!verifyingId}
                              className="flex-1 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-600 hover:bg-red-200 inline-flex items-center justify-center gap-1 disabled:opacity-50">
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

          {displayStatus === 'CONVERTED' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-600 text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This request has been converted to order{' '}
                  <Link href="/staff/sourcing/orders" className="font-700 underline hover:no-underline">
                    {convertedOrderNumber ?? 'an order'}
                  </Link>
                </span>
              </p>
            </div>
          ) : displayStatus === 'REJECTED' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-600 text-red-800">This request was rejected</p>
            </div>
          ) : !['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(displayStatus) ? (
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
          ) : (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Reject Request
            </button>
          )}
          <button onClick={moreInfo} className="btn-secondary w-full py-2.5 text-sm">
            Request More Info
          </button>
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h4 className="font-700 text-sm mb-2">Client Snapshot</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Company:</span> <span className="font-500">{clientCompany}</span></p>
              <p><span className="text-muted-foreground">Email:</span> <span className="font-tabular">{clientEmail || '—'}</span></p>
              <p><span className="text-muted-foreground">GSTIN:</span> <span className="font-tabular">{clientGstin}</span></p>
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
  );
}
