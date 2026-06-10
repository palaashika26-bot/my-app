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
const statusLabel: Record<string, string> = { PENDING: 'Pending', QUOTED: 'Quoted', CONFIRMED: 'Confirmed', IN_TRANSIT: 'In Transit', COMPLETED: 'Completed' };

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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (files.length + picked.length > 3) { addToast({ type: 'warning', title: 'Max 3 files per message' }); e.target.value = ''; return; }
    const results: { name: string; base64: string }[] = [];
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { addToast({ type: 'warning', title: `"${file.name}" exceeds 10 MB` }); continue; }
      results.push({ name: file.name, base64: await toBase64(file) });
    }
    setFiles(prev => [...prev, ...results].slice(0, 3));
    e.target.value = '';
  }

  async function send() {
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    try {
      await logisticsApi.addMessage(id, { text: reply.trim(), attachments: files.map(f => f.base64) });
      setReply(''); setFiles([]); await load();
    } catch { addToast({ type: 'error', title: 'Could not send' }); }
    finally { setSending(false); }
  }

  return (
    <ClientLayout>
      <Link href="/client-dashboard/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Logistics</Link>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !req ? (
        <p className="text-center text-muted-foreground py-20">Request not found.</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-[#4A3B52]" />
                <span className="font-tabular font-700">{req.requestNumber}</span>
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${statusColor[req.status]}`}>{statusLabel[req.status]}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-500">{req.shippingMethod || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-500">{req.weightKg || '—'} KG</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-500">{req.cbm || '—'} CBM</span></div>
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
                  accept="image/jpeg,image/png,image/webp,application/pdf"
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
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP or PDF · Max 10MB</p>
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
            {req.quotePricePerKg && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
                <h4 className="font-700 text-emerald-800 mb-2">Quote</h4>
                <div className="flex justify-between text-sm"><span className="text-emerald-700">Price / KG</span><span className="font-700 text-emerald-900">₹{req.quotePricePerKg}</span></div>
                {req.quoteNote && <p className="text-xs text-emerald-700 mt-2">{req.quoteNote}</p>}
              </div>
            )}

            {req.packagingList.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h4 className="font-700 mb-2 text-sm">Packing List</h4>
                <div className="flex flex-wrap gap-2">{req.packagingList.map((a, i) => <Att key={i} url={a} onZoom={setLightbox} />)}</div>
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
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-4">Conversation with our team</h3>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {req.messages.map(m => {
                const mine = m.senderRole === 'CLIENT';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-[#4A3B52] text-white' : 'bg-muted/50 text-foreground'}`}>
                      <p className="text-[10px] font-600 opacity-70 mb-1">{mine ? 'You' : (m.senderName || 'Elios Team')}</p>
                      {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.attachments.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{m.attachments.map((a, i) => <Att key={i} url={a} onZoom={setLightbox} />)}</div>}
                      <p className="text-[9px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border mt-4 pt-4">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] max-w-[90px] truncate">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf,.xlsx,.xls,.csv" multiple onChange={handleFiles} />
                <button onClick={() => fileInputRef.current?.click()} disabled={files.length >= 3} className="p-2.5 text-muted-foreground hover:text-foreground rounded-lg border border-border disabled:opacity-40"><Paperclip className="w-4 h-4" /></button>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={1} placeholder="Type your message…" className="input-field flex-1 resize-none text-sm" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button onClick={send} disabled={sending || (!reply.trim() && files.length === 0)} className="btn-primary px-4 py-2.5 disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
        </div>
      )}
    </ClientLayout>
  );
}
