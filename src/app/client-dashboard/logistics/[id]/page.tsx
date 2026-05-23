'use client';
import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Package, Copy, Upload } from 'lucide-react';
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

async function saveWarehouseSlip(requestId: string, base64: string) {
  localStorage.setItem(`logistics-warehouse-slip-${requestId}`, base64);
}

async function getCargoConfirmation(requestId: string) {
  const raw = localStorage.getItem(`logistics-cargo-confirmed-${requestId}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveCargoConfirmation(requestId: string, data: any) {
  localStorage.setItem(`logistics-cargo-confirmed-${requestId}`, JSON.stringify(data));
}

// ─── Warehouse address ─────────────────────────────────────────────────────────
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

async function getWarehouseAddress() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('elios-warehouse-address') : null;
  return raw ? JSON.parse(raw) : DEFAULT_WAREHOUSE_ADDRESS;
}

const WAREHOUSE_INSTRUCTIONS = [
  'Before delivery, please contact the warehouse, pack the woven bag, and write the label and warehouse number on the outer box.',
  'The warehouse does not cover unloading, please arrange it by yourself.',
  'Warehouse entry fee to be paid by client/factory.',
  'If the goods contain batteries, powders, liquids, food and other sensitive items, please be sure to note.',
  'If you arrange express delivery to the warehouse, please put the packing list in a plastic bag and paste it on a box of goods. Cash on delivery is not accepted.',
  'When delivering goods, be sure to provide a packing list that meets the requirements of our company\'s format (warehouse number + mark + box number + product name + ingredient + quantity per piece + brand + whether the document declaration is electrically magnetic or contains liquid powder, etc.). You need to provide the production and sales unit and the value of the goods, otherwise the warehouse will refuse to accept it.',
  'The length, width and height of the clothing bag should not exceed 100×100×100 cm, and the weight of a single piece cannot exceed 55 KG. If the above requirements are exceeded, the warehouse will require a change of packaging. Please pay attention!!!',
];

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

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const statusColor: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Quoted: 'bg-[#e4eeee] text-[#6b8f90]',
  Approved: 'bg-[#ece9f5] text-[#5c5470]',
  SlipUploaded: 'bg-orange-100 text-[#c17b5c]',
  CargoReceived: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function ClientLogisticsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const { user } = useAuth();

  const [req, setReq] = useState<LogisticsRequest | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Warehouse shipping state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warehouseSlip, setWarehouseSlip] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [replacingSlip, setReplacingSlip] = useState(false);
  const [cargoConfirmation, setCargoConfirmation] = useState<CargoConfirmation | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [warehouseAddress, setWarehouseAddress] = useState<any>(DEFAULT_WAREHOUSE_ADDRESS);

  useEffect(() => {
    const all = loadRequests();
    const found = all.find(r => r.id === id);
    if (!found) { setNotFoundState(true); return; }
    setReq(found);

    getWarehouseAddress().then(addr => setWarehouseAddress(addr));
    getWarehouseSlip(id).then(slip => setWarehouseSlip(slip));
    getCargoConfirmation(id).then(cargo => setCargoConfirmation(cargo));

    const chatKey = `logistics-chat-${id}`;
    const stored = localStorage.getItem(chatKey);
    if (stored) {
      try { setChatMessages(JSON.parse(stored)); } catch {}
    } else {
      setChatMessages([]);
    }
  }, [id]);

  if (notFoundState) return notFound();
  if (!req) return null;

  function handleApprove() {
    if (!req || !req.adminQuote) return;
    const all = loadRequests();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;
    all[idx].status = 'Approved';
    saveRequests(all);

    const tracking = (() => {
      try {
        const raw = localStorage.getItem('logistics-tracking');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    tracking.push({
      trackingId: 'TRK-' + Date.now().toString(36).toUpperCase(),
      orderId: req.orderId,
      clientName: req.clientName,
      carrier: req.adminQuote.carrier,
      shippingMode: req.adminQuote.shippingMode,
      currentLocation: 'Shenzhen, China',
      eta: req.adminQuote.eta,
      status: 'At China Warehouse',
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('logistics-tracking', JSON.stringify(tracking));

    setReq({ ...all[idx] });
    addToast({ type: 'success', title: 'Shipment approved', description: 'Your shipment has been approved and added to tracking.' });
  }

  function handleReject() {
    if (!req) return;
    const all = loadRequests();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;
    all[idx].status = 'Rejected';
    saveRequests(all);
    setReq({ ...all[idx] });
    addToast({ type: 'error', title: 'Quote rejected', description: 'You have rejected the quote.' });
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File too large. Maximum size is 10MB.');
      return;
    }
    setSlipFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setSlipPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setSlipPreview('pdf');
    }
  }

  async function handleUploadSlip() {
    if (!slipFile || !req) return;
    setSlipLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(slipFile);
      });

      await saveWarehouseSlip(id, base64);
      await updateLogisticsRequest(id, {
        slipUploaded: true,
        slipUploadedAt: new Date().toISOString(),
        status: 'SlipUploaded',
      });

      const adminNotifs = JSON.parse(localStorage.getItem('notifications-admin') || '[]');
      adminNotifs.unshift({
        id: `notif-${Date.now()}`,
        title: 'Warehouse Slip Uploaded',
        message: `Client uploaded warehouse slip for logistics request ${id}`,
        link: `/admin/logistics/${id}`,
        time: 'Just now',
        read: false,
      });
      localStorage.setItem('notifications-admin', JSON.stringify(adminNotifs));

      const updated = await getLogisticsRequest(id);
      if (updated) setReq(updated as LogisticsRequest);
      setWarehouseSlip(base64);
      setSlipFile(null);
      setSlipPreview(null);
      setReplacingSlip(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addToast({ type: 'success', title: 'Slip uploaded successfully!', description: 'Our team will confirm receipt shortly.' });
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please try again.' });
    } finally {
      setSlipLoading(false);
    }
  }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'client',
      text: chatInput.trim(),
      time: 'Just now',
    };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(`logistics-chat-${id}`, JSON.stringify(updated));
    setChatInput('');
  }

  const clientInitials = user?.name ? getInitials(user.name) : 'CL';
  const showWarehouseSections = ['Approved', 'SlipUploaded', 'CargoReceived'].includes(req.status);
  const slipAlreadyUploaded = req.slipUploaded && !replacingSlip;

  return (
    <ClientLayout>
      <Link href="/client-dashboard/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Logistics
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <Package className="w-5 h-5 text-[#4A3B52]" />
          <span className="font-tabular font-700 text-base">{req.id}</span>
          <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${statusColor[req.status] || 'bg-muted text-muted-foreground'}`}>{req.status}</span>
        </div>
        <p className="text-xs text-muted-foreground">Order ID: {req.orderId} · Submitted: {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      {/* Request Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <h3 className="font-700 mb-3">Shipment Details</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-[10px] uppercase text-muted-foreground">Weight</p><p className="font-600 mt-0.5">{req.weight || '—'} KG</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Volume</p><p className="font-600 mt-0.5">{req.cbm || '—'} CBM</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Method</p><p className="font-600 mt-0.5">{req.shippingMethod}</p></div>
        </div>
      </div>

      {/* Quote card — shown when Quoted */}
      {req.status === 'Quoted' && req.adminQuote && (
        <div className="bg-[#f5f4f7] border border-[#e8e4f0] rounded-xl p-5 mb-5">
          <p className="text-xs font-700 text-[#5c5470] mb-3 uppercase tracking-wide">Quote from Admin</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-[10px] uppercase text-muted-foreground">Carrier</p><p className="font-600">{req.adminQuote.carrier}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Mode</p><p className="font-600">{req.adminQuote.shippingMode}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Estimated Price</p><p className="font-700 text-lg">₹{req.adminQuote.estimatedPrice}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Price per KG</p><p className="font-600">¥{req.adminQuote.pricePerKg}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">ETA</p><p className="font-600">{req.adminQuote.eta}</p></div>
            {req.adminQuote.note && (
              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase text-muted-foreground">Note</p>
                <p className="text-sm italic text-muted-foreground mt-0.5">{req.adminQuote.note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-600 hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Rejected state */}
      {req.status === 'Rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5 flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-600">You rejected this quote. Please contact our team if you need a revised quote.</p>
        </div>
      )}

      {/* ── Warehouse shipping flow — shown after approval ─────────────────── */}
      {showWarehouseSections && (
        <>
          {/* Step A: Warehouse Address Card */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
            <h3 className="font-700 mb-1">📦 Ship Your Cargo to Our Warehouse</h3>
            <p className="text-sm text-muted-foreground mb-4">Please ship your goods to the address below and upload the warehouse slip.</p>

            {/* Address box */}
            <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏭</span>
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
                {addressCopied ? 'Copied!' : '📋 Copy Full Address'}
              </button>
            </div>

            {/* Shipping instructions */}
            <div className="bg-[#fef9ec] border border-[#fde68a] rounded-xl p-4">
              <p className="text-sm font-700 mb-3">📋 Important Instructions</p>
              <ol className="space-y-2">
                {WAREHOUSE_INSTRUCTIONS.map((instr, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#f59e0b] text-white text-[11px] flex items-center justify-center font-700 mt-0.5">{i + 1}</span>
                    <span>{instr}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <span className="text-red-500 font-bold text-lg mt-0.5">⚠️</span>
                <p className="text-red-600 font-semibold text-sm">Upload warehouse slip or order cannot be tracked.</p>
              </div>
            </div>
          </div>

          {/* Step B / C: Slip upload OR Cargo confirmed */}
          {cargoConfirmation ? (
            /* Step C: Cargo confirmed by admin */
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-2 text-green-700 font-700 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span>🎉 Cargo Received at Our Warehouse!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">Your shipment has been received and confirmed by our warehouse team.</p>
              <div className="space-y-1.5 text-sm mb-4">
                <p><span className="font-600 text-foreground">Confirmed by:</span> <span className="text-muted-foreground">{cargoConfirmation.confirmedBy}</span></p>
                <p><span className="font-600 text-foreground">Confirmed at:</span> <span className="text-muted-foreground">{new Date(cargoConfirmation.confirmedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
              </div>
              <p className="text-sm text-green-700 mb-3">Your order will now be processed for consolidation and shipping to India.</p>
              <span className="inline-block text-xs font-600 px-3 py-1 rounded-full bg-green-600 text-white">At China Warehouse</span>
            </div>
          ) : (
            /* Step B: Upload warehouse slip */
            <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
              <h3 className="font-700 mb-1">📄 Upload Warehouse Slip</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload the slip/receipt from our warehouse confirming your shipment</p>

              {slipAlreadyUploaded ? (
                /* Slip already uploaded */
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-600 px-2.5 py-1 rounded-full bg-green-100 text-green-700">✅ Slip Uploaded</span>
                    {req.slipUploadedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.slipUploadedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {warehouseSlip ? (
                    warehouseSlip.startsWith('data:image') ? (
                      <img src={warehouseSlip} alt="Warehouse slip" className="max-h-48 rounded-lg border border-border object-contain mb-3" />
                    ) : (
                      <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 mb-3 w-fit">
                        <span className="text-xl">📄</span>
                        <a href={warehouseSlip} download="warehouse-slip.pdf" className="text-sm font-600 text-[#4A3B52] hover:underline">View / Download PDF</a>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">Loading preview…</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-3">Your slip has been received. Waiting for our team to confirm cargo receipt.</p>
                  <button
                    onClick={() => {
                      setReplacingSlip(true);
                      setSlipFile(null);
                      setSlipPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs font-600 text-[#c17b5c] hover:underline"
                  >
                    Replace Slip
                  </button>
                </div>
              ) : (
                /* Upload form */
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
                          <span className="text-xl">📄</span>
                          <span className="text-sm font-600">{slipFile?.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSlipFile(null);
                          setSlipPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs text-muted-foreground hover:underline mt-2 block"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {fileError && <p className="text-xs text-red-500 mt-2">{fileError}</p>}
                  {slipFile && (
                    <button
                      onClick={handleUploadSlip}
                      disabled={slipLoading}
                      className="mt-3 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60"
                    >
                      <Upload className="w-4 h-4" />
                      {slipLoading ? 'Uploading…' : 'Upload Slip'}
                    </button>
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
        {chatMessages.length === 0 && (
          <p className="text-sm text-muted-foreground mb-3">No messages yet. Your admin will reply shortly.</p>
        )}
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'client' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.sender === 'client' ? 'bg-[#4A3B52]' : 'bg-primary'}`}>
                {msg.sender === 'client' ? clientInitials : 'AS'}
              </div>
              <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${msg.sender === 'client' ? 'bg-[#f0eef8]' : 'bg-muted/50'}`}>
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
