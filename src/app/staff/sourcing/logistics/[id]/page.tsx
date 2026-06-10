'use client';
import React, { useState, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Package, FileText, MessageSquare, Check, CheckCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  logisticsApi,
  LOGISTICS_STATUS_COLORS,
  LOGISTICS_STATUS_LABELS,
  type ShippingMethod,
} from '@/lib/api/logistics.api';
import LogisticsPhaseTimeline from '@/components/LogisticsPhaseTimeline';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const POST_QUOTE_STATUSES = ['ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED'];

export default function SourcingLogisticsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();

  const [req, setReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);

  const [quoteForm, setQuoteForm] = useState<any>({
    carrier: '', shippingMode: 'Sea', estimatedPriceINR: '', pricePerKgCNY: '', eta: '', quoteNote: '',
  });
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [warehouseSlipUrl, setWarehouseSlipUrl] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [cargoLoading, setCargoLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Counter response
  const [counterForm, setCounterForm] = useState<any>({
    estimatedPriceINR: '', pricePerKgCNY: '', carrier: '', shippingMode: '', eta: '', quoteNote: '',
  });
  const [counterLoading, setCounterLoading] = useState(false);

  const fetchReq = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi.getById(id, signal)
      .then(r => {
        const d = r.data?.data;
        if (!d) { setNotFoundState(true); return; }
        setReq(d);
        setWarehouseSlipUrl(d.warehouseSlipUrl || null);
        if (d.carrier || d.estimatedPriceINR) {
          setQuoteForm({
            carrier: d.carrier || '',
            shippingMode: d.shippingMode || d.shippingMethod || 'Sea',
            estimatedPriceINR: d.estimatedPriceINR?.toString() || '',
            pricePerKgCNY: d.pricePerKgCNY?.toString() || '',
            eta: d.eta ? d.eta.split('T')[0] : '',
            quoteNote: d.quoteNote || '',
          });
        }
        if (d.status === 'COUNTERED') {
          setCounterForm({
            estimatedPriceINR: d.counterPriceINR?.toString() || '',
            pricePerKgCNY: d.pricePerKgCNY?.toString() || '',
            carrier: d.carrier || '',
            shippingMode: d.shippingMode || d.shippingMethod || 'Sea',
            eta: d.eta ? d.eta.split('T')[0] : '',
            quoteNote: d.quoteNote || '',
          });
        }
      })
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') {
          if (err?.response?.status === 404) setNotFoundState(true);
          else setError('Failed to load logistics request.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const fetchMessages = useCallback((signal?: AbortSignal) => {
    logisticsApi.getMessages(id, undefined)
      .then(r => setChatMessages(r.data?.data ?? []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    fetchReq(ac.signal);
    fetchMessages(ac.signal);
    return () => ac.abort();
  }, [fetchReq, fetchMessages]);

  if (notFoundState) return notFound();
  if (loading) {
    return (
      <div>
        <Link href="/staff/sourcing/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Logistics
        </Link>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <Link href="/staff/sourcing/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Logistics
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <button onClick={() => fetchReq()} className="text-xs font-600 text-red-700 hover:underline">Retry</button>
        </div>
      </div>
    );
  }
  if (!req) return null;

  async function saveQuote() {
    if (!quoteForm.carrier || !quoteForm.estimatedPriceINR || !quoteForm.eta) {
      addToast({ type: 'warning', title: 'Fill required fields', description: 'Carrier, price, and ETA are required.' });
      return;
    }
    setQuoteLoading(true);
    try {
      await logisticsApi.quote(id, {
        carrier: quoteForm.carrier,
        shippingMode: quoteForm.shippingMode as ShippingMethod,
        estimatedPriceINR: parseFloat(quoteForm.estimatedPriceINR),
        pricePerKgCNY: quoteForm.pricePerKgCNY ? parseFloat(quoteForm.pricePerKgCNY) : undefined,
        eta: quoteForm.eta,
        quoteNote: quoteForm.quoteNote.trim() || undefined,
      });
      addToast({ type: 'success', title: 'Quote sent', description: 'The client will see the quote.' });
      fetchReq();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Could not send quote.' });
    } finally { setQuoteLoading(false); }
  }

  async function handleRespondCounter() {
    if (!counterForm.estimatedPriceINR) {
      addToast({ type: 'warning', title: 'Price required', description: 'Enter the updated price.' });
      return;
    }
    setCounterLoading(true);
    try {
      await logisticsApi.respondCounter(id, {
        estimatedPriceINR: parseFloat(counterForm.estimatedPriceINR),
        pricePerKgCNY: counterForm.pricePerKgCNY ? parseFloat(counterForm.pricePerKgCNY) : undefined,
        carrier: counterForm.carrier.trim() || undefined,
        shippingMode: counterForm.shippingMode ? (counterForm.shippingMode as ShippingMethod) : undefined,
        eta: counterForm.eta || undefined,
        quoteNote: counterForm.quoteNote.trim() || undefined,
      });
      addToast({ type: 'success', title: 'Counter response sent' });
      fetchReq();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Could not respond.' });
    } finally { setCounterLoading(false); }
  }

  async function handleConfirmCargo() {
    if (!staffName.trim()) {
      addToast({ type: 'warning', title: 'Staff name required' });
      return;
    }
    setCargoLoading(true);
    try {
      await logisticsApi.confirmCargo(id, staffName.trim());
      setConfirmSuccess(true);
      addToast({ type: 'success', title: 'Cargo confirmed.' });
      fetchReq();
    } catch {
      addToast({ type: 'error', title: 'Failed', description: 'Could not confirm cargo.' });
    } finally { setCargoLoading(false); }
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) return;
    try {
      await logisticsApi.sendMessage(id, chatInput.trim());
      setChatInput('');
      fetchMessages();
    } catch {
      addToast({ type: 'error', title: 'Failed', description: 'Could not send message.' });
    }
  }

  const clientName = req.client?.companyName || req.client?.user?.email || 'Client';
  const clientInitials = getInitials(clientName);
  const hasQuote = req.carrier && req.estimatedPriceINR != null;
  const showWarehouseSections = req.status === 'CONFIRMED';
  const showCounterResponse = req.status === 'COUNTERED';
  const showQuoteForm = !POST_QUOTE_STATUSES.includes(req.status) && !showCounterResponse;

  return (
    <div>
      <Link href="/staff/sourcing/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Logistics
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <Package className="w-5 h-5 text-[#4A3B52]" />
          <span className="font-tabular font-700 text-lg">{req.requestNumber || req.id}</span>
          <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
            {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Client Info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Client Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Name</p><p className="font-500">{req.client?.companyName || req.client?.user?.firstName || '—'}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500">{req.client?.user?.email || '—'}</p></div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics Request Details</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div><p className="text-[10px] uppercase text-muted-foreground">Weight</p><p className="font-600">{req.weightKg ? `${Number(req.weightKg)} KG` : '— KG'}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Volume</p><p className="font-600">{req.volumeCbm ? `${Number(req.volumeCbm)} CBM` : '— CBM'}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Shipping Method</p><p className="font-600">{req.shippingMethod}</p></div>
            </div>
            {(req.packagingListUrls?.length > 0) && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-2">Packaging List</p>
                <ul className="space-y-1">
                  {req.packagingListUrls.map((url: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{url.split('/').pop() || url}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#4A3B52] text-xs font-600 hover:underline">View</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Counter-offer response */}
          {showCounterResponse && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-700 mb-1">Client Counter Offer</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Client sent a counter offer of <strong>₹{Number(req.counterPriceINR).toLocaleString('en-IN')}</strong>.
                {req.counterNote && <span className="block mt-1 italic">Note: {req.counterNote}</span>}
              </p>
              <div className="space-y-3 border-t border-amber-200 pt-4">
                <p className="text-xs font-600 text-muted-foreground">Respond with an updated quote:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-600 block mb-1">Price (₹) <span className="text-red-500">*</span></label>
                    <input className="input-field text-sm" type="number" placeholder="e.g. 40000" value={counterForm.estimatedPriceINR} onChange={e => setCounterForm((f: any) => ({ ...f, estimatedPriceINR: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Per KG (¥)</label>
                    <input className="input-field text-sm" type="number" placeholder="e.g. 28" value={counterForm.pricePerKgCNY} onChange={e => setCounterForm((f: any) => ({ ...f, pricePerKgCNY: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Carrier</label>
                    <input className="input-field text-sm" placeholder="e.g. COSCO" value={counterForm.carrier} onChange={e => setCounterForm((f: any) => ({ ...f, carrier: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Mode</label>
                    <select className="input-field text-sm" value={counterForm.shippingMode} onChange={e => setCounterForm((f: any) => ({ ...f, shippingMode: e.target.value }))}>
                      <option value="Air">Air</option><option value="Sea">Sea</option><option value="Express">Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">ETA</label>
                    <input className="input-field text-sm" type="date" value={counterForm.eta} onChange={e => setCounterForm((f: any) => ({ ...f, eta: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Note</label>
                    <input className="input-field text-sm" placeholder="Note..." value={counterForm.quoteNote} onChange={e => setCounterForm((f: any) => ({ ...f, quoteNote: e.target.value }))} />
                  </div>
                </div>
                <button onClick={handleRespondCounter} disabled={counterLoading} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-600 hover:bg-amber-700 transition-colors disabled:opacity-60">
                  {counterLoading ? 'Sending…' : 'Send Updated Quote'}
                </button>
              </div>
            </div>
          )}

          {/* Send Quote */}
          {showQuoteForm && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-1">Send Quote</h3>
              {req.status === 'REJECTED' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-600 rounded-lg px-3 py-2 mb-4">
                  Client rejected the previous quote. Send a new one.
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-4">
                {req.status === 'QUOTED' ? 'Quote already sent — update and resend if needed.' : 'Fill in the quote details.'}
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-600 block mb-1">Carrier Name <span className="text-red-500">*</span></label>
                    <input className="input-field text-sm" placeholder="e.g. COSCO" value={quoteForm.carrier} onChange={e => setQuoteForm((f: any) => ({ ...f, carrier: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Shipping Mode</label>
                    <select className="input-field text-sm" value={quoteForm.shippingMode} onChange={e => setQuoteForm((f: any) => ({ ...f, shippingMode: e.target.value }))}>
                      <option value="Air">Air</option><option value="Sea">Sea</option><option value="Express">Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Price (₹) <span className="text-red-500">*</span></label>
                    <input className="input-field text-sm" type="number" placeholder="e.g. 45000" value={quoteForm.estimatedPriceINR} onChange={e => setQuoteForm((f: any) => ({ ...f, estimatedPriceINR: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Per KG (¥)</label>
                    <input className="input-field text-sm" type="number" placeholder="e.g. 28" value={quoteForm.pricePerKgCNY} onChange={e => setQuoteForm((f: any) => ({ ...f, pricePerKgCNY: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">ETA (date) <span className="text-red-500">*</span></label>
                    <input className="input-field text-sm" type="date" value={quoteForm.eta} onChange={e => setQuoteForm((f: any) => ({ ...f, eta: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Note</label>
                    <input className="input-field text-sm" placeholder="Additional notes..." value={quoteForm.quoteNote} onChange={e => setQuoteForm((f: any) => ({ ...f, quoteNote: e.target.value }))} />
                  </div>
                </div>
                <button onClick={saveQuote} disabled={quoteLoading} className="w-full py-2.5 text-sm font-600 rounded-lg bg-[#4A3B52] text-white hover:bg-[#1A1423] transition-colors inline-flex items-center justify-center gap-2">
                  {quoteLoading ? 'Sending…' : 'Send Quote to Client'}
                </button>
              </div>
            </div>
          )}

          {/* Accepted quote summary */}
          {POST_QUOTE_STATUSES.includes(req.status) && hasQuote && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Sent Quote</h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-600 bg-green-100 text-green-700 px-3 py-1 rounded-full mb-4">
                <Check className="w-3.5 h-3.5" /> {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
              </span>
              <div className="space-y-2 text-sm">
                {[['Carrier', req.carrier], ['Mode', req.shippingMode], ['Price', `₹${Number(req.estimatedPriceINR).toLocaleString('en-IN')}`], ['Per KG', req.pricePerKgCNY ? `¥${Number(req.pricePerKgCNY)}` : '—'], ['ETA', req.eta || '—']].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-600 font-tabular">{val}</span>
                  </div>
                ))}
                {req.quoteNote && <p className="text-xs text-muted-foreground italic pt-1">{req.quoteNote}</p>}
              </div>
            </div>
          )}

          {/* Warehouse sections */}
          {showWarehouseSections && (
            <>
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h3 className="font-700 mb-3">📄 Client Warehouse Slip</h3>
                {!req.slipUploadedAt ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
                    <div><p className="font-600">Waiting for client to upload warehouse slip</p></div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-3">
                      <CheckCircle className="w-4 h-4" />
                      <p className="font-600">Client has uploaded warehouse slip</p>
                    </div>
                    {warehouseSlipUrl && (
                      warehouseSlipUrl.startsWith('data:image')
                        ? <img src={warehouseSlipUrl} alt="Warehouse slip" className="max-h-64 rounded-lg border border-border object-contain" />
                        : <a href={warehouseSlipUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 text-sm font-600 text-[#4A3B52] hover:underline">View Slip</a>
                    )}
                  </div>
                )}
              </div>

              {(req.slipUploadedAt) && (
                <div className="bg-card rounded-xl border border-border shadow-card p-5">
                  <h3 className="font-700 mb-1">✅ Confirm Cargo Receipt</h3>
                  {req.cargoConfirmedAt ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-700 font-700 mb-3"><CheckCircle className="w-5 h-5" /> Cargo Confirmed</div>
                      <div className="space-y-1.5 text-sm">
                        <p><span className="font-600">Confirmed by:</span> <span className="text-muted-foreground">{req.cargoConfirmedBy}</span></p>
                        <p><span className="font-600">Confirmed at:</span> <span className="text-muted-foreground">{new Date(req.cargoConfirmedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">Confirm once you have physically received the cargo</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-600 block mb-1">Received by (staff name) <span className="text-red-500">*</span></label>
                          <input className="input-field text-sm" placeholder="Enter staff name" value={staffName} onChange={e => setStaffName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-600 block mb-1">Notes (optional)</label>
                          <textarea className="input-field text-sm resize-none" rows={2} placeholder="Any notes" value={staffNotes} onChange={e => setStaffNotes(e.target.value)} />
                        </div>
                      </div>
                      <button onClick={handleConfirmCargo} disabled={cargoLoading || confirmSuccess} className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-600 hover:bg-green-700 transition-colors disabled:opacity-60">
                        <Check className="w-4 h-4" />
                        {cargoLoading ? 'Confirming…' : 'Confirm Cargo Received'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Phase Timeline */}
          <LogisticsPhaseTimeline
            logisticsId={id}
            currentPhase={req.phase}
            completedPhases={req.completedPhases}
            deliveryMode={req.deliveryMode}
            deliveryAddress={req.deliveryAddress}
            status={req.status}
            isAdminOrStaff={true}
            isClient={false}
            onUpdate={fetchReq}
          />

          {/* Conversation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Conversation</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto mb-3">
              {chatMessages.map((msg: any) => (
                <div key={msg.id} className={`flex gap-3 ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}>
                    {msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'ME' : clientInitials}
                  </div>
                  <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${msg.senderRole === 'ADMIN' || msg.senderRole === 'STAFF' ? 'bg-muted/50' : 'bg-[#f0eef8]'}`}>
                    <p>{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className="input-field flex-1 min-w-0" placeholder="Reply to client..." />
              <button onClick={sendChatMessage} className="px-3 py-2 rounded-lg bg-[#4A3B52] text-white text-sm font-600 hover:bg-[#1A1423] transition-colors inline-flex items-center gap-1.5 flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h4 className="font-700 text-sm mb-3">Request Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Request ID</span><span className="font-tabular font-600 text-xs">{req.requestNumber || req.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-500">{req.weightKg ? `${Number(req.weightKg)} KG` : '— KG'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-500">{req.volumeCbm ? `${Number(req.volumeCbm)} CBM` : '— CBM'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-500">{req.shippingMethod}</span></div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-muted-foreground">Status</span>
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
                  {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
                </span>
              </div>
            </div>
          </div>
          {hasQuote && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 text-sm mb-3">Sent Quote</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{req.carrier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{req.shippingMode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-tabular font-600">₹{Number(req.estimatedPriceINR).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Per KG</span><span className="font-tabular font-600">{req.pricePerKgCNY ? `¥${Number(req.pricePerKgCNY)}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular">{req.eta || '—'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
