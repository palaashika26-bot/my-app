'use client';
import React, { useState, use, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients, orderNotesLog, carrierForOrder, statusToLocation } from '@/lib/adminMockData';
import { ordersApi } from '@/lib/api/orders.api';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Upload, Download, FileText, AlertTriangle, Mail, Edit3, MessageSquare, CreditCard, Eye, X } from 'lucide-react';
import { generateInvoice } from '@/lib/generateInvoice';
import { generateGSTInvoice } from '@/lib/generateGSTInvoice';
import { generateCommercialInvoice } from '@/lib/generateCommercialInvoice';
import { generatePackingList } from '@/lib/generatePackingList';
import GSTInvoiceModal from '@/components/GSTInvoiceModal';
import GSTInvoicePopover from '@/components/GSTInvoicePopover';
import type { GSTData } from '@/components/GSTInvoicePopover';
import { paymentsApi } from '@/lib/api/payments.api';
import ProductImage from '@/components/ProductImage';
import ExceptionChat from '@/components/ExceptionChat';
import { useAuth } from '@/context/AuthContext';
import { notFound } from 'next/navigation';

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

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('elios_access_token') ?? '';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers ?? {}) },
  });
}

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

const stages = ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking Warehouse': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };
const statusOptions: OrderStatus[] = ['Payment Pending', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'Repacking Warehouse', 'Ready for Shipping', 'Ready for Logistics', 'Return from China', 'Shipped from China', 'Arrived India Warehouse', 'Out for Delivery', 'Completed', 'Exception'];

const ORDER_STATUS_MAP: Record<string, string> = {
  CONFIRMED: 'Payment Confirmed',
  SOURCING: 'Sourcing',
  QC_PENDING: 'At China Warehouse',
  QC_PASSED: 'At China Warehouse',
  QC_FAILED: 'Exception',
  REPACKING: 'Repacking Warehouse',
  SHIPPED: 'Shipped from China',
  DELIVERED: 'Completed',
  CANCELLED: 'Exception',
};

export default function SourcingOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Team';

  const mockMatch = mockAdminOrders.find(o => o.id === id) ?? null;

  // ── API state ──────────────────────────────────────────────────────────────
  const [apiOrder, setApiOrder] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(!mockMatch);

  // ── UI state (all hooks before any conditional returns) ────────────────────
  const [status, setStatus] = useState(mockMatch?.status as string ?? '');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(orderNotesLog);

  interface TrackingUpdate { id: string; location: string; message: string; stage: string; addedBy: string; addedByRole: string; timestamp: string; }
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [trackingLocation, setTrackingLocation] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackingStage, setTrackingStage] = useState('');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  interface ChatMessage { id: string; sender: 'admin' | 'client'; text: string; time: string; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Warehouse report (API)
  const [apiWarehouseReport, setApiWarehouseReport] = useState<any>(null);
  const [warehouseReplies, setWarehouseReplies] = useState<any[]>([]);
  const [warehouseReplyInput, setWarehouseReplyInput] = useState('');
  const [warehouseHasNewUpdate, setWarehouseHasNewUpdate] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [staffUploadLoading, setStaffUploadLoading] = useState(false);

  // completedStages from DB
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  // Payment verification state
  const [payments, setPayments] = useState<any[]>([]);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showGSTModal, setShowGSTModal] = useState(false);
  const [showGSTPopover, setShowGSTPopover] = useState(false);
  const [savedGSTData, setSavedGSTData] = useState<GSTData | null>(null);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  function refreshPayments(_orderId: string) {
    ordersApi.getOrderById(id)
      .then(r => setPayments((r.data?.data as any)?.requestPayments ?? []))
      .catch(() => {});
  }

  async function fetchOrder() {
    if (mockMatch) return;
    try {
      const r = await ordersApi.getOrderById(id);
      const order = r.data?.data;
      if (order) {
        setApiOrder(order);
        setStatus(ORDER_STATUS_MAP[order.status] ?? order.status);
        setPayments((order as any).requestPayments ?? []);
        setCompletedStages((order as any).completedStages ?? []);
      }
    } catch {}
  }

  async function fetchWarehouseReport() {
    try {
      const res = await apiFetch(`/api/orders/${id}/warehouse-report?photos=false`);
      const data = await res.json();
      if (data?.success && data?.data && data.data.orderId) {
        setApiWarehouseReport((prev: any) => ({
          ...data.data,
          repackPhotos: prev?.repackPhotos?.length ? prev.repackPhotos : [],
        }));
        setWarehouseReplies(data.data.adminReplies ?? []);
        const isNew = data.data.isReadByStaff === false && !!data.data.lastUpdatedAt;
        setWarehouseHasNewUpdate(isNew);
      }
    } catch {}
  }

  async function fetchWarehouseReportFull() {
    try {
      const res = await apiFetch(`/api/orders/${id}/warehouse-report`);
      const data = await res.json();
      if (data?.success && data?.data && data.data.orderId) {
        setApiWarehouseReport(data.data);
        setWarehouseReplies(data.data.adminReplies ?? []);
        const isNew = data.data.isReadByStaff === false && !!data.data.lastUpdatedAt;
        setWarehouseHasNewUpdate(isNew);
      }
    } catch {}
  }

  async function markWarehouseReadByStaff() {
    setWarehouseHasNewUpdate(false);
    apiFetch(`/api/orders/${id}/warehouse-report`, {
      method: 'PATCH',
      body: JSON.stringify({ isReadByStaff: true }),
    }).catch(() => {});
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

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mockMatch) { setApiLoading(false); return; }
    ordersApi.getOrderById(id)
      .then(r => {
        const order = r.data?.data;
        if (order) {
          setApiOrder(order);
          setStatus(ORDER_STATUS_MAP[order.status] ?? order.status);
          setPayments((order as any).requestPayments ?? []);
          setCompletedStages((order as any).completedStages ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setApiLoading(false));
    fetchWarehouseReportFull(); // loads photos once on mount
  }, [id]);

  // Lightweight poll every 60 s — no photos re-downloaded on each tick
  useEffect(() => {
    const interval = setInterval(fetchWarehouseReport, 60000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const publicId = mockMatch?.orderId ?? apiOrder?.orderNumber;
    if (!publicId) return;
    const key = `tracking-updates-${publicId}`;
    const existing = localStorage.getItem(key);
    if (!existing && publicId === 'BK-ORD-2024-0268') {
      localStorage.setItem(key, JSON.stringify(DEMO_SEED_UPDATES));
    }
    getTrackingUpdates(publicId).then(setTrackingUpdates);
  }, [id, mockMatch?.orderId, apiOrder?.orderNumber]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('elios_access_token') : null;
    if (!token) return;
    fetch(`/api/orders/${id}/gst`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d?.data) setSavedGSTData(d.data); })
      .catch(() => {});
  }, [id]);

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

  // ── Guard: loading / 404 after all hooks ──────────────────────────────────
  if (apiLoading) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading order…</div>;
  }

  const initial = mockMatch ?? (apiOrder ? {
    id: apiOrder.id,
    orderId: apiOrder.orderNumber,
    client: apiOrder.client?.companyName ?? '—',
    date: new Date(apiOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    estimatedDelivery: apiOrder.shipment?.estimatedDelivery
      ? new Date(apiOrder.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—',
    status: ORDER_STATUS_MAP[apiOrder.status] ?? apiOrder.status,
    amount: `₹${parseFloat(apiOrder.totalINR || '0').toLocaleString('en-IN')}`,
    itemCount: apiOrder.items?.length ?? 0,
  } : null);

  if (!initial) return notFound();

  const client = mockClients.find(c => c.name === initial.client) ?? {
    name: apiOrder?.client ? `${apiOrder.client.user?.firstName ?? ''} ${apiOrder.client.user?.lastName ?? ''}`.trim() : '—',
    email: apiOrder?.client?.user?.email ?? '',
    phone: '—',
    company: apiOrder?.client?.companyName ?? '—',
    gstin: '—',
    totalOrders: '—',
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function saveStatus(s: string) {
    if (s === 'Shipped from China' && apiOrder) {
      const totalINR = parseFloat(apiOrder.totalINR || '0');
      const verifiedTotal = payments
        .filter((p: any) => p.status === 'VERIFIED')
        .reduce((sum: number, p: any) => sum + parseFloat(p.amountINR || '0'), 0);
      if (verifiedTotal < totalINR) {
        const remaining = (totalINR - verifiedTotal).toLocaleString('en-IN');
        if (!window.confirm(`⚠️ Balance payment of ₹${remaining} is pending.\nAre you sure you want to mark as shipped?`)) return;
      }
    }
    setStatus(s);
    setNotes(prev => [
      { id: `n${Date.now()}`, time: new Date().toLocaleString('en-IN'), actor: actorName, message: `Status changed: ${status} → ${s}`, icon: '🔄' },
      ...prev,
    ]);
    if (apiOrder) {
      try {
        await apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) });
        const newStageIdx = stageMap[s] ?? -1;
        if (newStageIdx >= 0) {
          const autoStages = stages.slice(0, newStageIdx + 1);
          await apiFetch(`/api/orders/${id}/stages`, { method: 'PATCH', body: JSON.stringify({ completedStages: autoStages }) });
          setCompletedStages(autoStages);
        }
      } catch {
        addToast({ type: 'error', title: 'Failed to save status to server' });
      }
    }
    addToast({ type: 'success', title: 'Status updated', description: `Order is now "${s}".` });
    fetchOrder();
  }

  async function handleStaffPhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    setStaffUploadLoading(true);
    try {
      const toBase64 = (file: File) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64Photos = await Promise.all(Array.from(files).map(toBase64));
      const res = await apiFetch(`/api/orders/${id}/warehouse-photos`, {
        method: 'POST',
        body: JSON.stringify({ photos: base64Photos }),
      });
      const data = await res.json();
      if (data?.success) {
        addToast({ type: 'success', title: 'Photos uploaded successfully' });
        await fetchWarehouseReportFull(); // reload with photos
      } else {
        throw new Error(data?.message);
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to upload photos' });
    } finally {
      setStaffUploadLoading(false);
    }
  }

  async function sendWarehouseReply() {
    if (!warehouseReplyInput.trim()) return;
    const msg = warehouseReplyInput.trim();
    setWarehouseReplyInput('');
    try {
      const res = await apiFetch(`/api/orders/${id}/warehouse-reply`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data?.success) {
        setWarehouseReplies(data.data?.adminReplies ?? []);
        addToast({ type: 'success', title: 'Reply sent to warehouse staff' });
      } else {
        throw new Error(data?.message);
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to send reply' });
    }
  }

  function addNote() {
    if (!note.trim()) return;
    setNotes(prev => [
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
      addedByRole: 'Sourcing & Logistics Staff',
    };
    await addTrackingUpdate(orderPublicId, update);
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
  function emailClient() { addToast({ type: 'info', title: 'Email composer opened', description: `To: ${client?.email}` }); }
  function uploadDoc(d: string) { addToast({ type: 'success', title: `${d} uploaded`, description: 'Visible to client now.' }); }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { id: `msg-${Date.now()}`, sender: 'admin', text: chatInput.trim(), time: 'Just now' };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(`order-chat-${id}`, JSON.stringify(updated));
    setChatInput('');
  }

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

  // ── Derived display values ─────────────────────────────────────────────────
  const carrier = mockMatch ? carrierForOrder(mockMatch.orderId) : { carrier: '—', mode: '—', trackingNo: '—' };
  const loc = statusToLocation[status] ?? { label: 'Pre-shipment', progress: 10 };
  const stageIdx = stageMap[status] ?? -1;

  type OrderItemDisplay = { name: string; qty: number; unitCny: number; totalCny: number; totalInr: number; imageUrl?: string | null };
  const items: OrderItemDisplay[] = apiOrder?.items?.map((item: any): OrderItemDisplay => ({
    name: item.product?.name ?? item.notes ?? '—',
    qty: item.quantity as number,
    unitCny: parseFloat(item.unitPriceCNY || '0'),
    totalCny: parseFloat(item.unitPriceCNY || '0') * (item.quantity as number),
    totalInr: parseFloat(item.totalINR || '0'),
    imageUrl: item.imageUrl ?? item.product?.imageUrl ?? null,
  })) ?? [
    { name: 'LED Strip Light (RGB, 5m)', qty: 50, unitCny: 42, totalCny: 2100, totalInr: 25200 },
    { name: 'USB-C Cable (Braided)', qty: 100, unitCny: 8, totalCny: 800, totalInr: 9600 },
    { name: 'Wireless Earbuds', qty: 25, unitCny: 88, totalCny: 2200, totalInr: 26400 },
  ];

  return (
    <div>
      <Link href="/staff/sourcing/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-tabular font-700 text-lg">{initial.orderId}</span>
            <StatusBadge status={status as any} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {initial.date} • ETA: {initial.estimatedDelivery}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={e => saveStatus(e.target.value)} className="input-field text-sm py-2 min-w-[180px]">
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={emailClient} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email Client
          </button>
          <button onClick={flagException} className="px-3 py-2 text-xs font-600 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Mark Exception
          </button>
          {(payments.some((p: any) => p.status === 'VERIFIED') || apiOrder?.status === 'CONFIRMED' || initial?.status === 'Payment Confirmed') && (
            <>
              <button
                onClick={() => setShowGSTModal(true)}
                className="px-3 py-2 text-xs font-600 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Invoice
              </button>
              <div className="relative inline-block">
                <button
                  onClick={() => setShowGSTPopover(p => !p)}
                  className="px-3 py-2 text-xs font-600 rounded-lg border border-indigo-400 text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> GST Invoice
                </button>
                {showGSTPopover && (() => {
                  const normalizedForGST = apiOrder ? {
                    orderId: apiOrder.orderNumber,
                    date: new Date(apiOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    client: apiOrder.client?.companyName ?? '—',
                    lineItems: (apiOrder.items ?? []).map((item: any) => ({
                      name: item.product?.name ?? item.notes ?? 'Item',
                      qty: Number(item.quantity ?? 1),
                      unitPriceInr: parseFloat(item.unitPriceINR || '0'),
                      totalInr: parseFloat(item.totalINR || '0'),
                      imageUrl: item.imageUrl ?? item.product?.imageUrl ?? null,
                    })),
                  } : {
                    orderId: initial?.orderId,
                    date: initial?.date,
                    client: typeof initial?.client === 'string' ? initial.client : '—',
                    lineItems: items.map((item: any) => ({
                      name: item.name,
                      qty: item.qty,
                      unitPriceInr: item.qty > 0 ? Math.round(item.totalInr / item.qty) : 0,
                      totalInr: item.totalInr,
                      imageUrl: item.imageUrl ?? null,
                    })),
                  };
                  return (
                    <GSTInvoicePopover
                      order={normalizedForGST}
                      existingGSTData={savedGSTData}
                      onClose={() => setShowGSTPopover(false)}
                      onSave={async (gstData) => {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('elios_access_token') : null;
                        await fetch(`/api/orders/${id}/gst`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                          body: JSON.stringify(gstData),
                        });
                        setSavedGSTData(gstData);
                        setShowGSTPopover(false);
                        addToast({ type: 'success', title: 'GST Invoice saved', description: 'Client can now download it.' });
                      }}
                      onDownload={(gstData) => generateGSTInvoice(normalizedForGST, gstData)}
                    />
                  );
                })()}
              </div>
            </>
          )}
          {showGSTModal && (() => {
            const normalized = apiOrder ? {
              orderId:         apiOrder.orderNumber,
              date:            new Date(apiOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              client:          apiOrder.client?.companyName ?? '—',
              lineItems:       (apiOrder.items ?? []).map((item: any) => ({
                name:         item.product?.name ?? item.notes ?? 'Item',
                qty:          Number(item.quantity ?? 1),
                unitPriceInr: parseFloat(item.unitPriceINR || '0'),
                totalInr:     parseFloat(item.totalINR   || '0'),
                imageUrl:     item.imageUrl ?? item.product?.imageUrl ?? null,
              })),
              requestPayments: apiOrder.requestPayments ?? [],
            } : {
              orderId:         initial?.orderId,
              date:            initial?.date,
              client:          typeof initial?.client === 'string' ? initial.client : '—',
              lineItems:       items.map((item: any) => ({
                name:         item.name,
                qty:          item.qty,
                unitPriceInr: item.qty > 0 ? Math.round(item.totalInr / item.qty) : 0,
                totalInr:     item.totalInr,
                imageUrl:     item.imageUrl ?? null,
              })),
              requestPayments: payments,
            };
            return (
              <GSTInvoiceModal
                order={normalized}
                onClose={() => setShowGSTModal(false)}
                onGenerate={(gstData) => {
                  generateInvoice(normalized, gstData);
                  setShowGSTModal(false);
                }}
              />
            );
          })()}
        </div>
      </div>

      {warehouseHasNewUpdate && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-600 text-amber-800">Warehouse has submitted a new update for this order.</p>
            <p className="text-xs text-amber-700 mt-0.5">Review the Warehouse Reports section below.</p>
          </div>
          <button onClick={markWarehouseReadByStaff} className="text-xs text-amber-700 font-600 underline hover:no-underline flex-shrink-0">Dismiss</button>
        </div>
      )}

      {status === 'Exception' && (
        <div className="mb-5">
          <ExceptionChat orderId={initial.id} isAdmin={false} />
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

          {/* Order Items */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600 w-14">Image</th>
                    <th className="py-2 text-left font-600">Item</th>
                    <th className="text-right font-600">Qty</th>
                    <th className="text-right font-600">Unit (¥)</th>
                    <th className="text-right font-600">Total (¥)</th>
                    <th className="text-right font-600">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(it => (
                    <tr key={it.name}>
                      <td className="py-3 pr-3">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.name} className="w-12 h-12 object-cover rounded" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : (
                          <ProductImage
                            productName={it.name}
                            canUpload={true}
                            onUpload={() => addToast({ type: 'success', title: 'Image saved', description: `Product image updated for ${it.name}` })}
                          />
                        )}
                      </td>
                      <td className="py-3 font-500">{it.name}</td>
                      <td className="text-right font-tabular">{it.qty}</td>
                      <td className="text-right font-tabular">¥{it.unitCny}</td>
                      <td className="text-right font-tabular">¥{it.totalCny.toLocaleString()}</td>
                      <td className="text-right font-tabular font-600">₹{it.totalInr.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipment Timeline */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Shipment Timeline</h3>
            <p className="text-xs text-muted-foreground mb-3">Click a stage circle to toggle it as completed.</p>
            <ol className="space-y-2.5">
              {stages.map((s, i) => {
                const done = completedStages.length > 0 ? completedStages.includes(s) : i <= stageIdx;
                const current = !completedStages.length && i === stageIdx;
                return (
                  <li key={s} className="flex items-start gap-3">
                    <button
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${done ? 'bg-emerald-500 text-white hover:bg-emerald-600' : current ? 'bg-[#4A3B52] text-white animate-pulse' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                      onClick={async () => {
                        if (!apiOrder) return;
                        const updated = done ? completedStages.filter(cs => cs !== s) : [...completedStages, s];
                        setCompletedStages(updated);
                        try {
                          await apiFetch(`/api/orders/${id}/stages`, { method: 'PATCH', body: JSON.stringify({ completedStages: updated }) });
                        } catch {
                          addToast({ type: 'error', title: 'Failed to update stage' });
                        }
                      }}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                    </button>
                    <p className={`text-sm ${current ? 'font-700 text-[#4A3B52]' : done ? 'font-500' : 'font-500 text-muted-foreground'}`}>{s}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Tracking update + history — shown from Shipped from China onwards */}
          {stageIdx >= 6 && (
            <>
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
                    <input className="input-field w-full text-sm" value={trackingLocation} onChange={e => setTrackingLocation(e.target.value)} placeholder="e.g. Shanghai Port, China" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Status Message <span className="text-red-500">*</span></label>
                    <textarea className="input-field w-full text-sm resize-none" rows={2} value={trackingMessage} onChange={e => setTrackingMessage(e.target.value)} placeholder="e.g. Cargo has cleared customs and is awaiting loading" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Stage (optional)</label>
                    <select className="input-field w-full text-sm" value={trackingStage} onChange={e => setTrackingStage(e.target.value)}>
                      <option value="">— Select shipment stage —</option>
                      {['At Origin Warehouse', 'Departed Origin', 'In Transit — Sea/Air', 'Customs Clearance', 'Arrived Destination Port', 'Out for Delivery', 'Delivered'].map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleAddTrackingUpdate} disabled={trackingSubmitting} className="px-4 py-2 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60">
                    {trackingSubmitting ? 'Adding…' : 'Add Update'}
                  </button>
                </div>
              </div>

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
              <li className="flex items-center justify-between py-2 border-b border-border text-sm">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Commercial Invoice</span>
                <div className="flex gap-1">
                  <button onClick={() => uploadDoc('Commercial Invoice')} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                  <button onClick={() => generateCommercialInvoice(apiOrder ?? mockMatch)} className="text-[#4A3B52] text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                </div>
              </li>
              <li className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Packing List</span>
                <div className="flex gap-1">
                  <button onClick={() => uploadDoc('Packing List')} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                  <button onClick={() => generatePackingList(apiOrder ?? mockMatch)} className="text-[#4A3B52] text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                </div>
              </li>
            </ul>
          </div>

          {/* Notes & Activity Log */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Notes & Activity Log</h3>
            <div className="flex gap-2 mb-3">
              <input value={note} onChange={e => setNote(e.target.value)} className="input-field flex-1" placeholder="Add internal note..." />
              <button onClick={addNote} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm"><MessageSquare className="w-3.5 h-3.5" /> Add Note</button>
            </div>
            <ol className="space-y-3 max-h-72 overflow-y-auto">
              {notes.map((n: any) => (
                <li key={n.id} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0">{n.icon}</span>
                  <div className="flex-1"><p>{n.message}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.actor} • {n.time}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Payment Verification — only for live API orders */}
          {apiOrder && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#4A3B52]" /> Payment Verification
              </h3>

              {payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payment submissions yet.</p>
              )}

              {payments.map((p: any) => {
                const amount = parseFloat(p.amountINR || '0').toLocaleString('en-IN');
                const typeLabel = p.type === 'ADVANCE' ? 'ADVANCE' : 'BALANCE';
                const dateStr = p.submittedAt
                  ? new Date(p.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '';
                const verifiedBy = p.verifiedBy ? `${p.verifiedBy.firstName} ${p.verifiedBy.lastName}` : '';

                if (p.status === 'SUBMITTED') return (
                  <div key={p.id} className="rounded-xl border border-border bg-muted/30 p-4 mb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-700 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mr-2">{typeLabel}</span>
                        <span className="font-600 text-sm">₹{amount}</span>
                      </div>
                      <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">SUBMITTED</span>
                    </div>
                    {dateStr && <p className="text-xs text-muted-foreground mb-1">Submitted: {dateStr}</p>}
                    {p.notes && <p className="text-xs text-muted-foreground mb-3">Notes: {p.notes}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {p.proofImageBase64 && (
                        <button
                          onClick={() => setProofModalUrl(p.proofImageBase64)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Proof
                        </button>
                      )}
                      <button
                        disabled={paymentActionLoading}
                        onClick={async () => {
                          if (!confirm(`Confirm payment of ₹${amount}?`)) return;
                          setPaymentActionLoading(true);
                          try {
                            await paymentsApi.verifyRequestPayment(p.id, 'VERIFY');
                            addToast({ type: 'success', title: 'Payment verified!' });
                            await fetchOrder();
                          } catch {
                            addToast({ type: 'error', title: 'Failed to verify payment' });
                          } finally {
                            setPaymentActionLoading(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                      </button>
                      <button
                        disabled={paymentActionLoading}
                        onClick={() => { setRejectModalId(p.id); setRejectReason(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );

                if (p.status === 'VERIFIED') return (
                  <div key={p.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600 text-emerald-800">✅ {typeLabel} — ₹{amount} — Verified{p.proofImageBase64 && (<button onClick={() => setProofModalUrl(p.proofImageBase64)} className="text-xs text-blue-600 underline ml-2">View Proof</button>)}</p>
                        {verifiedBy && (
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Verified by: {verifiedBy}{p.verifiedAt ? ` on ${new Date(p.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {p.proofImageBase64 && (
                      <button
                        onClick={() => setProofModalUrl(p.proofImageBase64)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-colors text-emerald-800"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Proof
                      </button>
                    )}
                  </div>
                );

                if (p.status === 'REJECTED') return (
                  <div key={p.id} className="rounded-xl border border-red-200 bg-red-50 p-3 mb-3">
                    <p className="text-sm font-600 text-red-800">❌ {typeLabel} — ₹{amount} — Rejected{p.proofImageBase64 && (<button onClick={() => setProofModalUrl(p.proofImageBase64)} className="text-xs text-blue-600 underline ml-2">View Proof</button>)}</p>
                    {p.rejectionReason && <p className="text-xs text-red-700 mt-1">Reason: {p.rejectionReason}</p>}
                    {p.proofImageBase64 && (
                      <button
                        onClick={() => setProofModalUrl(p.proofImageBase64)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg border border-red-300 hover:bg-red-100 transition-colors text-red-800"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Proof
                      </button>
                    )}
                  </div>
                );

                return null;
              })}
            </div>
          )}

          {/* Reject reason modal */}
          {rejectModalId && (
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
              <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="font-700 mb-4">Reject Payment Proof</h3>
                <label className="text-sm font-600 text-foreground mb-1.5 block">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value.slice(0, 500))}
                  placeholder="e.g. Screenshot is unclear, wrong amount shown..."
                  rows={3}
                  className="input-field w-full resize-none text-sm mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => setRejectModalId(null)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                  <button
                    disabled={!rejectReason.trim() || paymentActionLoading}
                    onClick={async () => {
                      setPaymentActionLoading(true);
                      try {
                        await paymentsApi.verifyRequestPayment(rejectModalId, 'REJECT', rejectReason.trim());
                        addToast({ type: 'success', title: 'Payment rejected. Client notified.' });
                        setRejectModalId(null);
                        setRejectReason('');
                        await fetchOrder();
                      } catch {
                        addToast({ type: 'error', title: 'Failed to reject payment' });
                      } finally {
                        setPaymentActionLoading(false);
                      }
                    }}
                    className="flex-1 py-2.5 text-sm bg-red-600 text-white rounded-lg font-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {paymentActionLoading ? 'Rejecting…' : 'Reject Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logistics */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{carrier.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{carrier.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tracking #</span><span className="font-tabular font-500">{carrier.trackingNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular font-500">{initial.estimatedDelivery}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-500">{loc.label}</span></div>
              <Link href={`/staff/sourcing/orders/tracking/${initial.id}`} className="btn-primary block text-center mt-3 py-2 text-xs">Open Live Tracking</Link>
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
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className="input-field flex-1 min-w-0" placeholder="Reply to client..." />
          <button onClick={sendChatMessage} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>

      {/* Warehouse Reports (read-only) + Staff Reply */}
      {(stageIdx >= 5 || apiWarehouseReport !== null) && (
        <div className="mt-5 space-y-5" onMouseEnter={warehouseHasNewUpdate ? markWarehouseReadByStaff : undefined}>
          <div className="flex items-center gap-3 border-t border-border pt-5">
            <h3 className="font-700 text-foreground text-lg">Warehouse Reports</h3>
            {warehouseHasNewUpdate && (
              <span className="text-[11px] font-700 px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">New Update</span>
            )}
          </div>

          {apiWarehouseReport?.reportSubmitted ? (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-700">Items Report from Warehouse</h4>
                {(() => {
                  const items = (apiWarehouseReport.itemReports as any[]) ?? [];
                  const hasIssues = items.some((it: any) => it.status === 'issue');
                  return (
                    <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${hasIssues ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {hasIssues ? 'Issues Found' : 'All OK'}
                    </span>
                  );
                })()}
              </div>
              <div className="space-y-2">
                {((apiWarehouseReport.itemReports as any[]) ?? []).map((item: any, i: number) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-600 text-sm">{item.itemName ?? item.name}</p>
                      <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${item.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status === 'ok' ? 'All OK' : 'Issue'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Received Qty: {item.receivedQty}</p>
                    {item.notes && <p className="text-xs text-red-600 mt-1">{item.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <p className="text-sm text-muted-foreground">No warehouse items report submitted yet.</p>
            </div>
          )}

          {/* Warehouse Note + Photos (from Upload & Notify) */}
          {(apiWarehouseReport?.warehouseNote || (apiWarehouseReport?.repackPhotos?.length ?? 0) > 0) && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">📦 Product Photos from Warehouse</h4>

              {apiWarehouseReport?.warehouseNote && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-600 text-yellow-800">📝 Note from Warehouse:</p>
                  <p className="text-sm text-yellow-700 mt-1">{apiWarehouseReport.warehouseNote}</p>
                  {apiWarehouseReport.photosSentAt && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Sent: {new Date(apiWarehouseReport.photosSentAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {(apiWarehouseReport?.repackPhotos?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-600 text-gray-700 mb-2">Product Photos ({apiWarehouseReport.repackPhotos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(apiWarehouseReport.repackPhotos as string[]).map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          className={`w-full h-28 object-cover rounded-lg cursor-pointer border-2 transition-all ${lightboxUrl === url ? 'border-[#4A3B52]' : 'border-transparent'}`}
                          onClick={() => setLightboxUrl(lightboxUrl === url ? null : url)}
                        />
                        <a href={url} download target="_blank" rel="noreferrer"
                          className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          ⬇ Download
                        </a>
                      </div>
                    ))}
                  </div>
                  {lightboxUrl && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border border-border">
                      <button onClick={() => setLightboxUrl(null)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">✕</button>
                      <img src={lightboxUrl} className="w-full max-h-80 object-contain bg-black/5" />
                      <a href={lightboxUrl} download target="_blank" rel="noreferrer" className="block py-1.5 text-center text-xs text-[#4A3B52] underline border-t border-border">Download Full Image</a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2">
                {apiWarehouseReport?.clientApproved === true && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-600">
                    ✓ Client Approved for Shipping
                  </span>
                )}
                {apiWarehouseReport?.clientApproved === false && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-600 text-red-700">✗ Client Flagged an Issue</p>
                    {apiWarehouseReport.clientConcern && <p className="text-sm text-red-600 mt-0.5">{apiWarehouseReport.clientConcern}</p>}
                  </div>
                )}
                {apiWarehouseReport?.clientApproved == null && (apiWarehouseReport?.repackPhotos?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                    ⏳ Awaiting Client Approval
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Repacking details — weight / dimensions / notes only (photos shown in card above) */}
          {apiWarehouseReport?.repackSaved && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Repacking Details</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
                {apiWarehouseReport.finalWeightKg != null && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Final Weight</p><p className="font-500">{apiWarehouseReport.finalWeightKg} KG</p></div>
                )}
                {apiWarehouseReport.finalVolumeCbm != null && (
                  <div><p className="text-[10px] uppercase text-muted-foreground">Final Volume</p><p className="font-500">{apiWarehouseReport.finalVolumeCbm} CBM</p></div>
                )}
              </div>
              {apiWarehouseReport.repackNotes && <p className="text-sm text-muted-foreground italic">{apiWarehouseReport.repackNotes}</p>}
            </div>
          )}

          {/* Delivery preference */}
          {apiOrder?.deliveryPreference && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Delivery Preference</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preference</span>
                  <span className="font-600">{apiOrder.deliveryPreference === 'self_pickup' ? 'Self Pickup' : 'Deliver to Address'}</span>
                </div>
                {apiOrder.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-500 text-right max-w-[60%]">{apiOrder.deliveryAddress}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Staff reply to warehouse */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h4 className="font-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Reply to Warehouse Staff</h4>
            {warehouseReplies.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {warehouseReplies.map((reply: any, i: number) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <p className="text-sm">{reply.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(reply.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {warehouseReplies.length === 0 && <p className="text-sm text-muted-foreground mb-3">No messages sent to warehouse yet.</p>}
            <div className="flex gap-2">
              <input value={warehouseReplyInput} onChange={e => setWarehouseReplyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendWarehouseReply(); }} className="input-field flex-1 min-w-0" placeholder="Send a message to warehouse staff..." />
              <button onClick={sendWarehouseReply} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0"><MessageSquare className="w-3.5 h-3.5" /> Send</button>
            </div>
          </div>
        </div>
      )}

      {proofModalUrl && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProofModalUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setProofModalUrl(null)}
              className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black/80"
            >
              ✕
            </button>
            <img
              src={proofModalUrl}
              alt="Payment Proof"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
