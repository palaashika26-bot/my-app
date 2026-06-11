'use client';
import React, { useState, use, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { ordersApi } from '@/lib/api/orders.api';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import { uploadFiles } from '@/lib/upload';
import type { ApiOrder } from '@/lib/types/api.types';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers ?? {}) },
  });
}

// ─── Backend-ready tracking functions ─────────────────────────────────────────

// Canonical shipment stages — value is the backend snake_case key, label is shown in the UI.
const STAGE_DISPLAY: Record<string, string> = {
  order_placed: 'Order Placed',
  payment_confirmed: 'Payment Confirmed',
  sourcing: 'Sourcing',
  at_china_warehouse: 'At China Warehouse',
  china_consolidation_warehouse: 'China Consolidation Warehouse',
  repacking_warehouse: 'Repacking Warehouse',
  shipped_from_china: 'Shipped from China',
  in_transit: 'In Transit',
  arrived_india_warehouse: 'Arrived India Warehouse',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
};

// Backend-persisted tracking via the /api/tracking/[orderId] BFF (read-only for clients).
// NOTE: orderId MUST be the Order UUID (DB id), not the public orderNumber.
async function getTrackingUpdates(orderId: string) {
  try {
    const res = await apiFetch(`/api/tracking/${orderId}`);
    if (!res.ok) return [];
    const json = await res.json();
    const rows: any[] = json?.data ?? [];
    return rows
      .map((r) => ({
        id: r.id,
        location: STAGE_DISPLAY[r.stage] ?? r.stage ?? 'Update',
        message: r.statusNote ?? '',
        stage: '',
        addedBy: 'Elios Team',
        addedByRole: 'Sourcing & Logistics',
        timestamp: r.updatedAt ?? new Date().toISOString(),
      }))
      .reverse();
  } catch {
    return [];
  }
}
import StatusBadge from '@/components/ui/StatusBadge';
import dynamic from 'next/dynamic';

const ShipmentTimeline = dynamic(() => import('@/components/ShipmentTimeline'), { ssr: false });
import ExceptionChat from '@/components/ExceptionChat';

import { getEffectiveOrderStatus, getOrderQcBundle } from '@/lib/orderQcStore';
import { ArrowLeft, Download, AlertTriangle, MapPin, CheckCircle2, XCircle, Circle, FileText, Info, Camera, X, ChevronLeft, ChevronRight, ZoomIn, MessageCircle, MessageSquare, Paperclip, Play, Package, Truck, Home, CreditCard, RefreshCw, Flag } from 'lucide-react';
import { generateInvoice } from '@/lib/generateInvoice';
import { generateGSTInvoice } from '@/lib/generateGSTInvoice';
import { generateCommercialInvoice } from '@/lib/generateCommercialInvoice';
import { generatePackingList } from '@/lib/generatePackingList';
import type { GSTData } from '@/components/GSTInvoicePopover';
import { paymentsApi } from '@/lib/api/payments.api';
import ProductImage from '@/components/ProductImage';
import { notFound } from 'next/navigation';

const stages = ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking Warehouse': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };

const CLIENT_STATUS_TO_STAGES: Record<string, string[]> = {
  'Order Confirmed':               ['Order Placed', 'Payment Confirmed'],
  'Payment Confirmed':             ['Order Placed', 'Payment Confirmed'],
  'Sourcing':                      ['Order Placed', 'Payment Confirmed', 'Sourcing'],
  'At China Warehouse':            ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse'],
  'China Consolidation Warehouse': ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse'],
  'Repacking Warehouse':           ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse'],
  'Shipped from China':            ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China'],
  'In Transit':                    ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit'],
  'Arrived India Warehouse':       ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse'],
  'Out for Delivery':              ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery'],
  'Completed':                     ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'],
};

const ADVANCE_PAID = 15000;

// ── Map backend status enums to frontend display strings ──────────────────────
const ORDER_STATUS_MAP: Record<string, string> = {
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED:       'Order Confirmed',
  ADVANCE_PAID:    'Payment Confirmed',
  FULLY_PAID:      'Payment Confirmed',
  SOURCING:        'Sourcing',
  QC_PENDING:      'At China Warehouse',
  QC_PASSED:       'At China Warehouse',
  QC_FAILED:       'Exception',
  REPACKING:       'Repacking Warehouse',
  SHIPPED:         'Shipped from China',
  DELIVERED:       'Completed',
  CANCELLED:       'Exception',
};

function mapApiOrderToRow(o: ApiOrder) {
  const totalINR = parseFloat(o.totalINR || '0');
  return {
    id: o.id,
    orderId: o.orderNumber,
    date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    itemCount: o.items?.length ?? 0,
    itemNames: o.items?.map((i) => i.product?.name ?? i.notes ?? '—').join(', ') || '',
    amount: `₹${totalINR.toLocaleString('en-IN')}`,
    amountCny: '',
    estimatedDelivery: o.shipment?.estimatedDelivery
      ? new Date(o.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—',
    status: (ORDER_STATUS_MAP[o.status] ?? o.status) as any,
    // Keep raw DB status for business logic (cancel, dispute window)
    status_raw: o.status,
    deliveredAt: (o.shipment as any)?.deliveredAt ?? null,
    client: o.client?.companyName,
    lineItems: o.items?.map((i) => ({
      id: i.id,
      name: i.product?.name ?? i.notes ?? '—',
      qty: i.quantity,
      unitPriceInr: parseFloat(i.unitPriceINR || '0'),
      totalInr: parseFloat(i.totalINR || '0'),
      imageUrl: i.imageUrl ?? i.product?.images?.[0] ?? null,
    })),
  };
}

// ── Contact Card ──────────────────────────────────────────────────────────────
function ContactCard({ orderId }: { orderId: string }) {
  const [contact, setContact] = useState<{
    admin: { firstName: string; lastName: string; email: string; phone: string | null } | null;
    staff: { firstName: string; lastName: string; email: string; phone: string | null; staffRole: string | null } | null;
  } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    fetch(`/api/orders/${orderId}/contact`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d?.success) setContact(d.data); })
      .catch(() => {});
  }, [orderId]);

  if (!contact) return null;
  const { admin, staff } = contact;
  // staff is a single object (or null) from the backend — not an array
  const staffList = staff ? [staff] : [];
  const contacts = [
    ...(admin ? [{ name: `${admin.firstName} ${admin.lastName}`, role: 'Account Manager', email: admin.email, phone: admin.phone }] : []),
    ...staffList.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      role: s.staffRole ?? 'Support Staff',
      email: s.email,
      phone: s.phone,
    })),
  ];
  if (!contacts.length) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <h3 className="text-sm font-700 mb-3">Your Account Team</h3>
      <p className="text-xs text-muted-foreground mb-4">Reach out to us directly for any questions about your order.</p>
      <div className="space-y-3">
        {contacts.map((c, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="w-9 h-9 rounded-full bg-[#4A3B52] text-white flex items-center justify-center text-sm font-700 flex-shrink-0">
              {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-600 text-foreground">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">{c.role}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-600 text-[#4A3B52] hover:underline"
                  >
                    📞 {c.phone}
                  </a>
                )}
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-1.5 text-xs font-600 text-[#4A3B52] hover:underline"
                >
                  ✉️ {c.email}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();

  // Always fetch fresh — never use stale in-memory cache for the detail page
  const [liveOrder, setLiveOrder] = useState<ReturnType<typeof mapApiOrderToRow> | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  // completedStages — driven by live API fetch only
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

    async function fetchGSTData() {
      if (!token) return;
      try {
        const res = await fetch(`/api/orders/${id}/gst`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d?.data) {
          setGstInvoiceData(d.data as GSTData);
          try { localStorage.setItem(`gst-invoice-${id}`, JSON.stringify(d.data)); } catch {}
        }
      } catch {}
    }

    // Lightweight poll — no photos, just status/approval/count.
    // Never re-downloads the heavy base64 array on every tick.
    async function fetchWarehouseStatus() {
      if (!token) return;
      try {
        const res = await apiFetch(`/api/orders/${id}/warehouse-report?photos=false`);
        const data = await res.json();
        if (data?.success && data?.data && data.data.orderId) {
          // Merge: preserve already-loaded photos so a poll never wipes them
          setWarehouseReport((prev: any) => ({
            ...data.data,
            repackPhotos: prev?.repackPhotos?.length ? prev.repackPhotos : [],
          }));
        }
      } catch {}
    }

    async function fetchOrderDisputes() {
      if (!token) return;
      try {
        const res = await apiFetch(`/api/orders/${id}/disputes`);
        const data = await res.json();
        if (data.success) setOrderDisputes(data.data ?? []);
      } catch {}
    }

    async function fetchOrder() {
      if (!token) { setApiLoading(false); return; }
      try {
        const res = await ordersApi.getOrderById(id);
        if (res.data.success && res.data.data) {
          const order = res.data.data;
          setLiveOrder(mapApiOrderToRow(order));
          const requestPayments = (order as any).requestPayments ?? [];
          setPayments(requestPayments);
          // Reconcile completedStages with DB status — DB status is authoritative
          const displayStatus: string = ORDER_STATUS_MAP[order.status] ?? order.status;
          const cs: string[] = (order as any).completedStages ?? [];
          const csMaxIdx = cs.length > 0
            ? Math.max(-1, ...cs.map((s: string) => stages.indexOf(s)).filter((n: number) => n >= 0))
            : -1;
          const dbStatusIdx = stageMap[displayStatus] ?? -1;
          let effectiveStages = cs;
          if (dbStatusIdx > csMaxIdx) {
            const derived = CLIENT_STATUS_TO_STAGES[displayStatus];
            if (derived && derived.length > 0) effectiveStages = derived;
          }
          setCompletedStages(effectiveStages);
          // Restore delivery preference if already saved
          if ((order as any).deliveryPreference) {
            setDeliveryOption((order as any).deliveryPreference === 'self_pickup' ? 'self' : 'deliver');
            if ((order as any).deliveryAddress) setDeliveryAddress((order as any).deliveryAddress);
            setDeliverySubmitted(true);
          }
        }
      } catch {}
      finally { setApiLoading(false); }
    }

    fetchOrder();
    fetchOrderDisputes();
    fetchGSTData();
    fetchWarehouseStatus();
    // Poll order + GST + disputes every 30s; warehouse status every 60s
    const orderInterval = setInterval(() => { fetchOrder(); fetchOrderDisputes(); fetchGSTData(); }, 30000);
    const whInterval   = setInterval(fetchWarehouseStatus, 60000);
    return () => { clearInterval(orderInterval); clearInterval(whInterval); };
  }, [id]);

  const order = liveOrder;
  const [repackOpen, setRepackOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  interface ConcernAttachment { name: string; type: 'image' | 'video' | 'pdf'; base64: string; size: number; }

  // Raise a Concern state
  const [concernOpen, setConcernOpen] = useState(false);
  const [concernMsg, setConcernMsg] = useState('');
  const [concernAttachments, setConcernAttachments] = useState<ConcernAttachment[]>([]);
  const [concernSubmitted, setConcernSubmitted] = useState(false);
  const [isSubmittingConcern, setIsSubmittingConcern] = useState(false);
  const concernFileRef = useRef<HTMLInputElement>(null);

  // Warehouse report from API (for repack photos and approval status)
  const [warehouseReport, setWarehouseReport] = useState<any>(null);
  // true once the full base64 photos have been fetched and cached
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [modalPhotoLoading, setModalPhotoLoading] = useState(false);

  // Arrived India Warehouse delivery options
  const [deliveryOption, setDeliveryOption] = useState<null | 'self' | 'deliver'>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);
  const [logisticsEstimate, setLogisticsEstimate] = useState<null | { weight: string; mode: string; pricePerKg: string; note: string }>(null);
  const [approvalStatus, setApprovalStatus] = useState<null | 'approved' | 'flagged'>(null);
  const [showConcernInput, setShowConcernInput] = useState(false);
  const [clientLightboxUrl, setClientLightboxUrl] = useState<string | null>(null);
  const [concernText, setConcernText] = useState('');

  // Tracking updates state (read-only for client)
  interface TrackingUpdate { id: string; location: string; message: string; stage: string; addedBy: string; addedByRole: string; timestamp: string; }
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);

  // Payment state — fetched inside the main polling effect above
  const [payments, setPayments] = useState<any[]>([]);
  const [gstInvoiceData, setGstInvoiceData] = useState<GSTData | null>(() => {
    // Read from localStorage immediately so the GST row appears without waiting for API
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(`gst-invoice-${id}`);
      return stored ? JSON.parse(stored) as GSTData : null;
    } catch { return null; }
  });

  useEffect(() => {
    const saved = localStorage.getItem(`logistics-estimate-${id}`);
    if (saved) {
      try { setLogisticsEstimate(JSON.parse(saved)); } catch {}
    }
  }, [id]);

  // Disputes fetched for this order (for replacement status display)
  const [orderDisputes, setOrderDisputes] = useState<any[]>([]);

  // Dispute modals state. url/thumbUrl = uploaded storage paths (persisted);
  // preview = local object URL for the in-modal thumbnail only.
  interface DisputeFile { name: string; url: string; thumbUrl?: string; mimeType: string; preview: string; }

  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementFiles, setReplacementFiles] = useState<DisputeFile[]>([]);
  const [replacementUploading, setReplacementUploading] = useState(false);
  const [replacementSubmitting, setReplacementSubmitting] = useState(false);
  const [replacementToast, setReplacementToast] = useState('');

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueFiles, setIssueFiles] = useState<DisputeFile[]>([]);
  const [issueUploading, setIssueUploading] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueToast, setIssueToast] = useState('');

  const replacementFileRef = useRef<HTMLInputElement>(null);
  const issueFileRef = useRef<HTMLInputElement>(null);

  interface ChatMessage { id: string; sender: 'admin' | 'client'; text: string; time: string; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const lastChatSent = React.useRef(0);

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

  // Load tracking updates + seed demo data for BK-ORD-2024-0268
  useEffect(() => {
    if (!order?.id) return;
    getTrackingUpdates(order.id).then(setTrackingUpdates);
  }, [order?.id]);

  function sendChatMessage() {
    const now = Date.now();
    if (now - lastChatSent.current < 2000) { alert('Please wait before sending again.'); return; }
    const sanitized = chatInput.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized) return;
    lastChatSent.current = now;
    const newMsg: ChatMessage = { id: `msg-${Date.now()}`, sender: 'client', text: sanitized, time: 'Just now' };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(`order-chat-${id}`, JSON.stringify(updated));
    setChatInput('');
  }

  if (apiLoading) {
    return (
      <ClientLayout>
        <div className="animate-pulse space-y-4 pb-10">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <div className="h-6 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-72" />
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="h-4 bg-muted rounded w-16 mb-4" />
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded mb-2" />)}
              </div>
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="h-4 bg-muted rounded w-36 mb-4" />
                {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-muted rounded mb-2" />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-muted rounded mb-3" />)}
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }
  if (!order) return notFound();
  const qcBundle = getOrderQcBundle(order.id);
  const displayStatus = getEffectiveOrderStatus(order.id, order.status as any);
  const currentStage = stageMap[order.status] ?? -1;

  const repackingDone = completedStages.length > 0
    ? completedStages.includes('Repacking Warehouse')
    : currentStage >= 5;
  const isAtRepacking = repackingDone;
  const isAtIndiaWarehouse = completedStages.length > 0
    ? completedStages.includes('Arrived India Warehouse')
    : order.status === 'Arrived India Warehouse';

  const items: { name: string; qty: number; unitInr: number; totalInr: number; imageUrl?: string | null }[] =
    (order as any).lineItems?.map((li: any) => ({
      name: li.name,
      qty: li.qty ?? li.quantity ?? 0,
      unitInr: li.unitPriceInr ?? li.unitPriceINR ?? 0,
      totalInr: li.totalInr ?? li.totalINR ?? 0,
      imageUrl: li.imageUrl ?? null,
    })) ?? [];

  const productCost = items.reduce((s, i) => s + i.totalInr, 0);
  const logistics = 0;
  const grandTotal = productCost + logistics - ADVANCE_PAID;

  // Fetches the full base64 photos exactly once; subsequent opens use the cache.
  async function fetchWarehousePhotos() {
    if (photosLoaded) return;
    setModalPhotoLoading(true);
    try {
      const res = await apiFetch(`/api/orders/${id}/warehouse-report`);
      const data = await res.json();
      if (data?.success && data?.data && data.data.orderId) {
        setWarehouseReport(data.data);
        setPhotosLoaded(true);
      }
    } catch {}
    finally { setModalPhotoLoading(false); }
  }

  function openPhoto(i: number) {
    setPhotoIdx(i);
    setRepackOpen(true);
    fetchWarehousePhotos(); // lazy — no-op if already cached
  }
  function prevPhoto() {
    const count = warehouseReport?.repackPhotos?.length ?? 0;
    if (count === 0) return;
    setPhotoIdx((p) => (p - 1 + count) % count);
  }
  function nextPhoto() {
    const count = warehouseReport?.repackPhotos?.length ?? 0;
    if (count === 0) return;
    setPhotoIdx((p) => (p + 1) % count);
  }

  async function handleConcernImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (concernAttachments.length + picked.length > 5) {
      alert('Max 5 attachments per concern.');
      e.target.value = '';
      return;
    }
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/avi', 'video/webm'];
    const results: ConcernAttachment[] = [];
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`"${file.name}" is not a supported file type. Please upload images (jpg, png, webp), PDFs, or videos.`);
        continue;
      }
      const isVideo = file.type.startsWith('video/');
      const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > limit) {
        alert(`"${file.name}" exceeds ${isVideo ? '50 MB' : '10 MB'} and was skipped.`);
        continue;
      }
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const type = file.type.startsWith('image/') ? 'image' : isVideo ? 'video' : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setConcernAttachments(prev => [...prev, ...results].slice(0, 5));
    e.target.value = '';
  }

  async function submitConcern() {
    const sanitized = concernMsg.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized || isSubmittingConcern) return;
    setIsSubmittingConcern(true);
    // Call repack-approval API if this concern is from the repack review flow
    await handleFlagIssue(sanitized);
    setConcernSubmitted(true);
    setIsSubmittingConcern(false);
  }

  function closeConcernModal() {
    setConcernOpen(false);
    setConcernMsg('');
    setConcernAttachments([]);
    setConcernSubmitted(false);
    setIsSubmittingConcern(false);
  }

  function handleDownloadDocument(docType: string) {
    const date = new Date().toLocaleDateString('en-IN');
    let content = '';
    if (docType === 'Commercial Invoice') {
      content = `COMMERCIAL INVOICE\nEliosWholesale\nDate: ${date}\nInvoice #: INV-${order?.orderId}-${Date.now().toString().slice(-6)}\n\nOrder: ${order?.orderId}\nStatus: ${order?.status}\nDate Placed: ${order?.date}\n\nITEMS:\n${items.map(it => `${it.name} x${it.qty} — ₹${it.totalInr.toLocaleString()}`).join('\n')}\n\nProduct Cost: ₹${productCost.toLocaleString()}\nLogistics: ₹${logistics.toLocaleString()}\nAdvance Paid: -₹${ADVANCE_PAID.toLocaleString()}\n----------------------------\nGrand Total: ₹${grandTotal.toLocaleString()}\n\nExchange Rate: 1 CNY = ₹12.0\n`;
    } else {
      content = `PACKING LIST\nEliosWholesale\nDate: ${date}\nOrder: ${order?.orderId}\n\nITEMS:\n${items.map(it => `- ${it.name}: ${it.qty} units`).join('\n')}\n\nTotal Units: ${items.reduce((a, b) => a + b.qty, 0)}\n`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType.replace(/\s+/g, '-').toLowerCase()}-${order?.orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleApproveShipping() {
    setApprovalStatus('approved');
    setRepackOpen(false);
    if (liveOrder) {
      try {
        await apiFetch(`/api/orders/${id}/repack-approval`, {
          method: 'PATCH',
          body: JSON.stringify({ approved: true }),
        });
      } catch {}
    }
  }

  async function handleFlagIssue(concernText: string) {
    if (liveOrder) {
      try {
        await apiFetch(`/api/orders/${id}/repack-approval`, {
          method: 'PATCH',
          body: JSON.stringify({ approved: false, concern: concernText }),
        });
      } catch {}
    }
  }

  // Raw DB status — used by post-delivery dispute logic
  const rawStatus = (liveOrder as any)?.status_raw ?? (liveOrder as any)?.status ?? order?.status ?? '';

  // ── Post-delivery dispute helpers ─────────────────────────────────────────────
  const isDelivered = rawStatus === 'DELIVERED';
  const deliveredAt: string | null = (liveOrder as any)?.deliveredAt ?? null;

  const daysSinceDelivery = deliveredAt
    ? (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  // If deliveredAt is not recorded in DB, allow the window whenever order is DELIVERED.
  // Shipment.deliveredAt is only set via direct shipment update; most orders are marked
  // DELIVERED through the status endpoint which doesn't touch the Shipment row.
  const withinDisputeWindow = isDelivered && (deliveredAt === null || (daysSinceDelivery !== null && daysSinceDelivery <= 5));

  // Upload dispute proof files straight to object storage; only the returned
  // storage paths are persisted (a local object URL drives the in-modal preview).
  async function uploadDisputeFiles(
    e: React.ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<DisputeFile[]>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(picked, 'dispute');
      const results: DisputeFile[] = uploaded.map((u, i) => ({
        name: picked[i].name,
        url: u.url,
        thumbUrl: u.thumbUrl,
        mimeType: picked[i].type,
        preview: URL.createObjectURL(picked[i]),
      }));
      setFiles(prev => [...prev, ...results]);
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please check your connection and try again.' });
    } finally {
      setUploading(false);
    }
  }

  function removeDisputeFile(
    idx: number,
    setFiles: React.Dispatch<React.SetStateAction<DisputeFile[]>>
  ) {
    setFiles(prev => {
      const f = prev[idx];
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, j) => j !== idx);
    });
  }

  function handleReplacementFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    return uploadDisputeFiles(e, setReplacementFiles, setReplacementUploading);
  }

  function handleIssueFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    return uploadDisputeFiles(e, setIssueFiles, setIssueUploading);
  }

  async function handleSubmitReplacement() {
    if (replacementSubmitting || !replacementReason.trim()) return;
    setReplacementSubmitting(true);
    try {
      const attachments = replacementFiles.map(f => f.url);
      const attachmentThumbs = replacementFiles.map(f => f.thumbUrl ?? f.url);
      const videoProofUrl = attachments.length > 0 ? attachments[0] : undefined;
      const res = await apiFetch(`/api/orders/${id}/disputes`, {
        method: 'POST',
        body: JSON.stringify({ type: 'REPLACEMENT', reason: replacementReason.trim(), videoProofUrl, attachments, attachmentThumbs }),
      });
      const data = await res.json();
      if (data.success) {
        setReplacementOpen(false);
        setReplacementReason('');
        setReplacementFiles([]);
        addToast({ type: 'success', title: 'Request submitted', description: 'Your replacement request has been submitted. Admin will review it.' });
      } else {
        const msg = data.message ?? '';
        addToast({ type: 'error', title: 'Could not submit', description: msg.includes('window') ? 'The 5-day window to raise a dispute has passed.' : 'Unable to process request. Please contact support.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error', description: 'Please check your connection and try again.' });
    } finally {
      setReplacementSubmitting(false);
    }
  }

  async function handleSubmitIssue() {
    if (issueSubmitting || !issueType || !issueDescription.trim()) return;
    setIssueSubmitting(true);
    try {
      const attachments = issueFiles.map(f => f.url);
      const attachmentThumbs = issueFiles.map(f => f.thumbUrl ?? f.url);
      const videoProofUrl = attachments.length > 0 ? attachments[0] : undefined;
      const reason = `${issueType}: ${issueDescription.trim()}`;
      const res = await apiFetch(`/api/orders/${id}/disputes`, {
        method: 'POST',
        body: JSON.stringify({ type: 'ISSUE', reason, videoProofUrl, attachments, attachmentThumbs }),
      });
      const data = await res.json();
      if (data.success) {
        setIssueOpen(false);
        setIssueType('');
        setIssueDescription('');
        setIssueFiles([]);
        addToast({ type: 'success', title: 'Issue reported', description: 'Your issue report has been submitted. Admin will review it.' });
      } else {
        const msg = data.message ?? '';
        addToast({ type: 'error', title: 'Could not submit', description: msg.includes('window') ? 'The 5-day window to raise a dispute has passed.' : 'Unable to process request. Please contact support.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Network error', description: 'Please check your connection and try again.' });
    } finally {
      setIssueSubmitting(false);
    }
  }

  return (
    <ClientLayout>
      <Link href="/client-dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Orders</Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-tabular font-700 text-foreground">{order.orderId}</span>
            <StatusBadge status={order.status as any} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {order.date} • ETA: {order.estimatedDelivery}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {(order.status === 'Repacking Warehouse' ||
            qcBundle.submittedForClient ||
            displayStatus === 'Ready for Logistics' ||
            displayStatus === 'Return from China') && (
            <Link
              href={`/client/orders/${order.id}/qc`}
              className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <Camera className="w-4 h-4" /> View Repackaging
            </Link>
          )}
          {isAtRepacking && (
            <button
              onClick={() => setConcernOpen(true)}
              className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Raise a Concern
            </button>
          )}
          {(payments.some((p: any) => p.status === 'VERIFIED') || order?.status === 'Payment Confirmed' || order?.status === 'Completed') && (
            <button onClick={() => generateInvoice(order)} className="px-4 py-2 text-sm font-600 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-2"><Download className="w-4 h-4" /> Download Invoice</button>
          )}
          {gstInvoiceData && (
            <button
              onClick={() => generateGSTInvoice(order, gstInvoiceData)}
              className="px-4 py-2 text-sm font-600 rounded-lg border border-indigo-400 text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Download GST Invoice
            </button>
          )}
        </div>
      </div>

      {order.status === 'Exception' && (
        <div className="mb-5 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-600 text-red-800">Exception flagged</p>
              <p className="text-xs text-red-700 mt-1">Supplier reported short stock for 2 items. Our team is sourcing replacements.</p>
            </div>
          </div>
          <ExceptionChat orderId={order.id} isAdmin={false} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Items */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                  <th className="py-2 text-left font-600 w-14">Image</th><th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th><th className="text-right font-600">Unit Price</th><th className="text-right font-600">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {items.map(it => (
                    <tr key={it.name}>
                      <td className="py-3 pr-3">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <ProductImage productName={it.name} canUpload={false} />
                        )}
                      </td>
                      <td className="py-3 font-500">{it.name}</td><td className="text-right font-tabular">{it.qty}</td><td className="text-right font-tabular">₹{it.unitInr.toLocaleString()}</td><td className="text-right font-tabular font-600">₹{it.totalInr.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipment Timeline */}
          <div className="mt-2">
            <ShipmentTimeline orderId={id} isAdminOrStaff={false} orderStatus={order.status as string} />
          </div>

          {/* Post-Delivery Actions */}
          {isDelivered && liveOrder && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <p className="text-sm font-700 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Post-Delivery Actions
              </p>
              {withinDisputeWindow ? (
                (() => {
                  const hasReplacement = orderDisputes.some((d: any) => d.type === 'REPLACEMENT');
                  const hasIssue = orderDisputes.some((d: any) => d.type === 'ISSUE');
                  if (hasReplacement && hasIssue) return (
                    <p className="text-xs text-muted-foreground mt-1">You have already submitted a replacement request and an issue report for this order.</p>
                  );
                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-3 mt-1">
                        Your order has been delivered. You can request a replacement or report an issue within 5 days of delivery.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {!hasReplacement && (
                          <button
                            onClick={() => setReplacementOpen(true)}
                            className="px-4 py-2.5 text-sm font-600 rounded-lg border-2 border-amber-400 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" /> Request Replacement
                          </button>
                        )}
                        {!hasIssue && (
                          <button
                            onClick={() => setIssueOpen(true)}
                            className="px-4 py-2.5 text-sm font-600 rounded-lg border-2 border-orange-400 text-orange-700 hover:bg-orange-50 inline-flex items-center gap-2"
                          >
                            <Flag className="w-4 h-4" /> Report an Issue
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  The 5-day window to request replacement or report an issue has passed.
                </p>
              )}
            </div>
          )}

          {/* Replacement & Issue Dispute Status cards (right under timeline) */}
          {orderDisputes.filter((d: any) => d.type === 'REPLACEMENT' || d.type === 'ISSUE').map((dispute: any) => {
            const st = dispute.status;
            const isResolved = st === 'RESOLVED';
            const isRejected = st === 'REJECTED';
            const isUnderReview = st === 'UNDER_REVIEW';
            const isReplacement = dispute.type === 'REPLACEMENT';
            const label = isReplacement ? 'Replacement' : 'Issue';
            return (
              <div key={dispute.id} className={`rounded-xl border p-5 ${
                isResolved ? 'bg-emerald-50 border-emerald-300'
                : isRejected ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  {isResolved
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    : isRejected
                    ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    : isReplacement
                    ? <RefreshCw className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    : <Flag className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`text-sm font-700 ${isResolved ? 'text-emerald-800' : isRejected ? 'text-red-800' : 'text-amber-800'}`}>
                      {label} {isResolved ? 'Approved' : isRejected ? 'Rejected' : isUnderReview ? 'Under Review' : 'Requested'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isResolved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-amber-700'}`}>
                      {isResolved
                        ? `Your ${label.toLowerCase()} request has been approved.`
                        : isRejected
                        ? `Your ${label.toLowerCase()} request was rejected.${dispute.adminNote ? ` Note: ${dispute.adminNote}` : ''}`
                        : isUnderReview
                        ? `Your ${label.toLowerCase()} request is under review by our team.`
                        : `Your ${label.toLowerCase()} request is pending review.`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Submitted: {new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Repacking Warehouse Approval — inline card */}
          {repackingDone && ((warehouseReport?.repackPhotos?.length ?? 0) > 0 || (warehouseReport?.photoCount ?? 0) > 0) && (() => {
            const alreadyApproved = warehouseReport?.clientApproved === true || approvalStatus === 'approved';
            const alreadyFlagged = warehouseReport?.clientApproved === false || approvalStatus === 'flagged';

            if (alreadyApproved) return (
              <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                <p className="text-green-700 font-medium">✓ You approved these products for shipping</p>
              </div>
            );

            if (alreadyFlagged) return (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <p className="text-red-700 font-medium">✗ You flagged an issue{warehouseReport?.clientConcern ? `: ${warehouseReport.clientConcern}` : ''}</p>
                <p className="text-sm text-red-600 mt-1">Our team has been notified and will reach out to you shortly.</p>
              </div>
            );

            const photoCount = warehouseReport?.repackPhotos?.length || warehouseReport?.photoCount || 0;

            return (
              <div className="border-2 border-orange-400 rounded-xl p-5 bg-orange-50">
                <h3 className="font-semibold text-orange-800 text-lg mb-1">📦 Your Products are at Repacking Warehouse</h3>
                <p className="text-sm text-orange-700 mb-4">Please review the product photos below and confirm everything looks correct before we ship.</p>

                {warehouseReport?.repackPhotos?.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {warehouseReport.repackPhotos.map((url: string, i: number) => (
                        <img
                          key={i}
                          src={url}
                          className={`w-full h-40 object-cover rounded-lg cursor-pointer border-2 transition-all ${clientLightboxUrl === url ? 'border-[#4A3B52]' : 'border-orange-200'}`}
                          onClick={() => setClientLightboxUrl(clientLightboxUrl === url ? null : url)}
                        />
                      ))}
                    </div>
                    {clientLightboxUrl && (
                      <div className="mb-4 relative rounded-lg overflow-hidden border border-orange-200">
                        <button onClick={() => setClientLightboxUrl(null)} className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">✕</button>
                        <img src={clientLightboxUrl} className="w-full max-h-72 object-contain bg-black/5" />
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => openPhoto(0)}
                    className="w-full mb-4 py-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-100/50 text-orange-800 text-sm font-medium hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    View {photoCount > 0 ? `${photoCount} product photo${photoCount > 1 ? 's' : ''}` : 'product photos'}
                  </button>
                )}
                {!showConcernInput ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleApproveShipping}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700"
                    >
                      ✓ Approve for Shipping
                    </button>
                    <button
                      onClick={() => setShowConcernInput(true)}
                      className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-lg font-medium border border-red-300 hover:bg-red-200"
                    >
                      ✗ Flag an Issue
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <textarea
                      value={concernText}
                      onChange={e => setConcernText(e.target.value)}
                      placeholder="Describe the issue with your products..."
                      className="w-full border border-red-300 rounded-lg p-3 text-sm resize-none"
                      rows={3}
                    />
                    <button
                      onClick={async () => {
                        if (!concernText.trim()) return;
                        await handleFlagIssue(concernText);
                        setApprovalStatus('flagged');
                        setShowConcernInput(false);
                      }}
                      className="mt-2 w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700"
                    >
                      Submit Issue Report
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Arrived India Warehouse — delivery options */}
          {isAtIndiaWarehouse && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-700 mb-1">Your goods have arrived at the India warehouse!</h3>
              <p className="text-xs text-muted-foreground mb-4">Please choose how you'd like to receive your order.</p>
              {deliverySubmitted ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-600 text-emerald-800">
                      {deliveryOption === 'self' ? 'Self Pickup confirmed!' : 'Delivery address saved!'}
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {deliveryOption === 'self'
                        ? 'Our team will contact you with pickup instructions shortly.'
                        : `Our team will arrange delivery to: ${deliveryAddress}`}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setDeliveryOption('self')}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                        deliveryOption === 'self'
                          ? 'border-[#4A3B52] bg-[#4A3B52]/10'
                          : 'border-border hover:border-[#4A3B52]/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${deliveryOption === 'self' ? 'bg-[#4A3B52] text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-700">Self Pickup</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Pick up your goods directly from our India warehouse. No extra charges.</p>
                      </div>
                      {deliveryOption === 'self' && <span className="text-[11px] font-600 text-[#4A3B52]">Selected ✓</span>}
                    </button>

                    <button
                      onClick={() => setDeliveryOption('deliver')}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                        deliveryOption === 'deliver'
                          ? 'border-[#4A3B52] bg-[#4A3B52]/10'
                          : 'border-border hover:border-[#4A3B52]/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${deliveryOption === 'deliver' ? 'bg-[#4A3B52] text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-700">Deliver to my Address</p>
                        <p className="text-xs text-muted-foreground mt-0.5">We deliver to your doorstep. Delivery charges apply based on location.</p>
                      </div>
                      {deliveryOption === 'deliver' && <span className="text-[11px] font-600 text-[#4A3B52]">Selected ✓</span>}
                    </button>
                  </div>

                  {deliveryOption === 'deliver' && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <p className="text-xs font-600 text-foreground">Enter your delivery address</p>
                      <textarea
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value.replace(/[<>"']/g, '').slice(0, 500))}
                        placeholder="Full delivery address including city, state and PIN code..."
                        rows={3}
                        className="input-field w-full resize-none text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Delivery charges will be calculated based on your location and communicated before dispatch.</p>
                    </div>
                  )}

                  {deliveryOption && (
                    <button
                      onClick={async () => {
                        setDeliverySubmitted(true);
                        if (liveOrder) {
                          try {
                            await apiFetch(`/api/orders/${id}/delivery-preference`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                deliveryPreference: deliveryOption === 'self' ? 'self_pickup' : 'delivery',
                                deliveryAddress: deliveryOption === 'deliver' ? deliveryAddress : undefined,
                              }),
                            });
                          } catch {}
                        }
                      }}
                      disabled={deliveryOption === 'deliver' && !deliveryAddress.trim()}
                      className="btn-primary mt-4 px-5 py-2.5 text-sm disabled:opacity-40"
                    >
                      Confirm {deliveryOption === 'self' ? 'Self Pickup' : 'Delivery'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* 3. Payment / Payment Gateway — only for live API orders */}
          {liveOrder && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#4A3B52]" /> Payment
              </h3>

              {payments.length === 0 && (liveOrder as any).status === 'CONFIRMED' && (
                <Link
                  href={`/payment/${id}`}
                  className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Make Payment →
                </Link>
              )}

              {payments.length === 0 && (liveOrder as any).status !== 'CONFIRMED' && (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              )}

              {payments.map((p: any) => {
                const amount = parseFloat(p.amountINR || '0').toLocaleString('en-IN');
                const typeLabel = p.type === 'ADVANCE' ? 'Advance' : 'Balance';
                const dateStr = p.submittedAt
                  ? new Date(p.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '';

                if (p.status === 'SUBMITTED') return (
                  <div key={p.id} className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-600">💰 {typeLabel} Payment — ₹{amount}</span>
                      <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Under Review</span>
                    </div>
                    {dateStr && <p className="text-xs text-blue-700">Submitted: {dateStr}</p>}
                    <p className="text-xs text-blue-600 mt-1">Our team will verify within 24 hours.</p>
                  </div>
                );

                if (p.status === 'VERIFIED') return (
                  <div key={p.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-600 text-emerald-800">✅ {typeLabel} Payment — ₹{amount} Confirmed</span>
                    </div>
                    {p.verifiedAt && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Verified on: {new Date(p.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                );

                if (p.status === 'REJECTED') return (
                  <div key={p.id} className="rounded-xl border border-red-200 bg-red-50 p-4 mb-3">
                    <p className="text-sm font-600 text-red-800 mb-1">❌ Payment Proof Rejected</p>
                    {p.rejectionReason && (
                      <p className="text-xs text-red-700 mb-2">Reason: {p.rejectionReason}</p>
                    )}
                    <Link
                      href={`/payment/${id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-600 text-red-700 hover:underline"
                    >
                      Resubmit Payment →
                    </Link>
                  </div>
                );

                return null;
              })}

              {(() => {
                const verifiedAdvance = payments
                  .filter((p: any) => p.type === 'ADVANCE' && p.status === 'VERIFIED')
                  .reduce((s: number, p: any) => s + parseFloat(p.amountINR || '0'), 0);
                const orderTotal = (liveOrder as any)?.totalINR ? parseFloat((liveOrder as any).totalINR) : 0;
                const balanceDue = orderTotal - verifiedAdvance;
                const hasBalance = payments.some((p: any) => p.type === 'BALANCE');
                if (verifiedAdvance > 0 && balanceDue > 0 && !hasBalance) {
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-3">
                      <p className="text-sm font-600 text-amber-800">✅ Advance paid: ₹{verifiedAdvance.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-amber-700 mt-1">💰 Balance due before shipping: ₹{balanceDue.toLocaleString('en-IN')}</p>
                      <Link
                        href={`/payment/${id}?type=BALANCE`}
                        className="btn-primary mt-3 w-full py-2.5 text-sm inline-flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Pay Balance →
                      </Link>
                    </div>
                  );
                }
                return null;
              })()}

              {payments.some((p: any) => p.type === 'ADVANCE' && p.status === 'VERIFIED') &&
               !payments.some((p: any) => p.type === 'BALANCE') &&
               (() => {
                 const verifiedAdvance = payments
                   .filter((p: any) => p.type === 'ADVANCE' && p.status === 'VERIFIED')
                   .reduce((s: number, p: any) => s + parseFloat(p.amountINR || '0'), 0);
                 const orderTotal = (liveOrder as any)?.totalINR ? parseFloat((liveOrder as any).totalINR) : 0;
                 return verifiedAdvance >= orderTotal;
               })() && (
                <p className="text-xs text-emerald-700 font-600 text-center py-2">✅ Fully paid</p>
              )}
            </div>
          )}

          {/* 4. Payment Summary — moved below Payment */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Cost</span><span className="font-tabular font-500">₹{productCost.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-emerald-600 font-500">Advance Paid</span><span className="font-tabular font-500 text-emerald-600">− ₹{ADVANCE_PAID.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Logistics (Sea)</span><span className="font-tabular font-500">₹{logistics.toLocaleString()}</span></div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-2 mt-1">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Indian Exchange Rate</span>
                <span className="font-tabular text-xs text-muted-foreground">1 CNY = ₹12.0</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between"><span className="font-700">Grand Total</span><p className="font-700 font-tabular text-foreground">₹{grandTotal.toLocaleString()}</p></div>
            </div>
          </div>

          {/* Toast notifications */}
          {replacementToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {replacementToast}
            </div>
          )}
          {issueToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {issueToast}
            </div>
          )}

          {/* Contact */}
          <ContactCard orderId={id} />

          {/* 5. Documents */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Documents</h3>
            <ul className="space-y-2">
                <li className="flex items-center justify-between text-sm py-2 border-b border-border">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Commercial Invoice</span>
                <button onClick={() => generateCommercialInvoice(order)} className="text-[#4A3B52] text-xs font-600 hover:underline inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
              </li>
              <li className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Packing List</span>
                <button onClick={() => generatePackingList(order)} className="text-[#4A3B52] text-xs font-600 hover:underline inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
              </li>
              {gstInvoiceData && (
                <li className="flex items-center justify-between text-sm py-2">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>GST Invoice</span>
                    {(() => {
                      try {
                        const msgs = JSON.parse(localStorage.getItem(`order-chat-${id}`) || '[]');
                        const today = new Date().toDateString();
                        const hasNew = msgs.some((m: any) => m.id?.startsWith('gst-') && new Date(m.time).toDateString?.() === today || (m.id?.startsWith('gst-') && Date.now() - parseInt(m.id.replace('gst-', '')) < 86400000));
                        return hasNew ? (
                          <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">New</span>
                        ) : null;
                      } catch { return null; }
                    })()}
                  </span>
                  <button
                    onClick={() => generateGSTInvoice(order, gstInvoiceData)}
                    className="text-indigo-600 text-xs font-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* 5. Conversation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-5">
            <h3 className="text-sm font-700 mb-3">Conversation</h3>
            <div className="space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 ${msg.sender === 'admin' ? 'bg-[#5c5470] text-white' : 'bg-[#c17b5c] text-white'}`}>
                    {msg.sender === 'admin' ? 'AS' : 'RK'}
                  </div>
                  <div className={`max-w-[85%] rounded-lg p-3 break-words ${msg.sender === 'admin' ? 'bg-muted/50' : 'bg-[#f0eef8]'}`}>
                    <p className="text-xs font-600">{msg.sender === 'admin' ? 'Arjun (Admin)' : 'You'}</p>
                    <p className="text-sm mt-1">{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <input
                className="input-field flex-1 min-w-0"
                placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
              />
              <button
                onClick={sendChatMessage}
                className="bg-[#4A3B52] hover:bg-[#1A1423] text-white px-3 sm:px-4 py-2 rounded-lg inline-flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap text-sm font-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {logisticsEstimate && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-700 mb-3">Logistics Details</h3>
              <div className="space-y-2 text-sm">
                {logisticsEstimate.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approx Weight</span>
                    <span className="font-500">{logisticsEstimate.weight}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
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
        </div>
      </div>

      {/* Repackaged Product Photo Gallery Modal */}
      {repackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto fade-in" onClick={() => setRepackOpen(false)} role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl w-full max-w-3xl my-auto max-h-[90vh] overflow-y-auto shadow-card-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <div className="flex items-center gap-2"><Camera className="w-5 h-5 text-[#4A3B52]" /><h3 className="font-700">Repackaged Product Photos</h3></div>
                <p className="text-xs text-muted-foreground mt-0.5">Order {order.orderId} • Verified at China warehouse</p>
              </div>
              <button onClick={() => setRepackOpen(false)} aria-label="Close" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5">
              <div className="relative">
                {modalPhotoLoading ? (
                  <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#4A3B52] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading photos…</p>
                  </div>
                ) : warehouseReport?.repackPhotos?.length > 0 ? (
                  <div className="aspect-video rounded-xl bg-muted flex items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={warehouseReport.repackPhotos[photoIdx % warehouseReport.repackPhotos.length]}
                      alt={`Repack photo ${photoIdx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-muted flex items-center justify-center shadow-inner">
                    <p className="text-sm text-muted-foreground">No photos available</p>
                  </div>
                )}
                {!modalPhotoLoading && warehouseReport?.repackPhotos?.length > 0 && (
                  <>
                    <button onClick={prevPhoto} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white" aria-label="Previous photo">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextPhoto} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white" aria-label="Next photo">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="absolute top-3 right-3 badge bg-white/90 text-foreground font-600">
                      <ZoomIn className="w-3 h-3 mr-1" />
                      {photoIdx + 1} / {warehouseReport.repackPhotos.length}
                    </span>
                  </>
                )}
              </div>



              {warehouseReport?.repackPhotos?.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {(warehouseReport.repackPhotos as string[]).map((url: string, i: number) => (
                    <button key={i} onClick={() => setPhotoIdx(i)} className={`aspect-square rounded-lg bg-muted overflow-hidden transition-all ${i === photoIdx ? 'ring-2 ring-accent ring-offset-2' : 'opacity-60 hover:opacity-100'}`} aria-label={`Photo ${i + 1}`}>
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
                {approvalStatus === 'approved' || warehouseReport?.clientApproved === true ? (
                  <div className="flex-1 py-2.5 text-sm text-center text-emerald-600 font-600 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Approved for Shipping
                  </div>
                ) : warehouseReport?.clientApproved === false ? (
                  <div className="flex-1 py-2.5 text-sm text-center text-amber-700 font-600 bg-amber-50 rounded-lg border border-amber-200">
                    Issue flagged — our team will follow up
                  </div>
                ) : (
                  <button onClick={handleApproveShipping} className="btn-primary flex-1 py-2.5 text-sm inline-flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Looks good — Approve for Shipping
                  </button>
                )}
                {!warehouseReport?.clientApproved && warehouseReport?.clientApproved !== false && (
                  <button onClick={() => { setRepackOpen(false); setConcernOpen(true); }} className="btn-secondary flex-1 py-2.5 text-sm">
                    Flag an issue
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-3">Photos are stored for 90 days after delivery as part of your order record.</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Replacement Modal */}
      {replacementOpen && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog" aria-modal="true"
          onClick={() => setReplacementOpen(false)}
        >
          <div className="bg-white dark:bg-card rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 text-amber-700">
                <RefreshCw className="w-5 h-5" />
                <h3 className="font-700">Request Replacement</h3>
              </div>
              <button onClick={() => setReplacementOpen(false)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={replacementReason}
                  onChange={e => setReplacementReason(e.target.value.slice(0, 1000))}
                  placeholder="Describe the issue..."
                  rows={4}
                  className="input-field w-full resize-none text-sm"
                />
              </div>
              {/* Multi-file upload — images and videos, no limit shown */}
              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">
                  Attach photos / videos <span className="text-muted-foreground font-400">(optional)</span>
                </label>
                <input
                  ref={replacementFileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleReplacementFilesChange}
                />
                {replacementFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {replacementFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.mimeType.startsWith('image/') ? (
                          <img src={f.preview} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-border bg-amber-50 flex flex-col items-center justify-center gap-1">
                            <Play className="w-5 h-5 text-amber-600" />
                            <span className="text-[9px] text-amber-700 text-center px-1 truncate w-full">{f.name.slice(0, 8)}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDisputeFile(i, setReplacementFiles)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => replacementFileRef.current?.click()}
                  disabled={replacementUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-amber-400 hover:bg-amber-50 text-sm text-amber-700 w-full justify-center disabled:opacity-50"
                >
                  <Paperclip className="w-4 h-4" /> {replacementUploading ? 'Uploading…' : 'Add photos or videos'}
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setReplacementOpen(false); setReplacementReason(''); setReplacementFiles([]); }} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                <button
                  onClick={handleSubmitReplacement}
                  disabled={replacementSubmitting || replacementUploading || !replacementReason.trim()}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
                >
                  {replacementSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Issue Modal */}
      {/* Report Issue Modal */}
      {issueOpen && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog" aria-modal="true"
          onClick={() => setIssueOpen(false)}
        >
          <div className="bg-white dark:bg-card rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2 text-orange-700">
                <Flag className="w-5 h-5" />
                <h3 className="font-700">Report an Issue</h3>
              </div>
              <button onClick={() => setIssueOpen(false)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">Issue type <span className="text-red-500">*</span></label>
                <select
                  value={issueType}
                  onChange={e => setIssueType(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">Select issue type...</option>
                  <option>Wrong Item Received</option>
                  <option>Missing Item(s)</option>
                  <option>Damaged Item</option>
                  <option>Defective Product</option>
                  <option>Product Not As Described</option>
                  <option>Expired Product</option>
                  <option>Fake/Counterfeit Product</option>
                  <option>Delivery Delayed</option>
                  <option>Package Tampered/Open</option>
                  <option>Size/Fit Issue</option>
                  <option>Billing Issue</option>
                  <option>Refund Issue</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value.slice(0, 1000))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="input-field w-full resize-none text-sm"
                />
              </div>
              {/* Multi-file upload — images and videos, no limit shown */}
              <div>
                <label className="text-xs font-600 text-foreground mb-1.5 block">
                  Attach photos / videos <span className="text-muted-foreground font-400">(optional)</span>
                </label>
                <input
                  ref={issueFileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleIssueFilesChange}
                />
                {issueFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {issueFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.mimeType.startsWith('image/') ? (
                          <img src={f.preview} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-border bg-orange-50 flex flex-col items-center justify-center gap-1">
                            <Play className="w-5 h-5 text-orange-600" />
                            <span className="text-[9px] text-orange-700 text-center px-1 truncate w-full">{f.name.slice(0, 8)}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDisputeFile(i, setIssueFiles)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => issueFileRef.current?.click()}
                  disabled={issueUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-orange-400 hover:bg-orange-50 text-sm text-orange-700 w-full justify-center disabled:opacity-50"
                >
                  <Paperclip className="w-4 h-4" /> {issueUploading ? 'Uploading…' : 'Add photos or videos'}
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setIssueOpen(false); setIssueType(''); setIssueDescription(''); setIssueFiles([]); }} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                <button
                  onClick={handleSubmitIssue}
                  disabled={issueSubmitting || issueUploading || !issueType || !issueDescription.trim()}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
                >
                  {issueSubmitting ? 'Submitting...' : 'Submit Issue Report'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Raise a Concern — top sheet */}
      <div className={`fixed inset-0 z-50 ${concernOpen ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true">
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${concernOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeConcernModal}
        />
        <div className={`absolute top-0 left-0 right-0 bg-card rounded-b-2xl shadow-xl transition-transform duration-300 ${concernOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#4A3B52]" />
              <h3 className="font-700">Raise a Concern</h3>
            </div>
            <button onClick={closeConcernModal} aria-label="Close" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {concernSubmitted ? (
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="font-700 text-foreground">Concern Raised Successfully</p>
                <p className="text-sm text-muted-foreground">Your concern has been raised. Our team will contact you shortly.</p>
                <button onClick={closeConcernModal} className="btn-primary px-6 py-2.5 text-sm mt-2">Close</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-600 text-foreground mb-1.5 block">Describe your concern <span className="text-red-500">*</span></label>
                  <textarea
                    value={concernMsg}
                    onChange={e => setConcernMsg(e.target.value)}
                    placeholder="Describe the issue you're facing with this shipment..."
                    rows={4}
                    className="input-field w-full resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-600 text-foreground mb-1.5 block">
                    Attach photos / videos / docs <span className="text-muted-foreground font-400">(optional, max 5)</span>
                  </label>
                  <input
                    ref={concernFileRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*,video/mp4,video/mov,video/quicktime,video/avi,video/webm,.pdf"
                    multiple
                    onChange={handleConcernImageAdd}
                  />
                  {concernAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {concernAttachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
                          {a.type === 'image' ? (
                            <img src={a.base64} alt={a.name} className="w-8 h-8 object-cover rounded" />
                          ) : a.type === 'video' ? (
                            <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center"><Play className="w-4 h-4 text-slate-600" /></div>
                          ) : (
                            <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
                          )}
                          <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">{a.name}</span>
                          <button type="button" onClick={() => setConcernAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => concernFileRef.current?.click()}
                    disabled={concernAttachments.length >= 5}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border hover:border-[#4A3B52] hover:bg-[#4A3B52]/10 text-sm text-muted-foreground hover:text-[#4A3B52] transition-colors disabled:opacity-40"
                  >
                    <Paperclip className="w-4 h-4" /> Click to attach files
                    {concernAttachments.length > 0 && <span className="ml-1 text-xs">{concernAttachments.length}/5</span>}
                  </button>
                </div>

                <div className="flex gap-2 pt-2 pb-1">
                  <button onClick={closeConcernModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                  <button
                    onClick={submitConcern}
                    disabled={!concernMsg.trim() || isSubmittingConcern}
                    className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
                  >
                    {isSubmittingConcern ? 'Submitting...' : 'Submit Concern'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
