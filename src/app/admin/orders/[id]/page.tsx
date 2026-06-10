'use client';
import React, { useState, use, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients, orderNotesLog, carrierForOrder, statusToLocation } from '@/lib/adminMockData';
import { ordersApi } from '@/lib/api/orders.api';
import { ordersCache } from '@/lib/api/ordersCache';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, XCircle, Circle, MapPin, Upload, Download, FileText, AlertTriangle, Mail, Edit3, MessageSquare, Camera, UserCheck, CreditCard, Eye, X, RefreshCw } from 'lucide-react';
import { generateInvoice } from '@/lib/generateInvoice';
import { generateGSTInvoice } from '@/lib/generateGSTInvoice';
import { generateCommercialInvoice } from '@/lib/generateCommercialInvoice';
import { generatePackingList } from '@/lib/generatePackingList';
import type { GSTData } from '@/components/GSTInvoicePopover';
import { paymentsApi } from '@/lib/api/payments.api';
import ProductImage from '@/components/ProductImage';
import { useAuth } from '@/context/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { notFound } from 'next/navigation';
import { getEffectiveOrderStatus } from '@/lib/orderQcStore';
import { getStaffRegistry } from '@/lib/staffStore';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';
import dynamic from 'next/dynamic';

const ShipmentTimeline = dynamic(() => import('@/components/ShipmentTimeline'), { ssr: false });
const GSTInvoiceModal = dynamic(() => import('@/components/GSTInvoiceModal'), { ssr: false });
const GSTInvoicePopover = dynamic(() => import('@/components/GSTInvoicePopover'), { ssr: false });
const ExceptionChat = dynamic(() => import('@/components/ExceptionChat'), { ssr: false });

const DEMO_SEED_UPDATES = [
  { id: '3', location: 'Mumbai JNPT Port', message: 'Shipment arrived at Mumbai port. Customs clearance initiated.', stage: 'Arrived Destination Port', addedBy: 'Meera Nair', addedByRole: 'Sourcing & Logistics Staff', timestamp: '2026-05-20T09:30:00.000Z' },
  { id: '2', location: 'Arabian Sea', message: 'Vessel is en route to India. Estimated arrival in 3 days.', stage: 'In Transit — Sea/Air', addedBy: 'Arjun Sharma', addedByRole: 'Admin', timestamp: '2026-05-17T14:00:00.000Z' },
  { id: '1', location: 'Shanghai Port, China', message: 'Cargo loaded onto vessel. Bill of lading issued.', stage: 'Departed Origin', addedBy: 'Meera Nair', addedByRole: 'Sourcing & Logistics Staff', timestamp: '2026-05-15T08:00:00.000Z' },
];

const ORDER_STATUS_MAP: Record<string, string> = {
  PAYMENT_PENDING: 'Payment Pending',
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

// Backend-persisted tracking via the /api/tracking/[orderId] BFF → Express /tracking/:orderId.
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
      .reverse(); // backend returns oldest→newest; show newest first
  } catch {
    return [];
  }
}

async function addTrackingUpdate(orderId: string, update: { stage: string; statusNote: string }) {
  const res = await apiFetch(`/api/tracking/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({ stage: update.stage, statusNote: update.statusNote }),
  });
  if (!res.ok) throw new Error('Failed to save tracking update');
  return res.json();
}

const stages = ['Order Placed','Payment Confirmed','Sourcing','At China Warehouse','China Consolidation Warehouse','Repacking Warehouse','Shipped from China','In Transit','Arrived India Warehouse','Out for Delivery','Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking Warehouse': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };

/**
 * Maps every display status to the CUMULATIVE ordered list of timeline stages
 * that should be ticked.  Module-level so it can be used in both fetchOrder
 * and the initial useEffect without closure / TDZ issues.
 */
const STATUS_TO_STAGES: Record<string, string[]> = {
  'Payment Pending':               [],
  'Order Confirmed':               ['Order Placed', 'Payment Confirmed'],
  'Payment Confirmed':             ['Order Placed', 'Payment Confirmed'],
  'Sourcing':                      ['Order Placed', 'Payment Confirmed', 'Sourcing'],
  'At China Warehouse':            ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse'],
  'China Consolidation Warehouse': ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse'],
  'Repacking Warehouse':           ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse'],
  'Ready for Shipping':            ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse'],
  'Ready for Logistics':           ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse'],
  'Return from China':             ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse'],
  'Shipped from China':            ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China'],
  'In Transit':                    ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit'],
  'Arrived India Warehouse':       ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse'],
  'Out for Delivery':              ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery'],
  'Completed':                     ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking Warehouse', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'],
  'Exception':                     [],
};
const statusOptions: OrderStatus[] = ['Payment Pending','Payment Confirmed','Sourcing','At China Warehouse','Repacking Warehouse','Ready for Shipping','Ready for Logistics','Return from China','Shipped from China','Arrived India Warehouse','Out for Delivery','Completed','Exception'];
const gstRates = [0, 5, 12, 18, 28];

const MOCK_ITEMS = [
  { name: 'LED Strip Light (RGB, 5m)', qty: 50, unitCny: 42, totalCny: 2100, totalInr: 25200 },
  { name: 'USB-C Cable (Braided)', qty: 100, unitCny: 8, totalCny: 800, totalInr: 9600 },
  { name: 'Wireless Earbuds', qty: 25, unitCny: 88, totalCny: 2200, totalInr: 26400 },
];

/**
 * Reconciles DB order.status with the stored completedStages.
 * The DB status is the authoritative source.  If completedStages is behind
 * the DB status (e.g. order was updated before our auto-sync fix), we
 * auto-derive the correct cumulative stages and fire a silent DB patch so
 * the data is healed for future loads.
 */
function reconcileOrderStages(order: any, orderId: string) {
  const displayStatus: string = ORDER_STATUS_MAP[order.status] ?? order.status;
  const cs: string[] = order.completedStages ?? [];

  // Index of the furthest stage already in completedStages
  const csMaxIdx = cs.length > 0
    ? Math.max(-1, ...cs.map((s: string) => stages.indexOf(s)).filter((n: number) => n >= 0))
    : -1;

  // Index that the DB status says we should be at
  const dbStatusIdx = stageMap[displayStatus] ?? -1;

  // If DB status is ahead of completedStages, derive the correct cumulative list
  let effectiveStages = cs;
  if (dbStatusIdx > csMaxIdx) {
    const derived = STATUS_TO_STAGES[displayStatus];
    if (derived && derived.length > 0) {
      effectiveStages = derived;
      // Self-heal the DB silently — fire and forget
      const token = typeof window !== 'undefined' ? localStorage.getItem('elios_access_token') : null;
      if (token) {
        fetch(`/api/orders/${orderId}/stages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ completedStages: derived }),
        }).catch(() => {});
      }
    }
  }

  return { effectiveStages, displayStatus };
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const { user, role } = useAuth();
  const perms = useAdminPermissions();
  const actorName = user?.name ?? 'Team';

  // Sync mock lookup (safe to use before hooks since it's from a static array)
  const mockOrder = mockAdminOrders.find(o => o.id === id) ?? null;
  const mockClient = mockClients.find(c => c.name === mockOrder?.client) ?? null;

  // ── API state ──────────────────────────────────────────────────────────────
  const [apiOrder, setApiOrder] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [status, setStatus] = useState(mockOrder?.status as string ?? '');
  const [gst, setGst] = useState(18);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(orderNotesLog);
  const [logisticsEstimate, setLogisticsEstimate] = useState<null | { weight: string; mode: string; pricePerKg: string; note: string }>(null);

  interface TrackingUpdate { id: string; location: string; message: string; stage: string; addedBy: string; addedByRole: string; timestamp: string; }
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [trackingLocation, setTrackingLocation] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackingStage, setTrackingStage] = useState('');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  // Payment verification state
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoadError, setPaymentsLoadError] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofImageError, setProofImageError] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showGSTModal, setShowGSTModal] = useState(false);
  const [showGSTPopover, setShowGSTPopover] = useState(false);
  const [savedGSTData, setSavedGSTData] = useState<GSTData | null>(null);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  function handleViewProof(payment: any) {
    const base64 = payment.proofImageBase64 as string | null | undefined;
    // A real screenshot is always at least ~10 KB → ~14 000 base64 chars.
    // If we get ≤ 5 000 chars the data was truncated by the old sanitiser (hard cap was 2 000).
    const isTruncated = !base64 || base64.length < 5000;

    setProofImageError(isTruncated);
    setProofModalUrl(base64 ?? null);
  }

  function refreshPayments(_orderId: string) {
    setPaymentsLoadError(false);
    ordersApi.getOrderById(id)
      .then(r => {
        setPayments((r.data?.data as any)?.requestPayments ?? []);
        setPaymentsLoadError(false);
      })
      .catch(() => setPaymentsLoadError(true));
  }

  async function fetchOrderDisputes() {
    try {
      const res = await apiFetch(`/api/orders/${id}/disputes`);
      const data = await res.json();
      if (data.success) setOrderDisputes(data.data ?? []);
    } catch {}
  }

  async function fetchOrder() {
    try {
      const r = await ordersApi.getOrderById(id);
      const order = r.data?.data;
      if (order) {
        setApiOrder(order);
        setPayments((order as any).requestPayments ?? []);
        const { effectiveStages, displayStatus } = reconcileOrderStages(order, id);
        setCompletedStages(effectiveStages);
        setStatus(displayStatus);
      }
      setPaymentsLoadError(false);
    } catch (err) {
      console.error('fetchOrder failed:', err);
      setPaymentsLoadError(true);
    }
  }

  // Lightweight poll — skips the heavy base64 photo array, preserves already-loaded photos
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
        const isNew = data.data.isReadByAdmin === false && !!data.data.lastUpdatedAt;
        setWarehouseHasNewUpdate(isNew);
      }
    } catch {}
  }

  // Called once on mount to load the full report including base64 photos
  async function fetchWarehouseReportFull() {
    try {
      const res = await apiFetch(`/api/orders/${id}/warehouse-report`);
      const data = await res.json();
      if (data?.success && data?.data && data.data.orderId) {
        setApiWarehouseReport(data.data);
        setWarehouseReplies(data.data.adminReplies ?? []);
        const isNew = data.data.isReadByAdmin === false && !!data.data.lastUpdatedAt;
        setWarehouseHasNewUpdate(isNew);
      }
    } catch {}
  }

  async function markWarehouseReadByAdmin() {
    setWarehouseHasNewUpdate(false);
    apiFetch(`/api/orders/${id}/warehouse-report`, {
      method: 'PATCH',
      body: JSON.stringify({ isReadByAdmin: true }),
    }).catch(() => {});
  }

  interface StaffAssignment { staffId: string; staffName: string; staffRole: string; assignedAt: string; }
  const [staffList] = useState(() => getStaffRegistry());
  const [assignment, setAssignment] = useState<StaffAssignment | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Staff contact card (client-facing) — loaded from DB
  const [staffUsers, setStaffUsers] = useState<{ id: string; firstName: string; lastName: string; staffRole: string | null }[]>([]);
  const [staffUsersLoading, setStaffUsersLoading] = useState(true);
  const [assignedStaffContactId, setAssignedStaffContactId] = useState<string>('');
  const [staffContactSaving, setStaffContactSaving] = useState(false);

  // Warehouse report state — loaded from API
  const [apiWarehouseReport, setApiWarehouseReport] = useState<any>(null);
  const [warehouseReplies, setWarehouseReplies] = useState<any[]>([]);
  const [warehouseReplyInput, setWarehouseReplyInput] = useState('');
  const [warehouseHasNewUpdate, setWarehouseHasNewUpdate] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [adminUploadLoading, setAdminUploadLoading] = useState(false);

  // completedStages — synced from API order
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  // Disputes for this order (replacement status)
  const [orderDisputes, setOrderDisputes] = useState<any[]>([]);

  interface ChatMessage { id: string; sender: 'admin' | 'client'; text: string; time: string; }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  type SupplierInfo = { supplierName: string; platform: string; productUrl: string; contact: string; priceCny: string; notes: string };
  const [supplierData, setSupplierData] = useState<Record<string, SupplierInfo>>(() => {
    if (typeof window === 'undefined') return {};
    const result: Record<string, SupplierInfo> = {};
    MOCK_ITEMS.forEach(item => {
      const stored = localStorage.getItem(`supplier-${id}-${item.name}`);
      if (stored) try { result[item.name] = JSON.parse(stored); } catch {}
    });
    return result;
  });
  const [supplierForm, setSupplierForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierInfo>({ supplierName: '', platform: '1688', productUrl: '', contact: '', priceCny: '', notes: '' });

  // ── Load real staff users + current staff contact assignment ─────────────────
  useEffect(() => {
    setStaffUsersLoading(true);
    Promise.allSettled([
      apiFetch('/api/staff-users').then(r => r.json()),
      apiFetch(`/api/orders/${id}/contact`).then(r => r.json()),
    ]).then(([staffRes, contactRes]) => {
      if (staffRes.status === 'fulfilled' && staffRes.value?.success) {
        setStaffUsers(staffRes.value.data ?? []);
      }
      if (contactRes.status === 'fulfilled' && contactRes.value?.success && contactRes.value.data?.staff?.id) {
        setAssignedStaffContactId(contactRes.value.data.staff.id);
      }
      setStaffUsersLoading(false);
    });
  }, [id]);

  // ── Effects: cache-first for instant render, background refresh ────────────
  useEffect(() => {
    const abortController = new AbortController();

    // Try cache first for instant render (data comes from the all-orders list fetch)
    const cached = ordersCache.get<any>(id);
    if (cached) {
      setApiOrder(cached);
      setPayments((cached as any).requestPayments ?? []);
      const { effectiveStages, displayStatus } = reconcileOrderStages(cached, id);
      setCompletedStages(effectiveStages);
      setStatus(displayStatus);
      setApiLoading(false);
    } else {
      setApiLoading(true);
    }

    // Always do a background API fetch for fresh data
    Promise.allSettled([
      ordersApi.getOrderById(id, abortController.signal),
      fetchWarehouseReportFull().catch(() => {}),
      fetchOrderDisputes(),
    ]).then(([orderResult]) => {
      if (abortController.signal.aborted) return;
      if (orderResult.status === 'fulfilled') {
        const order = orderResult.value.data?.data;
        if (order) {
          ordersCache.set(id, order);
          setApiOrder(order);
          setPayments((order as any).requestPayments ?? []);
          const { effectiveStages, displayStatus } = reconcileOrderStages(order, id);
          setCompletedStages(effectiveStages);
          setStatus(displayStatus);
        }
      }
    }).finally(() => {
      if (!abortController.signal.aborted && !cached) setApiLoading(false);
    });

    // Poll disputes every 30s
    const disputeInterval = setInterval(fetchOrderDisputes, 30000);

    return () => { abortController.abort(); clearInterval(disputeInterval); };
  }, [id]);

  // Lightweight poll every 60 s — checks for new updates without re-downloading photos
  useEffect(() => {
    const interval = setInterval(fetchWarehouseReport, 60000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('elios_access_token') : null;
    if (!token) return;
    fetch(`/api/orders/${id}/gst`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d?.data) setSavedGSTData(d.data); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem(`logistics-estimate-${id}`);
    if (saved) { try { setLogisticsEstimate(JSON.parse(saved)); } catch {} }
  }, [id]);

  useEffect(() => {
    const orderUuid = apiOrder?.id;
    if (!orderUuid) return;
    getTrackingUpdates(orderUuid).then(setTrackingUpdates);
  }, [apiOrder?.id]);

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

  useEffect(() => {
    const stored = localStorage.getItem(`order-chat-${id}`);
    if (stored) {
      try { setChatMessages(JSON.parse(stored)); return; } catch {}
    }
    const seed: ChatMessage[] = [{ id: 'seed-1', sender: 'admin', text: "Your order has been confirmed and is now being processed. We'll update you at each stage.", time: '2 hours ago' }];
    setChatMessages(seed);
    localStorage.setItem(`order-chat-${id}`, JSON.stringify(seed));
  }, [id]);

  // Warehouse data is now fetched from API in fetchWarehouseReport() above

  // ── Guard: 404 only after API resolves ────────────────────────────────────
  if (!apiLoading && !apiOrder && !mockOrder) return notFound();

  // ── Skeleton while loading real data (no mock fallback available) ──────────
  if (apiLoading && !mockOrder) {
    return (
      <AdminLayout>
        <Link href="/admin/all-orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <div className="h-6 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-64" />
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="h-4 bg-muted rounded w-24 mb-4" />
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded mb-2" />)}
              </div>
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
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
      </AdminLayout>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const displayOrderId = apiOrder?.orderNumber || mockOrder?.orderId || id;
  const displayDate = apiOrder
    ? new Date(apiOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (mockOrder?.date ?? '—');
  const displayEta = apiOrder?.shipment?.estimatedDelivery
    ? new Date(apiOrder.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : (mockOrder?.estimatedDelivery ?? '—');

  const clientName = apiOrder?.client ? `${apiOrder.client.user.firstName} ${apiOrder.client.user.lastName}` : (mockClient?.name ?? '—');
  const clientEmail = apiOrder?.client?.user?.email ?? mockClient?.email ?? '';
  const clientCompany = apiOrder?.client?.companyName ?? mockClient?.company ?? '—';
  const clientPhone = mockClient?.phone ?? '—';
  const clientGstin = mockClient?.gstin ?? '—';
  const clientTotalOrders = mockClient?.totalOrders ?? '—';

  // Items: prefer API data, fall back to mock items
  const displayItems = apiOrder?.items?.length
    ? apiOrder.items.map((item: any) => ({
        name: item.product?.name ?? item.notes ?? '—',
        qty: item.quantity,
        unitCny: parseFloat(item.unitPriceCNY || '0'),
        totalCny: parseFloat(item.unitPriceCNY || '0') * item.quantity,
        totalInr: parseFloat(item.totalINR || '0'),
        imageUrl: item.imageUrl ?? item.product?.imageUrl ?? null,
      }))
    : MOCK_ITEMS;

  const productCny = displayItems.reduce((s: number, i: any) => s + i.totalCny, 0);
  const logisticsCny = 680;
  const productInr = apiOrder ? parseFloat(apiOrder.subtotalINR || '0') : productCny * 12;
  const logisticsInr = apiOrder ? parseFloat(apiOrder.shippingCostINR || '0') : logisticsCny * 12;
  const advancePaid = 15000;
  const subTotal = productInr + logisticsInr - advancePaid;
  const gstAmt = Math.round(subTotal * gst / 100);
  const grand = subTotal + gstAmt;

  const stageIdx = stageMap[status] ?? -1;

  // Highest stage index that is marked complete — works for both cumulative and legacy
  // non-cumulative completedStages arrays (e.g. just ["Sourcing"]).
  // Falls back to stageIdx when no stages are persisted yet.
  const maxCompletedIdx = completedStages.length > 0
    ? Math.max(-1, ...completedStages.map(cs => stages.indexOf(cs)).filter(n => n >= 0))
    : stageIdx;

  const loc = statusToLocation[status] ?? { label: 'Pre-shipment', progress: 10 };
  const carrier = mockOrder ? carrierForOrder(mockOrder.orderId) : { carrier: '—', mode: '—', trackingNo: '—' };

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
    setNotes(prev => [{ id: `n${Date.now()}`, time: new Date().toLocaleString('en-IN'), actor: actorName, message: `Status changed: ${status} → ${s}`, icon: '🔄' }, ...prev]);

    if (apiOrder) {
      try {
        // Persist status to DB — backend auto-syncs completedStages in the same call
        await apiFetch(`/api/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: s }),
        });
        // Update local timeline state immediately (no extra API call needed)
        const autoStages = STATUS_TO_STAGES[s];
        if (autoStages !== undefined) {
          setCompletedStages(autoStages);
        }
      } catch {
        addToast({ type: 'error', title: 'Failed to save status to server' });
        return;
      }
      // Bust cache so client orders list picks up new status on next fetch
      ordersCache.clear();
    }

    addToast({ type: 'success', title: 'Status updated', description: `Order is now "${s}".` });
  }

  function addNote() {
    if (!note.trim()) return;
    setNotes(prev => [{ id: `n${Date.now()}`, time: new Date().toLocaleString('en-IN'), actor: actorName, message: note, icon: '📝' }, ...prev]);
    setNote('');
    addToast({ type: 'success', title: 'Note added' });
  }

  async function handleAddTrackingUpdate() {
    if (!trackingLocation.trim() || !trackingMessage.trim()) {
      addToast({ type: 'warning', title: 'Required fields missing', description: 'Please enter both location and status message.' });
      return;
    }
    if (!trackingStage) {
      addToast({ type: 'warning', title: 'Stage required', description: 'Please select the shipment stage.' });
      return;
    }
    if (!apiOrder?.id) {
      addToast({ type: 'warning', title: 'Demo order', description: 'Tracking updates can only be saved on live orders.' });
      return;
    }
    setTrackingSubmitting(true);
    const statusNote = `${trackingLocation.trim()} — ${trackingMessage.trim()}`;
    try {
      await addTrackingUpdate(apiOrder.id, { stage: trackingStage, statusNote });
      const updated = await getTrackingUpdates(apiOrder.id);
      setTrackingUpdates(updated);
      setTrackingLocation('');
      setTrackingMessage('');
      setTrackingStage('');
      setTrackingSuccess(true);
      setTimeout(() => setTrackingSuccess(false), 4000);
    } catch {
      addToast({ type: 'error', title: 'Failed to add update', description: 'Could not save the tracking update. Please try again.' });
    } finally {
      setTrackingSubmitting(false);
    }
  }

  function assignStaff() {
    const member = staffList.find(s => s.id === selectedStaffId);
    if (!member) return;
    const newAssignment: StaffAssignment = { staffId: member.id, staffName: member.name, staffRole: member.role, assignedAt: new Date().toISOString() };
    localStorage.setItem(`order-assignment-${id}`, JSON.stringify(newAssignment));
    setAssignment(newAssignment);
    addToast({ type: 'success', title: 'Staff assigned', description: `${member.name} assigned to this order.` });
  }

  async function handleAdminPhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    setAdminUploadLoading(true);
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
        await fetchWarehouseReport();
      } else {
        throw new Error(data?.message);
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to upload photos' });
    } finally {
      setAdminUploadLoading(false);
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

  function flagException() { saveStatus('Exception'); }
  function refund() {
    if (!perms.canSeeClientPayments) return;
    addToast({ type: 'info', title: 'Refund initiated', description: 'Refund processing.' });
  }
  function emailClient() { addToast({ type: 'info', title: 'Email composer opened', description: `To: ${clientEmail}` }); }
  function uploadDoc(d: string) { addToast({ type: 'success', title: `${d} uploaded`, description: 'Visible to client now.' }); }

  return (
    <AdminLayout>
      <Link href="/admin/all-orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Orders</Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-tabular font-700 text-lg">{displayOrderId}</span>
            <StatusBadge status={status as any} />
            {apiOrder?.deliveryPreference && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-600 bg-[#e4eeee] text-[#4a7a7b] border border-[#bcd9d9]"
                title={apiOrder.deliveryPreference !== 'self_pickup' && apiOrder.deliveryAddress ? apiOrder.deliveryAddress : undefined}
              >
                {apiOrder.deliveryPreference === 'self_pickup' ? '🏬 Self Pickup' : '🚚 Deliver to Address'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {displayDate} • ETA: {displayEta}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(role === 'admin' || (role === 'staff' && user?.staffRoleId === 'warehouse-qc')) &&
            mockOrder &&
            (mockOrder.status === 'Repacking Warehouse' ||
              ['Ready for Logistics', 'Return from China'].includes(
                getEffectiveOrderStatus(mockOrder.id, mockOrder.status as OrderStatus) as string
              )) && (
              <Link href={`/admin/warehouse/qc/${mockOrder.id}`} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Repacking Warehouse
              </Link>
            )}
          <select value={status} onChange={e => saveStatus(e.target.value)} className="input-field text-sm py-2 min-w-[180px]">{statusOptions.map(s => <option key={s}>{s}</option>)}</select>
          <button onClick={emailClient} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Client</button>
          <button onClick={flagException} className="px-3 py-2 text-xs font-600 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Mark Exception</button>
          {perms.canSeeClientPayments && (
            <button onClick={refund} className="btn-secondary px-3 py-2 text-xs">Process Refund</button>
          )}
          {(payments.some((p: any) => p.status === 'VERIFIED') || apiOrder?.status === 'CONFIRMED' || mockOrder?.status === 'Payment Confirmed') && (
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
                    client: apiOrder.client?.companyName ?? clientName,
                    lineItems: (apiOrder.items?.length
                      ? apiOrder.items.map((item: any) => ({
                          name: item.product?.name ?? item.notes ?? 'Item',
                          qty: Number(item.quantity ?? 1),
                          unitPriceInr: parseFloat(item.unitPriceINR || '0'),
                          totalInr: parseFloat(item.totalINR || '0'),
        imageUrl: item.imageUrl ?? item.product?.images?.[0] ?? null,
                        }))
                      : displayItems.map((item: any) => ({
                          name: item.name,
                          qty: item.qty,
                          unitPriceInr: item.qty > 0 ? Math.round(item.totalInr / item.qty) : 0,
                          totalInr: item.totalInr,
                          imageUrl: item.imageUrl ?? null,
                        }))),
                  } : {
                    orderId: mockOrder?.orderId,
                    date: mockOrder?.date,
                    client: clientName,
                    lineItems: displayItems.map((item: any) => ({
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
                        // Write to localStorage immediately so client picks it up in the same browser
                        try { localStorage.setItem(`gst-invoice-${id}`, JSON.stringify(gstData)); } catch {}
                        // Also persist to DB (best-effort)
                        fetch(`/api/orders/${id}/gst`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                          body: JSON.stringify(gstData),
                        }).catch(() => {});
                        setSavedGSTData(gstData);
                        setShowGSTPopover(false);

                        // Add message to order conversation so client sees it
                        try {
                          const chatKey = `order-chat-${id}`;
                          const existing = JSON.parse(localStorage.getItem(chatKey) || '[]');
                          const sysMsg = {
                            id: `gst-${Date.now()}`,
                            sender: 'admin',
                            text: 'Your GST Invoice has been generated and is ready to download. You can find it in the Documents section of this order.',
                            time: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                          };
                          localStorage.setItem(chatKey, JSON.stringify([...existing, sysMsg]));
                        } catch {}

                        // Push notification to client notification feed
                        try {
                          const clientNotifs = JSON.parse(localStorage.getItem('notifications-client') || '[]');
                          clientNotifs.unshift({
                            id: `gst-notif-${Date.now()}`,
                            title: 'GST Invoice Ready',
                            message: `Your GST Invoice for order ${displayOrderId} is ready to download.`,
                            link: `/client-dashboard/orders/${id}`,
                            time: 'Just now',
                            read: false,
                            type: 'order',
                            group: 'Today',
                          });
                          localStorage.setItem('notifications-client', JSON.stringify(clientNotifs));
                        } catch {}

                        addToast({ type: 'success', title: 'GST Invoice saved', description: 'Client has been notified.' });
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
              client:          apiOrder.client?.companyName ?? clientName,
              lineItems:       (apiOrder.items?.length
                ? apiOrder.items.map((item: any) => ({
                    name:         item.product?.name ?? item.notes ?? 'Item',
                    qty:          Number(item.quantity ?? 1),
                    unitPriceInr: parseFloat(item.unitPriceINR || '0'),
                    totalInr:     parseFloat(item.totalINR    || '0'),
                    imageUrl:     item.imageUrl ?? item.product?.images?.[0] ?? null,
                  }))
                : displayItems.map((item: any) => ({
                    name:         item.name,
                    qty:          item.qty,
                    unitPriceInr: item.qty > 0 ? Math.round(item.totalInr / item.qty) : 0,
                    totalInr:     item.totalInr,
                    imageUrl:     item.imageUrl ?? null,
                  }))
              ),
              requestPayments: (apiOrder as any).requestPayments ?? [],
            } : {
              orderId:         mockOrder?.orderId,
              date:            mockOrder?.date,
              client:          clientName,
              lineItems:       displayItems.map((item: any) => ({
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
          <button onClick={markWarehouseReadByAdmin} className="text-xs text-amber-700 font-600 underline hover:no-underline flex-shrink-0">Dismiss</button>
        </div>
      )}

      {status === 'Exception' && (
        <div className="mb-5">
          <ExceptionChat orderId={id} isAdmin={true} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Client Information */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Client Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Name</p><p className="font-500">{clientName}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500">{clientEmail}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-500 font-tabular">{clientPhone}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-500">{clientCompany}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">GSTIN</p><p className="font-500 font-tabular">{clientGstin}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Total Orders</p><p className="font-500">{clientTotalOrders}</p></div>
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
                {displayItems.map((it: any) => (
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
                    {perms.canSeeSupplierCostsInOrders && (
                      <>
                        <td className="text-right font-tabular">¥{it.unitCny}</td>
                        <td className="text-right font-tabular">¥{Math.round(it.totalCny).toLocaleString()}</td>
                        <td className="text-right font-tabular font-600">₹{Math.round(it.totalInr).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Replacement & Issue Dispute Status cards (right under timeline) */}
          {orderDisputes.filter((d: any) => d.type === 'REPLACEMENT' || d.type === 'ISSUE').map((dispute: any) => {
            const st = dispute.status;
            const isResolved = st === 'RESOLVED';
            const isRejected = st === 'REJECTED';
            const isUnderReview = st === 'UNDER_REVIEW';
            const isReplacement = dispute.type === 'REPLACEMENT';
            const label = isReplacement ? 'Replacement' : 'Issue';
            const cName = apiOrder?.client ? `${apiOrder.client.user.firstName} ${apiOrder.client.user.lastName}` : '—';
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
                    : <RefreshCw className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`text-sm font-700 ${isResolved ? 'text-emerald-800' : isRejected ? 'text-red-800' : 'text-amber-800'}`}>
                      {label} {isResolved ? 'Approved' : isRejected ? 'Rejected' : isUnderReview ? 'Under Review' : 'Requested'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isResolved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-amber-700'}`}>
                      {isResolved
                        ? `${cName}'s ${label.toLowerCase()} request has been approved.`
                        : isRejected
                        ? `${cName}'s ${label.toLowerCase()} request was rejected.${dispute.adminNote ? ` Note: ${dispute.adminNote}` : ''}`
                        : isUnderReview
                        ? `${cName}'s ${label.toLowerCase()} request is under review.`
                        : `${cName}'s ${label.toLowerCase()} request is pending review.`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Submitted: {new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} •{' '}
                      <Link href="/admin/disputes" className="underline hover:no-underline">View in Disputes</Link>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-6">
            <ShipmentTimeline
              orderId={id}
              isAdminOrStaff={true}
              orderStatus={status}
              onStatusChange={(newStatus) => {
                setStatus(newStatus);
                // Also update completedStages to keep the order consistent
                const autoStages = STATUS_TO_STAGES[newStatus];
                if (autoStages) setCompletedStages(autoStages);
                addToast({ type: 'success', title: 'Status updated', description: `Order is now "${newStatus}".` });
              }}
            />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Documents</h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between py-2 border-b border-border text-sm">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Commercial Invoice</span>
                <div className="flex gap-1">
                  <button onClick={() => uploadDoc('Commercial Invoice')} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                  <button onClick={() => generateCommercialInvoice(apiOrder ?? mockOrder)} className="text-[#4A3B52] text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                </div>
              </li>
              <li className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Packing List</span>
                <div className="flex gap-1">
                  <button onClick={() => uploadDoc('Packing List')} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                  <button onClick={() => generatePackingList(apiOrder ?? mockOrder)} className="text-[#4A3B52] text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                </div>
              </li>
            </ul>
          </div>

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
          {perms.canSeeClientPayments && (
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Cost</span><span className="font-tabular font-500">₹{Math.round(productInr).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-emerald-600 font-500">Advance Paid</span><span className="font-tabular font-500 text-emerald-600">− ₹{advancePaid.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Logistics</span><span className="font-tabular font-500">₹{Math.round(logisticsInr).toLocaleString()}</span></div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-2"><span className="text-muted-foreground inline-flex items-center gap-1">GST <select value={gst} onChange={e => setGst(+e.target.value)} className="input-field text-[10px] py-0.5 px-1">{gstRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></span><span className="font-tabular font-500">₹{gstAmt.toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 mt-1 flex items-center justify-between"><span className="font-700">Grand Total</span><span className="font-700 font-tabular text-foreground">₹{grand.toLocaleString()}</span></div>
            </div>
          </div>
          )}

          {/* Payment Verification — only for live API orders */}
          {apiOrder && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#4A3B52]" /> Payment Verification
              </h3>

              {paymentsLoadError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-red-700">Failed to load payments.</p>
                  <button
                    onClick={() => refreshPayments(id)}
                    className="text-xs font-600 text-red-700 underline hover:no-underline flex-shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!paymentsLoadError && payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payment submissions yet.</p>
              )}

              {payments.map((p: any) => {
                const amount = parseFloat(p.amountINR || '0').toLocaleString('en-IN');
                const typeLabel = p.type === 'ADVANCE' ? 'ADVANCE' : 'BALANCE';
                const dateStr = p.submittedAt
                  ? new Date(p.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '';
                const verifiedBy = p.verifiedBy
                  ? `${p.verifiedBy.firstName} ${p.verifiedBy.lastName}`
                  : '';

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
                          onClick={() => handleViewProof(p)}
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
                        <p className="text-sm font-600 text-emerald-800">✅ {typeLabel} — ₹{amount} — Verified{p.proofImageBase64 && (<button onClick={() => handleViewProof(p)} className="text-xs text-blue-600 underline ml-2">View Proof</button>)}</p>
                        {verifiedBy && (
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Verified by: {verifiedBy}{p.verifiedAt ? ` on ${new Date(p.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {p.proofImageBase64 && (
                      <button
                        onClick={() => handleViewProof(p)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-colors text-emerald-800"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Proof
                      </button>
                    )}
                  </div>
                );

                if (p.status === 'REJECTED') return (
                  <div key={p.id} className="rounded-xl border border-red-200 bg-red-50 p-3 mb-3">
                    <p className="text-sm font-600 text-red-800">❌ {typeLabel} — ₹{amount} — Rejected{p.proofImageBase64 && (<button onClick={() => handleViewProof(p)} className="text-xs text-blue-600 underline ml-2">View Proof</button>)}</p>
                    {p.rejectionReason && <p className="text-xs text-red-700 mt-1">Reason: {p.rejectionReason}</p>}
                    {p.proofImageBase64 && (
                      <button
                        onClick={() => handleViewProof(p)}
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
                  <button
                    onClick={() => setRejectModalId(null)}
                    className="btn-secondary flex-1 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
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

          {logisticsEstimate && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Logistics Details</h3>
              <div className="space-y-2 text-sm">
                {logisticsEstimate.weight && <div className="flex justify-between"><span className="text-muted-foreground">Approx Weight</span><span className="font-500">{logisticsEstimate.weight}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping Mode</span><span className="font-500">{logisticsEstimate.mode}</span></div>
                {logisticsEstimate.pricePerKg && <div className="flex justify-between"><span className="text-muted-foreground">Price per KG</span><span className="font-tabular font-500">¥{logisticsEstimate.pricePerKg}</span></div>}
                {logisticsEstimate.note && <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border">{logisticsEstimate.note}</p>}
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-1 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Assign Staff</h3>
            {assignment && (
              <div className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="font-600">{assignment.staffName}</p>
                <p className="text-xs text-muted-foreground">{STAFF_ROLE_LABELS[assignment.staffRole as keyof typeof STAFF_ROLE_LABELS] ?? assignment.staffRole}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Assigned {new Date(assignment.assignedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
            <select className="input-field text-sm mb-2" value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}>
              <option value="">— Select staff member —</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({STAFF_ROLE_LABELS[s.role]})</option>)}
            </select>
            <button onClick={assignStaff} disabled={!selectedStaffId} className="btn-primary w-full py-2 text-sm disabled:opacity-50">{assignment ? 'Reassign' : 'Assign'}</button>
          </div>

          {/* Client-Facing Staff Contact */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-1 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#c17b5c]" /> Client Contact Staff
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              Choose which staff member the client can see and contact for this order. Admin is always shown.
            </p>
            <select
              className="input-field text-sm mb-2"
              value={assignedStaffContactId}
              onChange={e => setAssignedStaffContactId(e.target.value)}
              disabled={staffUsersLoading}
            >
              <option value="">
                {staffUsersLoading ? 'Loading staff…' : '— None (admin only) —'}
              </option>
              {staffUsers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}{s.staffRole ? ` (${s.staffRole})` : ''}
                </option>
              ))}
            </select>
            <button
              disabled={staffContactSaving}
              onClick={async () => {
                setStaffContactSaving(true);
                try {
                  const res = await apiFetch(`/api/orders/${id}/staff-contact`, {
                    method: 'PATCH',
                    body: JSON.stringify({ staffUserId: assignedStaffContactId || null }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    addToast({ type: 'success', title: 'Staff contact saved', description: 'Client will now see this staff member.' });
                  } else {
                    addToast({ type: 'error', title: 'Failed to save' });
                  }
                } catch {
                  addToast({ type: 'error', title: 'Failed to save' });
                } finally {
                  setStaffContactSaving(false);
                }
              }}
              className="btn-primary w-full py-2 text-sm disabled:opacity-50"
            >
              {staffContactSaving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{apiOrder?.shipment?.carrier ?? carrier.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{carrier.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tracking #</span><span className="font-tabular font-500">{apiOrder?.shipment?.trackingNumber ?? carrier.trackingNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular font-500">{displayEta}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-500">{loc.label}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Records */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mt-5">
        <h3 className="font-700 mb-1">Supplier Records</h3>
        <p className="text-xs text-muted-foreground mb-4">Track which suppliers were used for this order</p>
        <div className="space-y-4">
          {displayItems.map((item: any) => {
            const supplier = supplierData[item.name];
            const isFormOpen = supplierForm === item.name;
            return (
              <div key={item.name} className="border border-border rounded-lg p-4">
                <h4 className="font-600 text-sm mb-3">{item.name}</h4>
                {isFormOpen ? (
                  <div className="space-y-3">
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">Supplier Name *</label><input className="input-field w-full mt-1" value={formData.supplierName} onChange={e => setFormData(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Shenzhen Electronics Co." /></div>
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">Platform</label><select className="input-field w-full mt-1" value={formData.platform} onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))}>{['1688', 'Alibaba', 'AliExpress', 'WeChat', 'Direct Factory', 'Other'].map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">Product URL (optional)</label><input className="input-field w-full mt-1" value={formData.productUrl} onChange={e => setFormData(f => ({ ...f, productUrl: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">WeChat / Phone (optional)</label><input className="input-field w-full mt-1" value={formData.contact} onChange={e => setFormData(f => ({ ...f, contact: e.target.value }))} placeholder="+86..." /></div>
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">Price Negotiated in ¥ CNY (optional)</label><input className="input-field w-full mt-1" type="number" value={formData.priceCny} onChange={e => setFormData(f => ({ ...f, priceCny: e.target.value }))} placeholder="0.00" /></div>
                    <div><label className="text-[10px] uppercase text-muted-foreground font-600">Notes (optional)</label><textarea className="input-field w-full mt-1" rows={2} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." /></div>
                    <div className="flex gap-2"><button onClick={() => saveSupplier(item.name)} className="btn-primary px-4 py-1.5 text-sm">Save</button><button onClick={() => setSupplierForm(null)} className="btn-secondary px-4 py-1.5 text-sm">Cancel</button></div>
                  </div>
                ) : supplier ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="font-700">{supplier.supplierName}</p>
                    <span className="inline-block bg-[#4A3B52]/10 text-[#4A3B52] text-[11px] font-600 px-2 py-0.5 rounded-full">{supplier.platform}</span>
                    {supplier.productUrl && <p><a href={supplier.productUrl} target="_blank" rel="noopener noreferrer" className="text-[#4A3B52] hover:underline inline-flex items-center gap-1">🔗 {supplier.productUrl}</a></p>}
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${msg.sender === 'admin' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}>{msg.sender === 'admin' ? 'AS' : 'RK'}</div>
              <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${msg.sender === 'admin' ? 'bg-muted/50' : 'bg-[#f0eef8]'}`}>
                <p>{msg.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }} className="input-field flex-1 min-w-0" placeholder="Reply to client..." />
          <button onClick={sendChatMessage} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0"><MessageSquare className="w-3.5 h-3.5" /> Send</button>
        </div>
      </div>

      {/* Warehouse Reports */}
      {(maxCompletedIdx >= 5 || apiWarehouseReport !== null) && (
        <div className="mt-5 space-y-5" onMouseEnter={warehouseHasNewUpdate ? markWarehouseReadByAdmin : undefined}>
          <div className="flex items-center gap-3 border-t border-border pt-5">
            <h3 className="font-700 text-foreground text-lg">Warehouse Reports</h3>
            {warehouseHasNewUpdate && (
              <span className="text-[11px] font-700 px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">New Update</span>
            )}
          </div>

          {/* Items report */}
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

              {/* Client approval status */}
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

          {/* Repacking details — weight / dimensions / notes only */}
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

          {/* Outbound */}
          {apiWarehouseReport?.sentToChina && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Outbound Shipment to China Warehouse</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Tracking ID</span><span className="font-tabular font-600">{apiWarehouseReport.outboundTrackingId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sent At</span><span className="font-500">{new Date(apiWarehouseReport.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
              </div>
            </div>
          )}

          {/* Delivery preference */}
          {apiOrder?.deliveryPreference && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3">Delivery Preference</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preference</span>
                  <span className="font-600 capitalize">{apiOrder.deliveryPreference === 'self_pickup' ? 'Self Pickup' : 'Deliver to Address'}</span>
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

          {/* Reply to warehouse */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h4 className="font-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Reply to Warehouse Staff</h4>
            {warehouseReplies.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {warehouseReplies.map((reply: any, i: number) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-600 text-sm">Admin / Staff</span>
                      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">Team</span>
                    </div>
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
            {!proofImageError ? (
              <img
                src={proofModalUrl}
                alt="Payment Proof"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                onError={() => setProofImageError(true)}
              />
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-sm">
                <p className="text-sm font-600 text-red-800 mb-2">⚠️ Image could not be displayed</p>
                <p className="text-xs text-red-700 leading-relaxed mb-2">The stored payment proof appears to be incomplete (data was truncated when it was uploaded).</p>
                <p className="text-xs text-red-700 font-500">Ask the client to resubmit their payment proof — new uploads will be stored correctly.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}
