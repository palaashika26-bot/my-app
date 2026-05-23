'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  Upload,
  Truck,
  Camera,
  MessageSquare,
} from 'lucide-react';

interface DemoOrder {
  orderId: string;
  clientName: string;
  items: string[];
  stage: string;
  assignedAt: string;
  packagingListUploaded: boolean;
  reportSubmitted: boolean;
}

const DEMO_ORDERS: DemoOrder[] = [
  {
    orderId: 'BK-ORD-2024-0274',
    clientName: 'Sunita Verma',
    items: ['LED Strip Light (RGB, 5m) x50', 'USB-C Cable (Braided) x100'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-18',
    packagingListUploaded: true,
    reportSubmitted: false,
  },
  {
    orderId: 'BK-ORD-2024-0268',
    clientName: 'Amit Patel',
    items: ['Wireless Earbuds x25', 'Phone Case x200'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-17',
    packagingListUploaded: true,
    reportSubmitted: true,
  },
  {
    orderId: 'BK-ORD-2024-0261',
    clientName: 'Rajesh Kumar',
    items: ['Steel Bottles x100'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-16',
    packagingListUploaded: false,
    reportSubmitted: false,
  },
];

interface PackagingItem {
  item: string;
  qty: number;
  image: string | null;
  adminNote: string;
}

const DEMO_PACKAGING: PackagingItem[] = [
  { item: 'LED Strip Light RGB 5m', qty: 50, image: null, adminNote: 'Handle with care' },
  { item: 'USB-C Cable Braided', qty: 100, image: null, adminNote: '' },
  { item: 'Remote Control', qty: 50, image: null, adminNote: 'Check all included' },
];

interface ItemReport {
  name: string;
  expectedQty: number;
  status: 'ok' | 'issue';
  issue: string;
  receivedQty: string;
  photo: string | null;
}

interface RepackDetails {
  weight: string;
  cbm: string;
  notes: string;
  photos: string[];
}

interface OutboundShipment {
  trackingId: string;
  finalPackingList: string | null;
  deliverySlip: string | null;
}

interface Reply {
  id: string;
  sender: string;
  role: string;
  message: string;
  time: string;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function WarehouseOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const { addToast } = useToast();

  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [packagingList, setPackagingList] = useState<PackagingItem[]>([]);
  const [itemReports, setItemReports] = useState<ItemReport[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [repack, setRepack] = useState<RepackDetails>({
    weight: '',
    cbm: '',
    notes: '',
    photos: [],
  });
  const [repackSaved, setRepackSaved] = useState(false);
  const [outbound, setOutbound] = useState<OutboundShipment>({
    trackingId: '',
    finalPackingList: null,
    deliverySlip: null,
  });
  const [outboundSent, setOutboundSent] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);

  useEffect(() => {
    // Seed demo orders if not present
    const stored = localStorage.getItem('warehouse-demo-orders');
    if (!stored) {
      localStorage.setItem('warehouse-demo-orders', JSON.stringify(DEMO_ORDERS));
    }
    const orders: DemoOrder[] = stored ? JSON.parse(stored) : DEMO_ORDERS;
    const found = orders.find((o) => o.orderId === orderId);
    if (found) {
      setOrder(found);
    } else {
      setNotFound(true);
      return;
    }

    // Load packaging list (admin-uploaded or demo fallback)
    let pkgList = DEMO_PACKAGING;
    try {
      const pkgStored = localStorage.getItem(`admin-packaging-list-${orderId}`);
      if (pkgStored) pkgList = JSON.parse(pkgStored);
    } catch {}
    setPackagingList(pkgList);

    // Load existing report or initialise from packaging list
    try {
      const reportStored = localStorage.getItem(`warehouse-report-${orderId}`);
      if (reportStored) {
        const parsed = JSON.parse(reportStored);
        const items: ItemReport[] = parsed.items ?? parsed;
        setItemReports(items);
        setReportSubmitted(true);
      } else {
        setItemReports(
          pkgList.map((pkg) => ({
            name: pkg.item,
            expectedQty: pkg.qty,
            status: 'ok' as const,
            issue: '',
            receivedQty: String(pkg.qty),
            photo: null,
          }))
        );
      }
    } catch {
      setItemReports(
        pkgList.map((pkg) => ({
          name: pkg.item,
          expectedQty: pkg.qty,
          status: 'ok' as const,
          issue: '',
          receivedQty: String(pkg.qty),
          photo: null,
        }))
      );
    }

    // Load repacking details
    try {
      const repackStored = localStorage.getItem(`warehouse-repack-${orderId}`);
      if (repackStored) {
        setRepack(JSON.parse(repackStored));
        setRepackSaved(true);
      }
    } catch {}

    // Load outbound
    try {
      const outboundStored = localStorage.getItem(`warehouse-outbound-${orderId}`);
      if (outboundStored) {
        setOutbound(JSON.parse(outboundStored));
        setOutboundSent(true);
      }
    } catch {}

    // Load replies
    try {
      const repliesStored = localStorage.getItem(`warehouse-replies-${orderId}`);
      if (repliesStored) setReplies(JSON.parse(repliesStored));
    } catch {}
  }, [orderId]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          href="/staff/warehouse/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">Order not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This order is not in your assigned list.
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  function updateItemReport(idx: number, patch: Partial<ItemReport>) {
    setItemReports((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleIssuePhoto(idx: number, files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataUrl(files[0]);
    updateItemReport(idx, { photo: url });
    try {
      localStorage.setItem(`warehouse-issue-photo-${orderId}-${idx}`, url);
    } catch {}
  }

  function submitReport() {
    const reportData = {
      orderId,
      staffId: user?.staffId,
      staffName: user?.name,
      submittedAt: new Date().toISOString(),
      items: itemReports.map((r) => ({
        name: r.name,
        status: r.status,
        issue: r.issue,
        receivedQty: r.receivedQty,
      })),
      hasIssues: itemReports.some((r) => r.status === 'issue'),
    };

    try {
      localStorage.setItem(`warehouse-report-${orderId}`, JSON.stringify(reportData));

      // Update reportSubmitted flag in demo-orders
      const stored = localStorage.getItem('warehouse-demo-orders');
      if (stored) {
        const orders: DemoOrder[] = JSON.parse(stored);
        const updated = orders.map((o) =>
          o.orderId === orderId ? { ...o, reportSubmitted: true } : o
        );
        localStorage.setItem('warehouse-demo-orders', JSON.stringify(updated));
      }

      // Notify admin
      const adminNotifs = JSON.parse(localStorage.getItem('notifications-admin') ?? '[]');
      adminNotifs.unshift({
        id: `wh-report-${Date.now()}`,
        title: 'Warehouse Report Submitted',
        description: `Warehouse report submitted for ${orderId}`,
        time: 'Just now',
        read: false,
        type: 'alert',
        href: `/admin/orders/${orderId}`,
      });
      localStorage.setItem('notifications-admin', JSON.stringify(adminNotifs));

      // Notify sourcing staff
      const sourcingNotifs = JSON.parse(localStorage.getItem('notifications-sourcing') ?? '[]');
      sourcingNotifs.unshift({
        id: `wh-report-s-${Date.now()}`,
        title: 'Warehouse Report Submitted',
        description: `Warehouse report submitted for ${orderId}`,
        time: 'Just now',
        read: false,
        type: 'alert',
        href: `/admin/orders/${orderId}`,
      });
      localStorage.setItem('notifications-sourcing', JSON.stringify(sourcingNotifs));
    } catch {}

    setReportSubmitted(true);
    addToast({
      type: 'success',
      title: 'Report submitted',
      description: 'Admin and sourcing staff have been notified.',
    });
  }

  async function handleRepackPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 10 - repack.photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const urls = await Promise.all(toProcess.map(readFileAsDataUrl));
    setRepack((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
  }

  function saveRepackDetails() {
    try {
      localStorage.setItem(`warehouse-repack-${orderId}`, JSON.stringify(repack));
      localStorage.setItem(
        `warehouse-repack-photos-${orderId}`,
        JSON.stringify(repack.photos)
      );
    } catch {}
    setRepackSaved(true);
    addToast({ type: 'success', title: 'Repacking details saved' });
  }

  async function handleFinalPackingList(files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataUrl(files[0]);
    setOutbound((prev) => ({ ...prev, finalPackingList: url }));
    try {
      localStorage.setItem(`warehouse-final-packinglist-${orderId}`, url);
    } catch {}
  }

  async function handleDeliverySlip(files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataUrl(files[0]);
    setOutbound((prev) => ({ ...prev, deliverySlip: url }));
    try {
      localStorage.setItem(`warehouse-delivery-slip-${orderId}`, url);
    } catch {}
  }

  function markSentToChina() {
    if (!outbound.trackingId.trim()) {
      addToast({
        type: 'error',
        title: 'Tracking ID required',
        description: 'Enter the outbound tracking number first.',
      });
      return;
    }

    try {
      const payload = {
        ...outbound,
        sentAt: new Date().toISOString(),
        staffId: user?.staffId,
      };
      localStorage.setItem(`warehouse-outbound-${orderId}`, JSON.stringify(payload));

      const msg = `Order ${orderId} sent to China Warehouse. Tracking: ${outbound.trackingId}`;

      const adminNotifs = JSON.parse(localStorage.getItem('notifications-admin') ?? '[]');
      adminNotifs.unshift({
        id: `wh-sent-${Date.now()}`,
        title: 'Sent to China Warehouse',
        description: msg,
        time: 'Just now',
        read: false,
        type: 'order',
        href: `/admin/orders/${orderId}`,
      });
      localStorage.setItem('notifications-admin', JSON.stringify(adminNotifs));

      const sourcingNotifs = JSON.parse(localStorage.getItem('notifications-sourcing') ?? '[]');
      sourcingNotifs.unshift({
        id: `wh-sent-s-${Date.now()}`,
        title: 'Sent to China Warehouse',
        description: msg,
        time: 'Just now',
        read: false,
        type: 'order',
        href: `/admin/orders/${orderId}`,
      });
      localStorage.setItem('notifications-sourcing', JSON.stringify(sourcingNotifs));
    } catch {}

    setOutboundSent(true);
    addToast({
      type: 'success',
      title: 'Order marked as sent',
      description: `Tracking ID: ${outbound.trackingId}`,
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <Link
        href="/staff/warehouse/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="font-tabular font-700 text-lg">{order.orderId}</span>
          <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
            {order.stage}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Client: <span className="font-600 text-foreground">{order.clientName}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Assigned:{' '}
          {new Date(order.assignedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Section 1 — Packaging List (Read Only) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Packaging List from Admin</h2>
          <span className="ml-auto text-[10px] font-600 uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">
            Read Only
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Review items carefully before repacking
        </p>
        <div className="space-y-3">
          {packagingList.map((pkg) => (
            <div key={pkg.item} className="rounded-lg border border-border p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {pkg.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pkg.image}
                    alt={pkg.item}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-600 text-sm">{pkg.item}</p>
                <p className="text-xs text-muted-foreground">
                  Expected Qty:{' '}
                  <span className="font-tabular font-700 text-foreground">{pkg.qty}</span>
                </p>
                {pkg.adminNote && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">{pkg.adminNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — Missing Items Report */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="font-700">Report Missing or Damaged Items</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Mark each item as OK or report an issue.
        </p>

        {reportSubmitted && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-600 text-emerald-700">Report submitted successfully</span>
          </div>
        )}

        <div className="space-y-4">
          {itemReports.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="border border-border rounded-lg p-4">
              <p className="font-600 text-sm mb-3">
                {item.name} — Expected Qty:{' '}
                <span className="font-tabular">{item.expectedQty}</span>
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() =>
                    updateItemReport(idx, { status: 'ok', issue: '', photo: null })
                  }
                  disabled={reportSubmitted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-600 border transition-colors ${
                    item.status === 'ok'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> All OK
                </button>
                <button
                  type="button"
                  onClick={() => updateItemReport(idx, { status: 'issue' })}
                  disabled={reportSubmitted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-600 border transition-colors ${
                    item.status === 'issue'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Issue Found
                </button>
              </div>

              {item.status === 'issue' && (
                <div className="space-y-2 pl-1 mb-3">
                  <textarea
                    className="input-field w-full text-sm"
                    rows={2}
                    placeholder="Describe the issue..."
                    value={item.issue}
                    onChange={(e) => updateItemReport(idx, { issue: e.target.value })}
                    disabled={reportSubmitted}
                  />
                  {!reportSubmitted && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload issue photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleIssuePhoto(idx, e.target.files)}
                      />
                    </label>
                  )}
                  {item.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo}
                      alt="Issue"
                      className="w-24 h-24 object-cover rounded-lg border border-border"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-600 text-muted-foreground block mb-1">
                  Received Quantity
                </label>
                <input
                  type="number"
                  className="input-field w-32"
                  value={item.receivedQty}
                  onChange={(e) => updateItemReport(idx, { receivedQty: e.target.value })}
                  disabled={reportSubmitted}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        {!reportSubmitted && (
          <button
            onClick={submitReport}
            className="mt-4 px-4 py-2 text-sm rounded-lg text-white font-600 transition-colors"
            style={{ backgroundColor: '#c17b5c' }}
          >
            Submit Report
          </button>
        )}
      </div>

      {/* Section 3 — Repacking Details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Repacking Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">
              Upload photos of repacked items
            </label>
            {!repackSaved && repack.photos.length < 10 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>
                  Click to upload photos (up to {10 - repack.photos.length} more allowed)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleRepackPhotos(e.target.files)}
                />
              </label>
            )}
            {repack.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {repack.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Repack ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">
                Final Weight (KG)
              </label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 42.5"
                value={repack.weight}
                onChange={(e) => setRepack((prev) => ({ ...prev, weight: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">
                Final Volume (CBM)
              </label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 0.38"
                value={repack.cbm}
                onChange={(e) => setRepack((prev) => ({ ...prev, cbm: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">
              Notes / Observations
            </label>
            <textarea
              className="input-field w-full"
              rows={3}
              placeholder="Any notes about repacking condition..."
              value={repack.notes}
              onChange={(e) => setRepack((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={repackSaved}
            />
          </div>
        </div>
        {repackSaved ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 font-600">
            <CheckCircle className="w-4 h-4" /> Saved ✓
          </div>
        ) : (
          <button onClick={saveRepackDetails} className="btn-primary mt-4 px-4 py-2 text-sm">
            Save Repacking Details
          </button>
        )}
      </div>

      {/* Section 4 — Outbound Shipment */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Send to Final China Warehouse</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Complete after repacking is done</p>

        {outboundSent ? (
          <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-600 text-emerald-700">
                Order marked as sent. Admin and sourcing staff have been notified.
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Tracking: {outbound.trackingId}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">
                Outbound Tracking ID *
              </label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="e.g. SF1234567890CN"
                value={outbound.trackingId}
                onChange={(e) =>
                  setOutbound((prev) => ({ ...prev, trackingId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">
                Upload final packaging list
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>
                  {outbound.finalPackingList
                    ? 'File uploaded — click to replace'
                    : 'Upload packing list (PDF / image)'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFinalPackingList(e.target.files)}
                />
              </label>
              {outbound.finalPackingList && (
                <p className="text-xs text-emerald-700 font-600 mt-1">File uploaded</p>
              )}
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">
                Upload delivery slip / receipt photo
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>
                  {outbound.deliverySlip
                    ? 'Photo uploaded — click to replace'
                    : 'Upload delivery slip photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleDeliverySlip(e.target.files)}
                />
              </label>
              {outbound.deliverySlip && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={outbound.deliverySlip}
                  alt="Delivery slip"
                  className="w-32 h-32 object-cover rounded-lg border border-border mt-2"
                />
              )}
            </div>
            <button
              onClick={markSentToChina}
              className="px-4 py-2 text-sm rounded-lg text-white font-600 inline-flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#c17b5c' }}
            >
              <Truck className="w-4 h-4" /> Mark as Sent to China Warehouse
            </button>
          </div>
        )}
      </div>

      {/* Section 5 — Admin / Staff Replies */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Updates from Admin & Staff</h2>
        </div>
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet from admin.</p>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-600 text-sm">{reply.sender}</span>
                  <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
                    {reply.role}
                  </span>
                </div>
                <p className="text-sm text-foreground">{reply.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{reply.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
