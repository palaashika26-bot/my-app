'use client';
import React, { useState, useRef, useCallback, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Package, Copy, Upload, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  logisticsApi,
  LOGISTICS_STATUS_COLORS,
  LOGISTICS_STATUS_LABELS,
} from '@/lib/api/logistics.api';
import { uploadFiles } from '@/lib/upload';
import LogisticsPhaseTimeline from '@/components/LogisticsPhaseTimeline';

const DEFAULT_WAREHOUSE_ADDRESS = {
  companyName: 'Elios Wholesale — China Warehouse',
  contactPerson: 'Mr. Zhang Wei',
  phone: '+86 139 0000 1234',
  address: 'Building 3, Yiwu International Trade City',
  area: 'Chouzhou North Road, Yiwu',
  city: 'Yiwu',
  province: 'Zhejiang Province',
  country: 'China',
  pincode: '322000',
};

function getWarehouseAddress(): Promise<any> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('elios-warehouse-address') : null;
  return Promise.resolve(raw ? JSON.parse(raw) : DEFAULT_WAREHOUSE_ADDRESS);
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ClientLogisticsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [req, setReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState<any>(DEFAULT_WAREHOUSE_ADDRESS);
  const [addressCopied, setAddressCopied] = useState(false);

  const [counterPrice, setCounterPrice] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);

  const fetchReq = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi.getById(id, signal)
      .then(r => {
        const data = r.data?.data;
        if (!data) { setNotFoundState(true); return; }
        setReq(data);
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
    getWarehouseAddress().then(addr => setWarehouseAddress(addr));
    return () => ac.abort();
  }, [fetchReq, fetchMessages]);

  // Debug: Log quote data availability
  useEffect(() => {
    if (req) {
      console.log('[Logistics Quote Debug]', {
        requestId: req.id,
        status: req.status,
        carrier: req.carrier,
        estimatedPriceINR: req.estimatedPriceINR,
        shippingMode: req.shippingMode,
        hasQuote: req.carrier && req.estimatedPriceINR != null,
        hasPrice: req.estimatedPriceINR != null,
      });
    }
  }, [req]);

  if (notFoundState) return notFound();
  if (loading) {
    return (
      <ClientLayout>
        <Link href="/client-dashboard/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Logistics
        </Link>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </ClientLayout>
    );
  }
  if (error) {
    return (
      <ClientLayout>
        <Link href="/client-dashboard/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Logistics
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => fetchReq()} className="text-xs font-600 text-red-700 hover:underline">Retry</button>
          </div>
        </div>
      </ClientLayout>
    );
  }
  if (!req) return null;

  async function handleAccept() {
    setRespondLoading(true);
    try {
      await logisticsApi.respond(id, { response: 'ACCEPTED' });
      addToast({ type: 'success', title: 'Quote accepted', description: 'Proceed to payment to confirm your shipment.' });
      fetchReq();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Please try again.' });
    } finally { setRespondLoading(false); }
  }

  async function handleReject() {
    setRespondLoading(true);
    try {
      await logisticsApi.respond(id, { response: 'REJECTED' });
      addToast({ type: 'info', title: 'Quote rejected', description: 'You have rejected this quote.' });
      fetchReq();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Please try again.' });
    } finally { setRespondLoading(false); }
  }

  async function handleCounter() {
    const price = parseFloat(counterPrice);
    if (!price || price <= 0) {
      addToast({ type: 'warning', title: 'Enter counter price', description: 'Please enter a valid counter price.' });
      return;
    }
    setRespondLoading(true);
    try {
      await logisticsApi.respond(id, { response: 'COUNTERED', counterPriceINR: price, counterNote: counterNote.trim() || undefined });
      addToast({ type: 'success', title: 'Counter offer sent', description: 'Our team will review your counter offer.' });
      setCounterPrice('');
      setCounterNote('');
      fetchReq();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Please try again.' });
    } finally { setRespondLoading(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFileError('Please upload an image (JPG, PNG, or WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File too large. Maximum size is 10MB.');
      return;
    }
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = ev => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUploadSlip() {
    if (!slipFile) return;
    setSlipLoading(true);
    try {
      const uploaded = await uploadFiles([slipFile], 'logistics-slip');
      await logisticsApi.uploadSlip(id, uploaded[0].url, uploaded[0].thumbUrl);
      addToast({ type: 'success', title: 'Slip uploaded', description: 'Our team will confirm receipt shortly.' });
      setSlipFile(null);
      setSlipPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchReq();
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please try again.' });
    } finally { setSlipLoading(false); }
  }

  function copyAddress() {
    const w = warehouseAddress;
    const text = [
      w.companyName,
      `Contact: ${w.contactPerson}`,
      `Phone: ${w.phone}`,
      w.address,
      w.area,
      `${w.city}${w.province ? `, ${w.province}` : ''}`,
      `${w.country} — ${w.pincode}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    });
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

  const clientInitials = user?.name ? getInitials(user.name) : 'CL';
  const hasQuote = req.estimatedPriceINR != null; // Only check for price, carrier might be optional
  const showWarehouseSections = req.status === 'CONFIRMED';
  const slipAlreadyUploaded = !!req.slipUploadedAt;

  return (
    <ClientLayout>
      <Link href="/client-dashboard/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Logistics
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <Package className="w-5 h-5 text-[#4A3B52]" />
          <span className="font-tabular font-700 text-base">{req.requestNumber || req.id}</span>
          <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
            {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      {/* Shipment Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <h3 className="font-700 mb-3">Shipment Details</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-[10px] uppercase text-muted-foreground">Weight</p><p className="font-600 mt-0.5">{req.weightKg ? `${Number(req.weightKg)} KG` : '— KG'}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Volume</p><p className="font-600 mt-0.5">{req.volumeCbm ? `${Number(req.volumeCbm)} CBM` : '— CBM'}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Method</p><p className="font-600 mt-0.5">{req.shippingMethod}</p></div>
        </div>
      </div>

      {/* Quote card — shown when QUOTED */}
      {req.status === 'QUOTED' && hasQuote && (
        <div className="bg-[#f5f4f7] border border-[#e8e4f0] rounded-xl p-5 mb-5">
          <p className="text-xs font-700 text-[#5c5470] mb-3 uppercase tracking-wide">Quote from Admin</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-[10px] uppercase text-muted-foreground">Carrier</p><p className="font-600">{req.carrier || '(Not specified)'}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Mode</p><p className="font-600">{req.shippingMode || req.shippingMethod || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Estimated Price</p><p className="font-700 text-lg">₹{Number(req.estimatedPriceINR).toLocaleString('en-IN')}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Price per KG</p><p className="font-600">{req.pricePerKgCNY ? `¥${Number(req.pricePerKgCNY)}` : '—'}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">ETA</p><p className="font-600">{req.eta || '—'}</p></div>
            {req.quoteNote && (
              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase text-muted-foreground">Note</p>
                <p className="text-sm italic text-muted-foreground mt-0.5">{req.quoteNote}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleAccept}
              disabled={respondLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-600 hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" /> {respondLoading ? 'Processing…' : 'Accept'}
            </button>
            <button
              onClick={handleReject}
              disabled={respondLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 transition-colors disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>
          {/* Counter offer */}
          <div className="mt-4 pt-4 border-t border-[#e8e4f0]">
            <p className="text-xs font-700 text-muted-foreground mb-2">Or send a counter offer</p>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Your price (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={counterPrice}
                  onChange={e => setCounterPrice(e.target.value)}
                  className="input-field text-sm w-36"
                  placeholder="e.g. 35000"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-[10px] text-muted-foreground block mb-0.5">Note (optional)</label>
                <input
                  value={counterNote}
                  onChange={e => setCounterNote(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="Your note..."
                />
              </div>
              <button
                onClick={handleCounter}
                disabled={respondLoading || !counterPrice}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-600 hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                Send Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countered status — waiting for admin */}
      {req.status === 'COUNTERED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 flex items-center gap-2 text-amber-800">
          <MessageSquare className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-600">Your counter offer (₹{Number(req.counterPriceINR).toLocaleString('en-IN')}) is being reviewed. We&apos;ll get back to you shortly.</p>
        </div>
      )}

      {/* Accepted — show payment prompt */}
      {req.status === 'ACCEPTED' && (
        <div className="bg-[#ece9f5] border border-[#d8d0e8] rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-[#5c5470]" />
            <p className="font-700 text-[#5c5470]">Quote Accepted!</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Please proceed to payment to confirm your shipment.</p>
          <Link
            href={`/payment/logistics/${id}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#5c5470] text-white text-sm font-600 hover:bg-[#4A3B52] transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Proceed to Payment
          </Link>
        </div>
      )}

      {/* Rejected state */}
      {req.status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5 flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-600">You rejected this quote. Please contact our team if you need a revised quote.</p>
        </div>
      )}

      {/* ── Warehouse shipping flow — shown after CONFIRMED ─────────────────── */}
      {showWarehouseSections && (
        <>
          {/* Warehouse Address Card */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
            <h3 className="font-700 mb-1">Ship Your Cargo to Our Warehouse</h3>
            <p className="text-sm text-muted-foreground mb-4">Please ship your goods to the address below and upload the warehouse slip.</p>

            <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="font-700 text-sm">{warehouseAddress.companyName}</p>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <p><span className="font-600">Contact:</span> <span className="text-muted-foreground">{warehouseAddress.contactPerson}</span></p>
                <p><span className="font-600">Phone:</span> <span className="text-muted-foreground">{warehouseAddress.phone}</span></p>
              </div>
              <div className="border-t border-[#e8e4f0] pt-3 space-y-0.5 text-sm text-muted-foreground mb-4">
                <p>{warehouseAddress.address}</p>
                <p>{warehouseAddress.area}</p>
                <p>{warehouseAddress.city}{warehouseAddress.province ? `, ${warehouseAddress.province}` : ''}</p>
                <p className="font-600 text-foreground">{warehouseAddress.country} — {warehouseAddress.pincode}</p>
              </div>
              <button
                onClick={copyAddress}
                className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg bg-[#5c5470] text-white hover:bg-[#4A3B52] transition-colors"
              >
                {addressCopied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {addressCopied ? 'Copied!' : 'Copy Full Address'}
              </button>
            </div>
          </div>

          {/* Slip upload */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
            <h3 className="font-700 mb-1">Upload Warehouse Slip</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload the slip/receipt from our warehouse confirming your shipment</p>

            {slipAlreadyUploaded && !slipFile ? (
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-600 px-2.5 py-1 rounded-full bg-green-100 text-green-700">Slip Uploaded</span>
                  {req.slipUploadedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.slipUploadedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {req.warehouseSlipUrl && (
                  req.warehouseSlipUrl.startsWith('data:image') ? (
                    <img src={req.warehouseSlipUrl} alt="Warehouse slip" className="max-h-48 rounded-lg border border-border object-contain mb-3" />
                  ) : (
                    <a href={req.warehouseSlipUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 mb-3 text-sm font-600 text-[#4A3B52] hover:underline">
                      View Slip
                    </a>
                  )
                )}
                <p className="text-sm text-muted-foreground mb-3">Waiting for our team to confirm cargo receipt.</p>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {!slipPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#c17b5c]/40 rounded-xl p-8 text-center cursor-pointer hover:border-[#c17b5c] hover:bg-[#faf9f7] transition-colors"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-[#c17b5c]" />
                    <p className="text-sm font-600 text-foreground">Click to upload warehouse slip</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB</p>
                  </div>
                ) : (
                  <div className="mb-3">
                    {slipPreview !== 'pdf' ? (
                      <img src={slipPreview} alt="Preview" className="max-h-48 rounded-lg border border-border object-contain" />
                    ) : (
                      <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 w-fit">
                        <span className="text-sm font-600">{slipFile?.name}</span>
                      </div>
                    )}
                    <button onClick={() => { setSlipFile(null); setSlipPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-xs text-muted-foreground hover:underline mt-2 block">Remove</button>
                  </div>
                )}
                {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}
                {slipFile && (
                  <button onClick={handleUploadSlip} disabled={slipLoading} className="mt-3 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60">
                    <Upload className="w-4 h-4" />
                    {slipLoading ? 'Uploading…' : 'Upload Slip'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cargo confirmed notification */}
          {req.cargoConfirmedAt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-2 text-green-700 font-700 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span>Cargo Received at Our Warehouse!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">Your shipment has been received and confirmed by our warehouse team.</p>
              <div className="space-y-1.5 text-sm mb-4">
                <p><span className="font-600 text-foreground">Confirmed by:</span> <span className="text-muted-foreground">{req.cargoConfirmedBy}</span></p>
                <p><span className="font-600 text-foreground">Confirmed at:</span> <span className="text-muted-foreground">{new Date(req.cargoConfirmedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
              </div>
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
        isAdminOrStaff={false}
        isClient={true}
        onUpdate={fetchReq}
      />

      {/* Conversation */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="font-700 mb-3">Conversation</h3>
        {chatMessages.length === 0 && (
          <p className="text-sm text-muted-foreground mb-3">No messages yet. Send a message to our team.</p>
        )}
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {chatMessages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-3 ${msg.senderRole === 'CLIENT' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.senderRole === 'CLIENT' ? 'bg-[#4A3B52]' : 'bg-primary'}`}>
                {msg.senderRole === 'CLIENT' ? clientInitials : 'AS'}
              </div>
              <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${msg.senderRole === 'CLIENT' ? 'bg-[#f0eef8]' : 'bg-muted/50'}`}>
                <p>{msg.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
            className="input-field flex-1 min-w-0"
            placeholder="Send a message..."
          />
          <button
            onClick={sendChatMessage}
            className="px-3 py-2 rounded-lg bg-[#4A3B52] text-white text-sm font-600 hover:bg-[#1A1423] transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}
