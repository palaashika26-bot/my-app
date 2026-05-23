'use client';
import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients, orderNotesLog, carrierForOrder, statusToLocation } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Upload, Download, FileText, AlertTriangle, Mail, Edit3, MessageSquare, Camera, UserCheck } from 'lucide-react';
import ProductImage from '@/components/ProductImage';
import ExceptionChat from '@/components/ExceptionChat';
import { useAuth } from '@/context/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { notFound } from 'next/navigation';
import { getEffectiveOrderStatus } from '@/lib/orderQcStore';
import { getStaffRegistry } from '@/lib/staffStore';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';

// ─── Backend-ready tracking functions ─────────────────────────────────────────

const DEMO_SEED_UPDATES = [
  {
    id: '3',
    location: 'Mumbai JNPT Port',
    message: 'Shipment arrived at Mumbai port. Customs clearance initiated.',
    stage: 'Arrived Destination Port',
    addedBy: 'Meera Nair',
    addedByRole: 'Sourcing & Logistics Staff',
    timestamp: '2026-05-20T09:30:00.000Z',
  },
  {
    id: '2',
    location: 'Arabian Sea',
    message: 'Vessel is en route to India. Estimated arrival in 3 days.',
    stage: 'In Transit — Sea/Air',
    addedBy: 'Arjun Sharma',
    addedByRole: 'Admin',
    timestamp: '2026-05-17T14:00:00.000Z',
  },
  {
    id: '1',
    location: 'Shanghai Port, China',
    message: 'Cargo loaded onto vessel. Bill of lading issued.',
    stage: 'Departed Origin',
    addedBy: 'Meera Nair',
    addedByRole: 'Sourcing & Logistics Staff',
    timestamp: '2026-05-15T08:00:00.000Z',
  },
];

async function getTrackingUpdates(orderId: string) {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(`tracking-updates-${orderId}`) : null;
  return raw ? JSON.parse(raw) : [];
}

async function addTrackingUpdate(orderId: string, update: any) {
  const existing = JSON.parse(
    (typeof window !== 'undefined' ? localStorage.getItem(`tracking-updates-${orderId}`) : null) || '[]'
  );
  const newUpdate = { id: Date.now().toString(), ...update, timestamp: new Date().toISOString() };
  existing.unshift(newUpdate);
  localStorage.setItem(`tracking-updates-${orderId}`, JSON.stringify(existing));
  return newUpdate;
}

const stages = ['Order Placed','Payment Confirmed','Sourcing','At China Warehouse','China Consolidation Warehouse','Repacking Warehouse','Shipped from China','In Transit','Arrived India Warehouse','Out for Delivery','Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking Warehouse': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };
const statusOptions: OrderStatus[] = ['Payment Pending','Payment Confirmed','Sourcing','At China Warehouse','Repacking Warehouse','Ready for Shipping','Ready for Logistics','Return from China','Shipped from China','Arrived India Warehouse','Out for Delivery','Completed','Exception'];
const gstRates = [0, 5, 12, 18, 28];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const { user, role } = useAuth();
  const perms = useAdminPermissions();
  const actorName = user?.name ?? 'Team';
  const initial = mockAdminOrders.find(o => o.id === id);
  if (!initial) return notFound();
  const client = mockClients.find(c => c.name === initial.client);
  const [status, setStatus] = useState(initial.status as string);
  const [gst, setGst] = useState(18);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(orderNotesLog);
  const [logisticsEstimate, setLogisticsEstimate] = useState<null | { weight: string; mode: string; pricePerKg: string; note: string }>(null);

  // Tracking update state
  interface TrackingUpdate { id: string; location: string; message: string; stage: string; addedBy: string; addedByRole: string; timestamp: string; }
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [trackingLocation, setTrackingLocation] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackingStage, setTrackingStage] = useState('');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`logistics-estimate-${id}`);
    if (saved) {
      try { setLogisticsEstimate(JSON.parse(saved)); } catch {}
    }
  }, [id]);

  // Load tracking updates + seed demo data for BK-ORD-2024-0268
  useEffect(() => {
    if (!initial) return;
    const key = `tracking-updates-${initial.orderId}`;
    const existing = localStorage.getItem(key);
    if (!existing && initial.orderId === 'BK-ORD-2024-0268') {
      localStorage.setItem(key, JSON.stringify(DEMO_SEED_UPDATES));
    }
    getTrackingUpdates(initial.orderId).then(setTrackingUpdates);
  }, [id, initial?.orderId]);

  interface StaffAssignment { staffId: string; staffName: string; staffRole: string; assignedAt: string; }
  const [staffList] = useState(() => getStaffRegistry());
  const [assignment, setAssignment] = useState<StaffAssignment | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  interface WarehouseReportItem { name: string; status: 'ok' | 'issue'; issue: string; receivedQty: string; }
  interface WarehouseReport { orderId: string; staffName: string; submittedAt: string; items: WarehouseReportItem[]; hasIssues: boolean; }
  interface WarehouseRepack { weight: string; cbm: string; notes: string; photos: string[]; }
  interface WarehouseOutbound { trackingId: string; finalPackingList: string | null; deliverySlip: string | null; sentAt?: string; }
  interface WarehouseReply { id: string; sender: string; role: string; message: string; time: string; }
  const [warehouseReport, setWarehouseReport] = useState<WarehouseReport | null>(null);
  const [warehouseRepack, setWarehouseRepack] = useState<WarehouseRepack | null>(null);
  const [warehouseOutbound, setWarehouseOutbound] = useState<WarehouseOutbound | null>(null);
  const [warehouseReplies, setWarehouseReplies] = useState<WarehouseReply[]>([]);
  const [warehouseReplyInput, setWarehouseReplyInput] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(`order-assignment-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StaffAssignment;
        setAssignment(parsed);
        setSelectedStaffId(parsed.staffId);
      } catch {}
    }
  }, [id]);

  function assignStaff() {
    const member = staffList.find((s) => s.id === selectedStaffId);
    if (!member) return;
    const newAssignment: StaffAssignment = {
      staffId: member.id,
      staffName: member.name,
      staffRole: member.role,
      assignedAt: new Date().toISOString(),
    };
    localStorage.setItem(`order-assignment-${id}`, JSON.stringify(newAssignment));
    setAssignment(newAssignment);
    addToast({ type: 'success', title: 'Staff assigned', description: `${member.name} assigned to this order.` });
  }

  interface ChatMessage { id: string; sender: 'admin' | 'client'; text: string; time: string; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(`order-chat-${id}`);
    if (stored) {
      try { setChatMessages(JSON.parse(stored)); return; } catch {}
    }
    const seed: ChatMessage[] = [{
      id: 'seed-1',
      sender: 'admin',
      text: "Your order has been confirmed and is now being processed. We'll update you at each stage.",
      time: '2 hours ago',
    }];
    setChatMessages(seed);
    localStorage.setItem(`order-chat-${id}`, JSON.stringify(seed));
  }, [id]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(`warehouse-report-${id}`);
      if (r) setWarehouseReport(JSON.parse(r));
      const rp = localStorage.getItem(`warehouse-repack-${id}`);
      if (rp) setWarehouseRepack(JSON.parse(rp));
      const ob = localStorage.getItem(`warehouse-outbound-${id}`);
      if (ob) setWarehouseOutbound(JSON.parse(ob));
      const wr = localStorage.getItem(`warehouse-replies-${id}`);
      if (wr) setWarehouseReplies(JSON.parse(wr));
    } catch {}
  }, [id]);

  function sendWarehouseReply() {
    if (!warehouseReplyInput.trim()) return;
    const newReply: WarehouseReply = {
      id: `admin-reply-${Date.now()}`,
      sender: actorName,
      role: 'Admin',
      message: warehouseReplyInput.trim(),
      time: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...warehouseReplies, newReply];
    setWarehouseReplies(updated);
    try {
      localStorage.setItem(`warehouse-replies-${id}`, JSON.stringify(updated));
      const whNotifs = JSON.parse(localStorage.getItem('notifications-warehouse') ?? '[]');
      whNotifs.unshift({
        id: `wh-reply-${Date.now()}`,
        title: 'Admin Replied',
        description: `Admin replied on order ${id}`,
        time: 'Just now',
        read: false,
        type: 'reply',
        href: `/staff/warehouse/orders/${id}`,
      });
      localStorage.setItem('notifications-warehouse', JSON.stringify(whNotifs));
    } catch {}
    setWarehouseReplyInput('');
    addToast({ type: 'success', title: 'Reply sent to warehouse staff' });
  }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { id: `msg-${Date.now()}`, sender: 'admin', text: chatInput.trim(), time: 'Just now' };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(`order-chat-${id}`, JSON.stringify(updated));
    setChatInput('');
  }

  type SupplierInfo = { supplierName: string; platform: string; productUrl: string; contact: string; priceCny: string; notes: string };
  const [supplierData, setSupplierData] = useState<Record<string, SupplierInfo>>(() => {
    if (typeof window === 'undefined') return {};
    const result: Record<string, SupplierInfo> = {};
    const itemNames = ['LED Strip Light (RGB, 5m)', 'USB-C Cable (Braided)', 'Wireless Earbuds'];
    itemNames.forEach(name => {
      const stored = localStorage.getItem(`supplier-${id}-${name}`);
      if (stored) try { result[name] = JSON.parse(stored); } catch {}
    });
    return result;
  });
  const [supplierForm, setSupplierForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierInfo>({ supplierName: '', platform: '1688', productUrl: '', contact: '', priceCny: '', notes: '' });

  function openSupplierForm(itemName: string) {
    const existing = supplierData[itemName];
    setFormData(existing ? { ...existing } : { supplierName: '', platform: '1688', productUrl: '', contact: '', priceCny: '', notes: '' });
    setSupplierForm(itemName);
  }
  function saveSupplier(itemName: string) {
    if (!formData.supplierName.trim()) return;
    localStorage.setItem(`supplier-${id}-${itemName}`, JSON.stringify(formData));
    setSupplierData(prev => ({ ...prev, [itemName]: { ...formData } }));
    setSupplierForm(null);
    addToast({ type: 'success', title: 'Supplier saved' });
  }
  const carrier = carrierForOrder(initial.orderId);
  const loc = statusToLocation[status] ?? { label: 'Pre-shipment', progress: 10 };
  const stageIdx = stageMap[status] ?? -1;

  const items = [
    { name: 'LED Strip Light (RGB, 5m)', qty: 50, unitCny: 42, totalCny: 2100, totalInr: 25200 },
    { name: 'USB-C Cable (Braided)',     qty: 100, unitCny: 8, totalCny: 800, totalInr: 9600 },
    { name: 'Wireless Earbuds',          qty: 25, unitCny: 88, totalCny: 2200, totalInr: 26400 },
  ];
  const productCny = 5100, logisticsCny = 680;
  const productInr = productCny * 12, logisticsInr = logisticsCny * 12;
  const advancePaid = 15000;
  const subTotal = productInr + logisticsInr - advancePaid;
  const gstAmt = Math.round(subTotal * gst / 100);
  const grand = subTotal + gstAmt;

  function saveStatus(s: string) {
    setStatus(s);
    setNotes((prev) => [
      {
        id: `n${Date.now()}`,
        time: new Date().toLocaleString('en-IN'),
        actor: actorName,
        message: `Status changed: ${status} → ${s}`,
        icon: '🔄',
      },
      ...prev,
    ]);
    addToast({ type: 'success', title: 'Status updated', description: `Order is now “${s}”.` });
  }
  function addNote() {
    if (!note.trim()) return;
    setNotes((prev) => [
      { id: `n${Date.now()}`, time: new Date().toLocaleString('en-IN'), actor: actorName, message: note, icon: '📝' },
      ...prev,
    ]);
    setNote('');
    addToast({ type: 'success', title: 'Note added' });
  }

  async function handleAddTrackingUpdate() {
    if (!initial) return;
    if (!trackingLocation.trim() || !trackingMessage.trim()) {
      addToast({ type: 'warning', title: 'Required fields missing', description: 'Please enter both location and status message.' });
      return;
    }
    setTrackingSubmitting(true);
    const orderDocId = initial.id;
    const orderPublicId = initial.orderId;
    const update = {
      location: trackingLocation.trim(),
      message: trackingMessage.trim(),
      stage: trackingStage,
      addedBy: actorName,
      addedByRole: role === 'admin' ? 'Admin' : 'Staff',
    };
    await addTrackingUpdate(orderPublicId, update);
    // Notify client
    try {
      const clientNotifs = JSON.parse(localStorage.getItem('notifications-client') || '[]');
      clientNotifs.unshift({
        id: `tracking-${Date.now()}`,
        title: 'Shipment Update',
        message: `${trackingLocation.trim()}: ${trackingMessage.trim()}`,
        link: `/client-dashboard/orders/${orderDocId}`,
        time: 'Just now',
        read: false,
        type: 'order',
        group: 'Today',
      });
      localStorage.setItem('notifications-client', JSON.stringify(clientNotifs));
    } catch {}
    const updated = await getTrackingUpdates(orderPublicId);
    setTrackingUpdates(updated);
    setTrackingLocation('');
    setTrackingMessage('');
    setTrackingStage('');
    setTrackingSubmitting(false);
    setTrackingSuccess(true);
    setTimeout(() => setTrackingSuccess(false), 4000);
  }
  function flagException() { saveStatus('Exception'); }
  function refund() {
    if (!perms.canSeeClientPayments || !initial) return;
    addToast({ type: 'info', title: 'Refund initiated', description: 'Refund of ' + initial.amount + ' processing.' });
  }
  function emailClient() { addToast({ type: 'info', title: 'Email composer opened', description: `To: ${client?.email}` }); }
  function uploadDoc(d: string) { addToast({ type: 'success', title: `${d} uploaded`, description: 'Visible to client now.' }); }

  return (
    <AdminLayout>
      <Link href="/admin/all-orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Orders</Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-tabular font-700 text-lg">{initial.orderId}</span>
            <StatusBadge status={status as any} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {initial.date} • ETA: {initial.estimatedDelivery}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(role === 'admin' || (role === 'staff' && user?.staffRoleId === 'warehouse-qc')) &&
            (initial.status === 'Repacking Warehouse' ||
              ['Ready for Logistics', 'Return from China'].includes(
                getEffectiveOrderStatus(initial.id, initial.status as OrderStatus) as string
              )) && (
              <Link
                href={`/admin/warehouse/qc/${initial.id}`}
                className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Repacking Warehouse
              </Link>
            )}
          <select value={status} onChange={e => saveStatus(e.target.value)} className="input-field text-sm py-2 min-w-[180px]">{statusOptions.map(s => <option key={s}>{s}</option>)}</select>
          <button onClick={emailClient} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Client</button>
          <button onClick={flagException} className="px-3 py-2 text-xs font-600 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Mark Exception</button>
          {perms.canSeeClientPayments && (
            <button onClick={refund} className="btn-secondary px-3 py-2 text-xs">Process Refund</button>
          )}
        </div>
      </div>

      {status === 'Exception' && (
        <div className="mb-5">
          <ExceptionChat orderId={initial.id} isAdmin={true} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Client Information */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Client Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Name</p><p className="font-500">{client?.name}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500">{client?.email}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-500 font-tabular">{client?.phone}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-500">{client?.company}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">GSTIN</p><p className="font-500 font-tabular">{client?.gstin}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Total Orders</p><p className="font-500">{client?.totalOrders}</p></div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Items</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="py-2 text-left font-600 w-14">Image</th><th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th>
                {perms.canSeeSupplierCostsInOrders && (
                  <>
                    <th className="text-right font-600">Unit (¥)</th>
                    <th className="text-right font-600">Total (¥)</th>
                    <th className="text-right font-600">Total (₹)</th>
                  </>
                )}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.map(it => (
                  <tr key={it.name}>
                    <td className="py-3 pr-3">
                      <ProductImage
                        productName={it.name}
                        canUpload={true}
                        onUpload={() => addToast({ type: 'success', title: 'Image saved', description: `Product image updated for ${it.name}` })}
                      />
                    </td>
                    <td className="py-3 font-500">{it.name}</td>
                    <td className="text-right font-tabular">{it.qty}</td>
                    {perms.canSeeSupplierCostsInOrders && (
                      <>
                        <td className="text-right font-tabular">¥{it.unitCny}</td>
                        <td className="text-right font-tabular">¥{it.totalCny.toLocaleString()}</td>
                        <td className="text-right font-tabular font-600">₹{it.totalInr.toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Shipment Timeline</h3>
            <ol className="space-y-2.5">
              {stages.map((s, i) => {
                const done = i <= stageIdx; const current = i === stageIdx;
                return (
                  <li key={s} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : current ? 'bg-[#4A3B52] text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>{done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}</div>
                    <p className={`text-sm ${current ? 'font-700 text-[#4A3B52]' : done ? 'font-500' : 'font-500 text-muted-foreground'}`}>{s}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Shipment Tracking — shown from Shipped from China onwards */}
          {stageIdx >= 6 && (
            <>
              {/* Add Tracking Update */}
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h3 className="font-700 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#c17b5c]" /> Add Tracking Update
                </h3>
                {trackingSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Update added. Client notified.
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Current Location <span className="text-red-500">*</span></label>
                    <input
                      className="input-field w-full text-sm"
                      value={trackingLocation}
                      onChange={e => setTrackingLocation(e.target.value)}
                      placeholder="e.g. Shanghai Port, China"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Status Message <span className="text-red-500">*</span></label>
                    <textarea
                      className="input-field w-full text-sm resize-none"
                      rows={2}
                      value={trackingMessage}
                      onChange={e => setTrackingMessage(e.target.value)}
                      placeholder="e.g. Cargo has cleared customs and is awaiting loading"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Stage (optional)</label>
                    <select
                      className="input-field w-full text-sm"
                      value={trackingStage}
                      onChange={e => setTrackingStage(e.target.value)}
                    >
                      <option value="">— Select shipment stage —</option>
                      {['At Origin Warehouse','Departed Origin','In Transit — Sea/Air','Customs Clearance','Arrived Destination Port','Out for Delivery','Delivered'].map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddTrackingUpdate}
                    disabled={trackingSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60"
                  >
                    {trackingSubmitting ? 'Adding…' : 'Add Update'}
                  </button>
                </div>
              </div>

              {/* Tracking History */}
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h3 className="font-700 mb-4">🗺️ Tracking History</h3>
                {trackingUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tracking updates added yet. Add the first update above.</p>
                ) : (
                  <ol className="relative space-y-0">
                    {trackingUpdates.map((upd, i) => (
                      <li key={upd.id} className="flex gap-4 pb-6 last:pb-0">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full border-2 mt-1 ${i === 0 ? 'bg-[#c17b5c] border-[#c17b5c]' : 'bg-card border-muted-foreground/40'}`} />
                          {i < trackingUpdates.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="font-700 text-sm">{upd.location}</p>
                          {upd.stage && (
                            <span className="inline-block text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#e8e4f0] text-[#5c5470] mt-0.5 mb-1">{upd.stage}</span>
                          )}
                          <p className="text-sm text-foreground mt-0.5">{upd.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Added by: {upd.addedBy} ({upd.addedByRole}) · {new Date(upd.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}

          {/* Documents */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Documents</h3>
            <ul className="space-y-2">
              {['Commercial Invoice', 'Packing List'].map(d => (
                <li key={d} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{d}</span>
                  <div className="flex gap-1">
                    <button onClick={() => uploadDoc(d)} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                    <button className="text-[#4A3B52] text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes / Timeline log */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Notes & Activity Log</h3>
            <div className="flex gap-2 mb-3">
              <input value={note} onChange={e => setNote(e.target.value)} className="input-field flex-1" placeholder="Add internal note..." />
              <button onClick={addNote} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm"><MessageSquare className="w-3.5 h-3.5" /> Add Note</button>
            </div>
            <ol className="space-y-3 max-h-72 overflow-y-auto">
              {notes.map(n => <li key={n.id} className="flex items-start gap-3 text-sm"><span className="flex-shrink-0">{n.icon}</span><div className="flex-1"><p>{n.message}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.actor} • {n.time}</p></div></li>)}
            </ol>
          </div>
        </div>

        <div className="space-y-5">
          {/* Payment Summary */}
          {perms.canSeeClientPayments && (
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Cost</span><span className="font-tabular font-500">¥{productCny.toLocaleString()} / ₹{productInr.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-emerald-600 font-500">Advance Paid</span><span className="font-tabular font-500 text-emerald-600">− ₹{advancePaid.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Logistics (Sea)</span><span className="font-tabular font-500">₹{logisticsInr.toLocaleString()}</span></div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-2"><span className="text-muted-foreground inline-flex items-center gap-1">GST <select value={gst} onChange={e => setGst(+e.target.value)} className="input-field text-[10px] py-0.5 px-1">{gstRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></span><span className="font-tabular font-500">₹{gstAmt.toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 mt-1 flex items-center justify-between"><span className="font-700">Grand Total</span><span className="font-700 font-tabular text-foreground">₹{grand.toLocaleString()}</span></div>
            </div>
          </div>
          )}

          {logisticsEstimate && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Logistics Details</h3>
              <div className="space-y-2 text-sm">
                {logisticsEstimate.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approx Weight</span>
                    <span className="font-500">{logisticsEstimate.weight}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Mode</span>
                  <span className="font-500">{logisticsEstimate.mode}</span>
                </div>
                {logisticsEstimate.pricePerKg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per KG</span>
                    <span className="font-tabular font-500">¥{logisticsEstimate.pricePerKg}</span>
                  </div>
                )}
                {logisticsEstimate.note && (
                  <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border">{logisticsEstimate.note}</p>
                )}
              </div>
            </div>
          )}
          {/* Assign Staff */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-1 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Assign Staff</h3>
            {assignment && (
              <div className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="font-600">{assignment.staffName}</p>
                <p className="text-xs text-muted-foreground">{STAFF_ROLE_LABELS[assignment.staffRole as keyof typeof STAFF_ROLE_LABELS] ?? assignment.staffRole}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Assigned {new Date(assignment.assignedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
            <select
              className="input-field text-sm mb-2"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">— Select staff member —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({STAFF_ROLE_LABELS[s.role]})
                </option>
              ))}
            </select>
            <button
              onClick={assignStaff}
              disabled={!selectedStaffId}
              className="btn-primary w-full py-2 text-sm disabled:opacity-50"
            >
              {assignment ? 'Reassign' : 'Assign'}
            </button>
          </div>

          {/* Logistics info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{carrier.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{carrier.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tracking #</span><span className="font-tabular font-500">{carrier.trackingNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular font-500">{initial.estimatedDelivery}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-500">{loc.label}</span></div>
              <Link href={`/admin/shipments/tracking/${initial.id}`} className="btn-primary block text-center mt-3 py-2 text-xs">Open Live Tracking</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Records */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mt-5">
        <h3 className="font-700 mb-1">Supplier Records</h3>
        <p className="text-xs text-muted-foreground mb-4">Track which suppliers were used for this order</p>
        <div className="space-y-4">
          {items.map(item => {
            const supplier = supplierData[item.name];
            const isFormOpen = supplierForm === item.name;
            return (
              <div key={item.name} className="border border-border rounded-lg p-4">
                <h4 className="font-600 text-sm mb-3">{item.name}</h4>
                {isFormOpen ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">Supplier Name *</label>
                      <input className="input-field w-full mt-1" value={formData.supplierName} onChange={e => setFormData(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Shenzhen Electronics Co." />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">Platform</label>
                      <select className="input-field w-full mt-1" value={formData.platform} onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))}>
                        {['1688', 'Alibaba', 'AliExpress', 'WeChat', 'Direct Factory', 'Other'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">Product URL (optional)</label>
                      <input className="input-field w-full mt-1" value={formData.productUrl} onChange={e => setFormData(f => ({ ...f, productUrl: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">WeChat / Phone (optional)</label>
                      <input className="input-field w-full mt-1" value={formData.contact} onChange={e => setFormData(f => ({ ...f, contact: e.target.value }))} placeholder="+86..." />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">Price Negotiated in ¥ CNY (optional)</label>
                      <input className="input-field w-full mt-1" type="number" value={formData.priceCny} onChange={e => setFormData(f => ({ ...f, priceCny: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-600">Notes (optional)</label>
                      <textarea className="input-field w-full mt-1" rows={2} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveSupplier(item.name)} className="btn-primary px-4 py-1.5 text-sm">Save</button>
                      <button onClick={() => setSupplierForm(null)} className="btn-secondary px-4 py-1.5 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : supplier ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="font-700">{supplier.supplierName}</p>
                    <span className="inline-block bg-[#4A3B52]/10 text-[#4A3B52] text-[11px] font-600 px-2 py-0.5 rounded-full">{supplier.platform}</span>
                    {supplier.productUrl && (
                      <p><a href={supplier.productUrl} target="_blank" rel="noopener noreferrer" className="text-[#4A3B52] hover:underline inline-flex items-center gap-1">🔗 {supplier.productUrl}</a></p>
                    )}
                    {supplier.contact && <p className="text-muted-foreground">📱 {supplier.contact}</p>}
                    {supplier.priceCny && <p className="text-muted-foreground">¥ {supplier.priceCny}</p>}
                    {supplier.notes && <p className="text-muted-foreground">📝 {supplier.notes}</p>}
                    <button onClick={() => openSupplierForm(item.name)} className="btn-secondary px-3 py-1 text-xs mt-2 inline-flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                  </div>
                ) : (
                  <button onClick={() => openSupplierForm(item.name)} className="border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">+ Add Supplier Info</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mt-5">
        <h3 className="font-700 mb-3">Conversation</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.sender === 'admin' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}>
                {msg.sender === 'admin' ? 'AS' : 'RK'}
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
          <button onClick={sendChatMessage} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>

      {/* Warehouse Report Section */}
      {(stageIdx >= 5 || warehouseReport !== null || warehouseRepack !== null || warehouseOutbound !== null) && (
        <div className="mt-5 space-y-5">
          <h3 className="font-700 text-foreground text-lg border-t border-border pt-5">Warehouse Reports</h3>

          {/* Items Report */}
          {warehouseReport ? (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-700">Items Report from Warehouse</h4>
                <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${warehouseReport.hasIssues ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {warehouseReport.hasIssues ? 'Issues Found' : 'All OK'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Submitted by {warehouseReport.staffName} on{' '}
                {new Date(warehouseReport.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="space-y-2">
                {warehouseReport.items.map((item, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-600 text-sm">{item.name}</p>
                      <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${item.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'ok' ? 'All OK' : 'Issue'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Received Qty: {item.receivedQty}</p>
                    {item.issue && <p className="text-xs text-red-600 mt-1">{item.issue}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <p className="text-sm text-muted-foreground">No warehouse items report submitted yet.</p>
            </div>
          )}

          {/* Repacking Details */}
          {warehouseRepack && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Repacking Details</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
                {warehouseRepack.weight && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Final Weight</p><p className="font-500">{warehouseRepack.weight} KG</p></div>
                )}
                {warehouseRepack.cbm && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Final Volume</p><p className="font-500">{warehouseRepack.cbm} CBM</p></div>
                )}
              </div>
              {warehouseRepack.notes && (
                <p className="text-sm text-muted-foreground italic mb-3">{warehouseRepack.notes}</p>
              )}
              {warehouseRepack.photos?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {warehouseRepack.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`Repack ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outbound Shipment */}
          {warehouseOutbound && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Outbound Shipment to China Warehouse</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking ID</span>
                  <span className="font-tabular font-600">{warehouseOutbound.trackingId}</span>
                </div>
                {warehouseOutbound.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent At</span>
                    <span className="font-500">{new Date(warehouseOutbound.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {warehouseOutbound.deliverySlip && (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Delivery Slip</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={warehouseOutbound.deliverySlip} alt="Delivery slip" className="w-32 h-32 object-cover rounded-lg border border-border" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reply to Warehouse Staff */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h4 className="font-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Reply to Warehouse Staff
            </h4>
            {warehouseReplies.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {warehouseReplies.map((reply) => (
                  <div key={reply.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-600 text-sm">{reply.sender}</span>
                      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">{reply.role}</span>
                    </div>
                    <p className="text-sm">{reply.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{reply.time}</p>
                  </div>
                ))}
              </div>
            )}
            {warehouseReplies.length === 0 && (
              <p className="text-sm text-muted-foreground mb-3">No messages sent to warehouse yet.</p>
            )}
            <div className="flex gap-2">
              <input
                value={warehouseReplyInput}
                onChange={(e) => setWarehouseReplyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendWarehouseReply(); }}
                className="input-field flex-1 min-w-0"
                placeholder="Send a message to warehouse staff..."
              />
              <button onClick={sendWarehouseReply} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
