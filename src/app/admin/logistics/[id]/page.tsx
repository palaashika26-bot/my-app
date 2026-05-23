'use client';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Package, FileText, MessageSquare, Check, CheckCircle } from 'lucide-react';
import { notFound } from 'next/navigation';

// ─── Backend-ready data functions ─────────────────────────────────────────────
// Replace localStorage calls with fetch('/api/...') when backend is added

async function getLogisticsRequest(id: string) {
  const raw = localStorage.getItem('logistics-requests');
  const requests = JSON.parse(raw || '[]');
  return requests.find((r: any) => r.id === id) || null;
}

async function updateLogisticsRequest(id: string, updates: any) {
  const raw = localStorage.getItem('logistics-requests');
  const requests = JSON.parse(raw || '[]');
  const index = requests.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    localStorage.setItem('logistics-requests', JSON.stringify(requests));
    return requests[index];
  }
  return null;
}

async function getWarehouseSlip(requestId: string) {
  return localStorage.getItem(`logistics-warehouse-slip-${requestId}`);
}

async function getCargoConfirmation(requestId: string) {
  const raw = localStorage.getItem(`logistics-cargo-confirmed-${requestId}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveCargoConfirmation(requestId: string, data: any) {
  localStorage.setItem(`logistics-cargo-confirmed-${requestId}`, JSON.stringify(data));
}

// ─── Warehouse address ─────────────────────────────────────────────────────────
const ELIOS_WAREHOUSE_ADDRESS = {
  companyName: 'Elios Wholesale — China Warehouse',
  contactPerson: 'Mr. Zhang Wei',
  phone: '+86 139 0000 1234',
  address: 'Building 3, Yiwu International Trade City',
  area: 'Chouzhou North Road, Yiwu',
  city: 'Yiwu, Zhejiang Province',
  country: 'China',
  pincode: '322000',
  instructions: [
    'Label each box with your Order ID clearly',
    'Include a packing list inside every box',
    'Take photos of all boxes before shipping',
    'Share tracking number with us after dispatch',
    'Do NOT ship without uploading the warehouse slip first',
  ],
};

interface AdminQuote {
  carrier: string;
  shippingMode: string;
  estimatedPrice: string;
  pricePerKg: string;
  eta: string;
  note: string;
}

interface LogisticsRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  orderId: string;
  weight: string;
  cbm: string;
  shippingMethod: string;
  packagingList: string[];
  status: 'Pending' | 'Quoted' | 'Approved' | 'Rejected' | 'SlipUploaded' | 'CargoReceived';
  submittedAt: string;
  adminQuote: AdminQuote | null;
  slipUploaded?: boolean;
  slipUploadedAt?: string;
  cargoConfirmed?: boolean;
  cargoConfirmedAt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'admin' | 'client';
  text: string;
  time: string;
}

interface CargoConfirmation {
  confirmedBy: string;
  confirmedAt: string;
  notes?: string;
  requestId: string;
}

function loadRequests(): LogisticsRequest[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('logistics-requests') : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRequests(reqs: LogisticsRequest[]) {
  localStorage.setItem('logistics-requests', JSON.stringify(reqs));
}

const statusColor: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Quoted: 'bg-[#e4eeee] text-[#6b8f90]',
  Approved: 'bg-[#ece9f5] text-[#5c5470]',
  SlipUploaded: 'bg-orange-100 text-[#c17b5c]',
  CargoReceived: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const POST_APPROVAL_STATUSES = ['Approved', 'SlipUploaded', 'CargoReceived'];

export default function AdminLogisticsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();

  const [req, setReq] = useState<LogisticsRequest | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);

  const [quoteForm, setQuoteForm] = useState<AdminQuote>({
    carrier: '', shippingMode: 'Sea', estimatedPrice: '', pricePerKg: '', eta: '', note: '',
  });
  const [quoteSaved, setQuoteSaved] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Warehouse shipping state
  const [warehouseSlip, setWarehouseSlip] = useState<string | null>(null);
  const [cargoConfirmation, setCargoConfirmation] = useState<CargoConfirmation | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [cargoLoading, setCargoLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    const all = loadRequests();
    const found = all.find(r => r.id === id);
    if (!found) { setNotFoundState(true); return; }
    setReq(found);
    setQuoteForm(found.adminQuote ?? { carrier: '', shippingMode: found.shippingMethod || 'Sea', estimatedPrice: '', pricePerKg: '', eta: '', note: '' });

    getWarehouseSlip(id).then(slip => setWarehouseSlip(slip));
    getCargoConfirmation(id).then(cargo => setCargoConfirmation(cargo));

    const chatKey = `logistics-chat-${id}`;
    const stored = localStorage.getItem(chatKey);
    if (stored) {
      try { setChatMessages(JSON.parse(stored)); } catch {}
    } else {
      const seed: ChatMessage[] = [{
        id: 'seed-1',
        sender: 'admin',
        text: 'We have received your logistics request and are reviewing the details. We\'ll send you a quote shortly.',
        time: 'Just now',
      }];
      setChatMessages(seed);
      localStorage.setItem(chatKey, JSON.stringify(seed));
    }
  }, [id]);

  if (notFoundState) return notFound();
  if (!req) return null;

  function saveQuote() {
    if (!quoteForm.carrier || !quoteForm.estimatedPrice || !quoteForm.eta) {
      addToast({ type: 'warning', title: 'Fill required fields', description: 'Carrier, price, and ETA are required.' });
      return;
    }
    const all = loadRequests();
    const idx = all.findIndex(r => r.id === id);
    if (idx !== -1) {
      all[idx].status = 'Quoted';
      all[idx].adminQuote = { ...quoteForm };
      saveRequests(all);
      setReq(all[idx]);
    }
    setQuoteSaved(true);
    addToast({ type: 'success', title: 'Quote sent', description: 'The client will see the quote on their logistics page.' });
  }

  async function handleConfirmCargo() {
    if (!staffName.trim()) {
      addToast({ type: 'warning', title: 'Staff name required', description: 'Please enter the warehouse staff name.' });
      return;
    }
    setCargoLoading(true);
    try {
      const confirmData: CargoConfirmation = {
        confirmedBy: staffName.trim(),
        confirmedAt: new Date().toISOString(),
        notes: staffNotes.trim(),
        requestId: id,
      };
      await saveCargoConfirmation(id, confirmData);
      await updateLogisticsRequest(id, {
        status: 'CargoReceived',
        cargoConfirmed: true,
        cargoConfirmedAt: new Date().toISOString(),
      });

      const clientNotifs = JSON.parse(localStorage.getItem('notifications-client') || '[]');
      clientNotifs.unshift({
        id: `notif-${Date.now()}`,
        title: 'Cargo Received at Warehouse',
        message: 'Your cargo has been received at our China warehouse',
        link: `/client-dashboard/logistics/${id}`,
        time: 'Just now',
        read: false,
      });
      localStorage.setItem('notifications-client', JSON.stringify(clientNotifs));

      const updated = await getLogisticsRequest(id);
      if (updated) setReq(updated as LogisticsRequest);
      setCargoConfirmation(confirmData);
      setConfirmSuccess(true);
      addToast({ type: 'success', title: '✅ Cargo confirmed. Client has been notified.' });
    } catch {
      addToast({ type: 'error', title: 'Failed', description: 'Could not confirm cargo. Please try again.' });
    } finally {
      setCargoLoading(false);
    }
  }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'admin',
      text: chatInput.trim(),
      time: 'Just now',
    };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(`logistics-chat-${id}`, JSON.stringify(updated));
    setChatInput('');
  }

  const clientInitials = getInitials(req.clientName);
  const showWarehouseSections = POST_APPROVAL_STATUSES.includes(req.status);

  return (
    <AdminLayout>
      {/* Back + Header */}
      <Link href="/admin/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Logistics
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <Package className="w-5 h-5 text-[#4A3B52]" />
          <span className="font-tabular font-700 text-lg">{req.id}</span>
          <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${statusColor[req.status] || 'bg-muted text-muted-foreground'}`}>{req.status}</span>
        </div>
        <p className="text-xs text-muted-foreground">Order ID: {req.orderId} · Submitted: {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Client Information */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Client Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Name</p><p className="font-500">{req.clientName}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500">{req.clientEmail}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-500 font-tabular">—</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-500">—</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">GSTIN</p><p className="font-500 font-tabular">—</p></div>
            </div>
          </div>

          {/* Logistics Request Details */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics Request Details</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div><p className="text-[10px] uppercase text-muted-foreground">Weight</p><p className="font-600">{req.weight || '—'} KG</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Volume</p><p className="font-600">{req.cbm || '—'} CBM</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Shipping Method</p><p className="font-600">{req.shippingMethod}</p></div>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Packaging List</p>
              {req.packagingList && req.packagingList.length > 0 ? (
                <ul className="space-y-1">
                  {req.packagingList.map((file, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{file}</span>
                      <button className="text-[#4A3B52] text-xs font-600 hover:underline">Download</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No files uploaded.</p>
              )}
            </div>
          </div>

          {/* Send Quote */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-1">Send Quote</h3>

            {POST_APPROVAL_STATUSES.includes(req.status) && req.adminQuote ? (
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-600 bg-green-100 text-green-700 px-3 py-1 rounded-full mb-4">
                  <Check className="w-3.5 h-3.5" /> Approved by Client
                </span>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Carrier</span>
                    <span className="font-600">{req.adminQuote.carrier}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Shipping Mode</span>
                    <span className="font-600">{req.adminQuote.shippingMode}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Estimated Price</span>
                    <span className="font-700 font-tabular">₹{req.adminQuote.estimatedPrice}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Price per KG</span>
                    <span className="font-600 font-tabular">¥{req.adminQuote.pricePerKg}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-600 font-tabular">{req.adminQuote.eta}</span>
                  </div>
                  {req.adminQuote.note && (
                    <div className="pt-1">
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">Note</p>
                      <p className="text-sm text-muted-foreground italic">{req.adminQuote.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {req.status === 'Rejected' && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-600 rounded-lg px-3 py-2 mb-4">
                    Client rejected the previous quote. Send a new one.
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-4">
                  {req.status === 'Quoted' ? 'Quote already sent — update and resend if needed.' : 'Fill in the quote details and send to the client.'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-600 block mb-1">Carrier Name <span className="text-red-500">*</span></label>
                    <input
                      className="input-field text-sm"
                      placeholder="e.g. COSCO, DHL, FedEx"
                      value={quoteForm.carrier}
                      onChange={e => { setQuoteForm(f => ({ ...f, carrier: e.target.value })); setQuoteSaved(false); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Shipping Mode</label>
                    <select
                      className="input-field text-sm"
                      value={quoteForm.shippingMode}
                      onChange={e => { setQuoteForm(f => ({ ...f, shippingMode: e.target.value })); setQuoteSaved(false); }}
                    >
                      <option value="Air">Air</option>
                      <option value="Sea">Sea</option>
                      <option value="Express">Express</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-600 block mb-1">Estimated Price (₹) <span className="text-red-500">*</span></label>
                      <input
                        className="input-field text-sm"
                        type="number"
                        placeholder="e.g. 45000"
                        value={quoteForm.estimatedPrice}
                        onChange={e => { setQuoteForm(f => ({ ...f, estimatedPrice: e.target.value })); setQuoteSaved(false); }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-600 block mb-1">Price per KG (¥)</label>
                      <input
                        className="input-field text-sm"
                        type="number"
                        placeholder="e.g. 28"
                        value={quoteForm.pricePerKg}
                        onChange={e => { setQuoteForm(f => ({ ...f, pricePerKg: e.target.value })); setQuoteSaved(false); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">ETA (date) <span className="text-red-500">*</span></label>
                    <input
                      className="input-field text-sm"
                      type="date"
                      value={quoteForm.eta}
                      onChange={e => { setQuoteForm(f => ({ ...f, eta: e.target.value })); setQuoteSaved(false); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-600 block mb-1">Note / Remarks</label>
                    <textarea
                      className="input-field text-sm resize-none"
                      rows={3}
                      placeholder="Any additional notes for the client…"
                      value={quoteForm.note}
                      onChange={e => { setQuoteForm(f => ({ ...f, note: e.target.value })); setQuoteSaved(false); }}
                    />
                  </div>
                </div>
                <button
                  onClick={saveQuote}
                  className="mt-4 w-full py-2.5 text-sm font-600 rounded-lg bg-[#4A3B52] text-white hover:bg-[#1A1423] transition-colors inline-flex items-center justify-center gap-2"
                >
                  {quoteSaved && <Check className="w-4 h-4" />}
                  Send Quote to Client
                </button>
              </>
            )}
          </div>

          {/* ── Warehouse sections — shown after client approval ───────────── */}
          {showWarehouseSections && (
            <>
              {/* Section A: Warehouse address shared with client */}
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <h3 className="font-700">📦 Warehouse Address Shared with Client</h3>
                  <span className="text-xs font-600 px-2.5 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                    Address shared automatically upon client approval
                  </span>
                </div>
                <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-xl p-4 text-sm">
                  <p className="font-700 mb-1">{ELIOS_WAREHOUSE_ADDRESS.companyName}</p>
                  <p className="text-muted-foreground">Contact: {ELIOS_WAREHOUSE_ADDRESS.contactPerson}</p>
                  <p className="text-muted-foreground">Phone: {ELIOS_WAREHOUSE_ADDRESS.phone}</p>
                  <div className="border-t border-[#e8e4f0] mt-3 pt-3 text-muted-foreground space-y-0.5">
                    <p>{ELIOS_WAREHOUSE_ADDRESS.address}</p>
                    <p>{ELIOS_WAREHOUSE_ADDRESS.area}</p>
                    <p>{ELIOS_WAREHOUSE_ADDRESS.city}</p>
                    <p className="font-600 text-foreground">{ELIOS_WAREHOUSE_ADDRESS.country} — {ELIOS_WAREHOUSE_ADDRESS.pincode}</p>
                  </div>
                </div>
              </div>

              {/* Section B: Client warehouse slip status */}
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h3 className="font-700 mb-3">📄 Client Warehouse Slip</h3>
                {!req.slipUploaded ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
                    <span className="text-base mt-0.5">⏳</span>
                    <div>
                      <p className="font-600">Waiting for client to upload warehouse slip</p>
                      <p className="text-xs mt-1 opacity-80">
                        Request submitted: {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-4">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <p className="font-600">Client has uploaded warehouse slip</p>
                    </div>
                    {warehouseSlip ? (
                      warehouseSlip.startsWith('data:image') ? (
                        <img src={warehouseSlip} alt="Warehouse slip" className="max-h-64 rounded-lg border border-border object-contain mb-3" />
                      ) : (
                        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 mb-3 w-fit">
                          <span className="text-xl">📄</span>
                          <a href={warehouseSlip} download="warehouse-slip.pdf" className="text-sm font-600 text-[#4A3B52] hover:underline">View PDF</a>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground mb-3">Loading preview…</p>
                    )}
                    {req.slipUploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(req.slipUploadedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Client: {req.clientName}</p>
                  </div>
                )}
              </div>

              {/* Section C: Confirm cargo receipt — only shown when slip is uploaded */}
              {(req.slipUploaded || cargoConfirmation) && (
                <div className="bg-card rounded-xl border border-border shadow-card p-5">
                  <h3 className="font-700 mb-1">✅ Confirm Cargo Receipt</h3>
                  {cargoConfirmation ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-700 font-700 mb-3">
                        <CheckCircle className="w-5 h-5" /> Cargo Confirmed
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p><span className="font-600">Confirmed by:</span> <span className="text-muted-foreground">{cargoConfirmation.confirmedBy}</span></p>
                        <p><span className="font-600">Confirmed at:</span> <span className="text-muted-foreground">{new Date(cargoConfirmation.confirmedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
                        {cargoConfirmation.notes && (
                          <p><span className="font-600">Notes:</span> <span className="text-muted-foreground">{cargoConfirmation.notes}</span></p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">Confirm once you have physically received the cargo at our warehouse</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-600 block mb-1">Received by (staff name) <span className="text-red-500">*</span></label>
                          <input
                            className="input-field text-sm"
                            placeholder="Enter warehouse staff name"
                            value={staffName}
                            onChange={e => setStaffName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-600 block mb-1">Notes (optional)</label>
                          <textarea
                            className="input-field text-sm resize-none"
                            rows={2}
                            placeholder="Any notes about the cargo condition"
                            value={staffNotes}
                            onChange={e => setStaffNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmCargo}
                        disabled={cargoLoading || confirmSuccess}
                        className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-600 hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" />
                        {cargoLoading ? 'Confirming…' : 'Confirm Cargo Received'}
                      </button>
                      {confirmSuccess && (
                        <p className="text-xs text-green-600 mt-2 font-600">✅ Cargo confirmed. Client has been notified.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Conversation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Conversation</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.sender === 'admin' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}>
                    {msg.sender === 'admin' ? 'AS' : clientInitials}
                  </div>
                  <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${msg.sender === 'admin' ? 'bg-muted/50' : 'bg-[#f0eef8]'}`}>
                    <p>{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
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
                placeholder="Reply to client..."
              />
              <button
                onClick={sendChatMessage}
                className="px-3 py-2 rounded-lg bg-[#4A3B52] text-white text-sm font-600 hover:bg-[#1A1423] transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
              >
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
              <div className="flex justify-between"><span className="text-muted-foreground">Request ID</span><span className="font-tabular font-600 text-xs">{req.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-tabular font-600 text-xs">{req.orderId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-500">{req.weight || '—'} KG</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-500">{req.cbm || '—'} CBM</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-500">{req.shippingMethod}</span></div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-muted-foreground">Status</span>
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${statusColor[req.status] || 'bg-muted text-muted-foreground'}`}>{req.status}</span>
              </div>
            </div>
          </div>

          {req.adminQuote && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 text-sm mb-3">Sent Quote</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{req.adminQuote.carrier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{req.adminQuote.shippingMode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-tabular font-600">₹{req.adminQuote.estimatedPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Per KG</span><span className="font-tabular font-600">¥{req.adminQuote.pricePerKg}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular">{req.adminQuote.eta}</span></div>
                {req.adminQuote.note && <p className="text-xs text-muted-foreground italic pt-1 border-t border-border">{req.adminQuote.note}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
