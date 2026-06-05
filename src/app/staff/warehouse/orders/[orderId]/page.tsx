'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
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

interface ItemReport {
  name: string;
  expectedQty: number;
  status: 'ok' | 'issue';
  issue: string;
  receivedQty: string;
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
  message: string;
  sentAt: string;
  sentBy: string;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
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

  const [order, setOrder] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderNotFound, setOrderNotFound] = useState(false);

  const [warehouseReport, setWarehouseReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const [itemReports, setItemReports] = useState<ItemReport[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const [repack, setRepack] = useState<RepackDetails>({ weight: '', cbm: '', notes: '', photos: [] });
  const [repackSaved, setRepackSaved] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Upload & Notify state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [warehouseNote, setWarehouseNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadLightboxUrl, setUploadLightboxUrl] = useState<string | null>(null);

  const [outbound, setOutbound] = useState<OutboundShipment>({ trackingId: '', finalPackingList: null, deliverySlip: null });
  const [outboundSent, setOutboundSent] = useState(false);

  const [replies, setReplies] = useState<Reply[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOrder() {
    try {
      const res = await apiFetch(`/api/orders/${orderId}`);
      const json = await res.json();
      const data = json.data ?? json;
      if (data && (data.id || data.orderNumber)) {
        setOrder(data);
        setOrderNotFound(false);
      } else {
        setOrderNotFound(true);
      }
    } catch {
      setOrderNotFound(true);
    } finally {
      setOrderLoading(false);
    }
  }

  // Full fetch — downloads photos too. Called ONCE on mount.
  async function fetchWarehouseReport() {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-report`);
      const data = await res.json();
      if (data?.success && data?.data) {
        const report = data.data;
        setWarehouseReport(report);

        if (report.reportSubmitted) {
          setReportSubmitted(true);
          if (report.itemReports) {
            setItemReports(report.itemReports as ItemReport[]);
          }
        }

        if (report.repackPhotos?.length > 0) {
          setUploadedPhotos(report.repackPhotos as string[]);
        }
        if (report.warehouseNote) {
          setWarehouseNote(report.warehouseNote as string);
        }

        if (report.repackSaved) {
          setRepackSaved(true);
          setRepack({
            weight: String(report.finalWeightKg ?? ''),
            cbm: String(report.finalVolumeCbm ?? ''),
            notes: report.repackNotes ?? '',
            photos: [],
          });
        }

        if (report.sentToChina) {
          setOutboundSent(true);
          setOutbound(prev => ({ ...prev, trackingId: report.outboundTrackingId ?? '' }));
        }

        setReplies(report.adminReplies ?? []);
      }
    } catch {
      // silent — report might not exist yet
    } finally {
      setReportLoading(false);
    }
  }

  // Lightweight poll — only fetches replies + metadata, never re-downloads photo blobs
  function pollWarehouseReport() {
    apiFetch(`/api/orders/${orderId}/warehouse-report?photos=false`)
      .then(r => r.json())
      .then(data => {
        if (data?.success && data?.data) {
          setReplies(data.data.adminReplies ?? []);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchOrder();
    fetchWarehouseReport();

    // Poll replies every 30 s — lightweight, no photos
    pollRef.current = setInterval(pollWarehouseReport, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId]);

  // Initialise item reports from order items once order loads and report is not yet submitted
  useEffect(() => {
    if (!order || reportSubmitted || itemReports.length > 0) return;
    const items: ItemReport[] = (order.items ?? []).map((item: any) => ({
      name: item.product?.name ?? item.notes ?? 'Item',
      expectedQty: item.quantity,
      status: 'ok' as const,
      issue: '',
      receivedQty: String(item.quantity),
    }));
    if (items.length > 0) setItemReports(items);
  }, [order, reportSubmitted, itemReports.length]);

  if (orderLoading || reportLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4 pb-10">
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="h-6 bg-muted rounded w-44 mb-2" />
          <div className="h-4 bg-muted rounded w-56" />
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="h-4 bg-muted rounded w-24 mb-4" />
          {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded mb-2" />)}
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="h-4 bg-muted rounded w-32 mb-4" />
          {[1,2].map(i => <div key={i} className="h-6 bg-muted rounded mb-2" />)}
        </div>
      </div>
    );
  }

  if (orderNotFound || !order) {
    return (
      <div className="space-y-4">
        <Link href="/staff/warehouse/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">Order not found</p>
          <p className="text-sm text-muted-foreground mt-1">This order could not be loaded.</p>
        </div>
      </div>
    );
  }

  const orderDisplayId = order.orderNumber ?? orderId;
  const clientName = order.client
    ? `${order.client.user.firstName} ${order.client.user.lastName}`
    : '—';

  function updateItemReport(idx: number, patch: Partial<ItemReport>) {
    setItemReports(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submitReport() {
    const itemReportPayload = itemReports.map(r => ({
      itemName: r.name,
      status: r.status === 'ok' ? 'ok' : 'issue',
      receivedQty: Number(r.receivedQty),
      notes: r.issue || undefined,
    }));

    try {
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-report`, {
        method: 'PATCH',
        body: JSON.stringify({ itemReports: itemReportPayload, reportSubmitted: true }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message ?? 'Failed');
      setReportSubmitted(true);

      await apiFetch(`/api/orders/${orderId}/warehouse-reply`, {
        method: 'POST',
        body: JSON.stringify({ message: 'Warehouse has submitted the items inspection report.' }),
      }).catch(() => {});

      addToast({ type: 'success', title: 'Update sent to admin & staff successfully' });
    } catch {
      addToast({ type: 'error', title: 'Failed to submit report' });
    }
  }

  async function deleteUploadedPhoto(index: number) {
    if (!confirm('Remove this photo? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-photos`, {
        method: 'DELETE',
        body: JSON.stringify({ photoIndex: index }),
      });
      const data = await res.json();
      if (data?.success) {
        setUploadedPhotos(data.data?.photoUrls ?? uploadedPhotos.filter((_, i) => i !== index));
        addToast({ type: 'success', title: 'Photo removed' });
      } else {
        throw new Error(data?.message ?? 'Delete failed');
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to remove photo' });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const combined = [...selectedFiles, ...files].slice(0, 30);
    setSelectedFiles(combined);
    combined.forEach((file, idx) => {
      if (previews[idx]) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews(prev => {
          const updated = [...prev];
          updated[idx] = ev.target?.result as string;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleDeletePhoto(index: number) {
    if (!confirm('Remove this photo? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-photos`, {
        method: 'DELETE',
        body: JSON.stringify({ photoIndex: index }),
      });
      const data = await res.json();
      if (data?.success) {
        setUploadedPhotos(data.data?.photoUrls ?? uploadedPhotos.filter((_, i) => i !== index));
        addToast({ type: 'success', title: 'Photo removed' });
      } else {
        throw new Error(data?.message);
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to remove photo' });
    }
  }

  async function handleUploadAndNotify() {
    if (selectedFiles.length === 0) {
      addToast({ type: 'warning', title: 'No photos selected', description: 'Please select at least one photo.' });
      return;
    }
    setUploading(true);
    try {
      const base64Photos = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-photos`, {
        method: 'POST',
        body: JSON.stringify({ photos: base64Photos, note: warehouseNote }),
      });
      const data = await res.json();
      if (data?.success) {
        setUploadedPhotos(data.data?.photoUrls ?? [...uploadedPhotos, ...base64Photos]);
        setSelectedFiles([]);
        setPreviews([]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 5000);
        addToast({ type: 'success', title: 'Photos uploaded & both client and staff/admin notified' });
      } else {
        throw new Error(data?.message ?? 'Upload failed');
      }
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please check your connection and try again.' });
    } finally {
      setUploading(false);
    }
  }

  async function handleRepackPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 10 - repack.photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const dataUrls = await Promise.all(toProcess.map(readFileAsDataUrl));
    setRepack(prev => ({ ...prev, photos: [...prev.photos, ...dataUrls] }));
  }

  async function saveRepackDetails() {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/warehouse-report`, {
        method: 'PATCH',
        body: JSON.stringify({
          finalWeightKg: repack.weight ? parseFloat(repack.weight) : null,
          finalVolumeCbm: repack.cbm ? parseFloat(repack.cbm) : null,
          repackNotes: repack.notes || null,
          repackSaved: true,
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message ?? 'Failed');
      setRepackSaved(true);
      fetchWarehouseReport();

      await apiFetch(`/api/orders/${orderId}/warehouse-reply`, {
        method: 'POST',
        body: JSON.stringify({ message: 'Warehouse has updated the repacking details (weight, dimensions, photos).' }),
      }).catch(() => {});

      addToast({ type: 'success', title: 'Update sent to admin & staff successfully' });
    } catch {
      addToast({ type: 'error', title: 'Failed to save repacking details' });
    }
  }

  async function handleFinalPackingList(files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataUrl(files[0]);
    setOutbound(prev => ({ ...prev, finalPackingList: url }));
  }

  async function handleDeliverySlip(files: FileList | null) {
    if (!files?.length) return;
    const url = await readFileAsDataUrl(files[0]);
    setOutbound(prev => ({ ...prev, deliverySlip: url }));
  }

  async function markSentToChina() {
    if (!outbound.trackingId.trim()) {
      addToast({ type: 'error', title: 'Tracking ID required', description: 'Enter the outbound tracking number first.' });
      return;
    }

    try {
      // 1. Update warehouse report with sentToChina + trackingId
      const reportRes = await apiFetch(`/api/orders/${orderId}/warehouse-report`, {
        method: 'PATCH',
        body: JSON.stringify({ outboundTrackingId: outbound.trackingId.trim(), sentToChina: true }),
      });
      const reportData = await reportRes.json();
      if (!reportData?.success) throw new Error(reportData?.message ?? 'Failed');

      // 2. Update completedStages — add "Repacking Warehouse" if not already present
      const currentStages: string[] = order.completedStages ?? [];
      const stageLabel = 'Repacking Warehouse';
      const updatedStages = currentStages.includes(stageLabel)
        ? currentStages
        : [...currentStages, stageLabel];
      await apiFetch(`/api/orders/${orderId}/stages`, {
        method: 'PATCH',
        body: JSON.stringify({ completedStages: updatedStages }),
      });

      // 3. Update status to "Shipped from China"
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SHIPPED' }),
      });

      setOutboundSent(true);
      addToast({ type: 'success', title: 'Order marked as sent', description: `Tracking ID: ${outbound.trackingId}` });
    } catch {
      addToast({ type: 'error', title: 'Failed to mark as sent' });
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/staff/warehouse/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="font-tabular font-700 text-lg">{orderDisplayId}</span>
          <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
            Repacking Warehouse
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Client: <span className="font-600 text-foreground">{clientName}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Created:{' '}
          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Section 1 — Packaging List (Read Only) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Items from Order</h2>
          <span className="ml-auto text-[10px] font-600 uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">
            Read Only
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Review items carefully before repacking</p>
        <div className="space-y-3">
          {(order.items ?? []).map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {item.imageUrl || item.product?.images?.[0] ? (
                  <img src={item.imageUrl ?? item.product?.images?.[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-600 text-sm">{item.product?.name ?? item.notes ?? 'Item'}</p>
                <p className="text-xs text-muted-foreground">
                  Expected Qty: <span className="font-tabular font-700 text-foreground">{item.quantity}</span>
                </p>
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
        <p className="text-xs text-muted-foreground mb-4">Mark each item as OK or report an issue.</p>

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
                {item.name} — Expected Qty: <span className="font-tabular">{item.expectedQty}</span>
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => updateItemReport(idx, { status: 'ok', issue: '' })}
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
                    onChange={e => updateItemReport(idx, { issue: e.target.value })}
                    disabled={reportSubmitted}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-600 text-muted-foreground block mb-1">Received Quantity</label>
                <input
                  type="number"
                  className="input-field w-32"
                  value={item.receivedQty}
                  onChange={e => updateItemReport(idx, { receivedQty: e.target.value })}
                  disabled={reportSubmitted}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        {!reportSubmitted && itemReports.length > 0 && (
          <button
            onClick={submitReport}
            className="mt-4 px-4 py-2 text-sm rounded-lg text-white font-600 transition-colors"
            style={{ backgroundColor: '#c17b5c' }}
          >
            Submit Report
          </button>
        )}
      </div>

      {/* Section 3 — Upload Product Photos (sends to client + staff/admin) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="font-700 text-base mb-1">📦 Upload Product Photos</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Upload product photos below. Once you click "Upload &amp; Notify", the photos will be sent to both the client (for approval) and staff/admin (for review) simultaneously.
        </p>

        {/* Already uploaded photos */}
        {uploadedPhotos.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-600 text-muted-foreground mb-2">Previously Uploaded ({uploadedPhotos.length} photos)</p>
            <div className="grid grid-cols-4 gap-2">
              {uploadedPhotos.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    className="w-full h-24 object-cover rounded-lg cursor-pointer border border-border"
                    onClick={() => setUploadLightboxUrl(url)}
                  />
                  {/* Download on hover — bottom right */}
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    ⬇
                  </a>
                  {/* Delete button — top right */}
                  <button
                    onClick={() => deleteUploadedPhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-700 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two info boxes */}
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-600 text-blue-800">👤 Client Update</p>
            <p className="text-xs text-blue-600 mt-1">Client will see these photos and can approve or flag an issue before shipment continues.</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm font-600 text-purple-800">🏢 Staff/Admin Update</p>
            <p className="text-xs text-purple-600 mt-1">Staff and admin will see photos + your note and get notified of a new warehouse update.</p>
          </div>
        </div>

        {/* Note for staff/admin */}
        <div className="mb-4">
          <label className="text-xs font-600 text-muted-foreground block mb-1">Note to Staff/Admin</label>
          <textarea
            value={warehouseNote}
            onChange={e => setWarehouseNote(e.target.value)}
            placeholder="Add any notes about the product condition, packaging details, or issues found..."
            className="input-field w-full text-sm resize-none"
            rows={3}
          />
        </div>

        {/* File input */}
        <div className="mb-4">
          <label className="text-xs font-600 text-muted-foreground block mb-1">Select Photos (max 30)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-600 file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer"
          />
          <p className="text-xs text-muted-foreground mt-1">{selectedFiles.length}/30 photos selected</p>
        </div>

        {/* New photo previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {previews.map((src, i) => (
              src ? (
                <div key={i} className="relative">
                  <img src={src} className="w-full h-24 object-cover rounded-lg border border-border" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-700 hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : null
            ))}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUploadAndNotify}
          disabled={uploading || selectedFiles.length === 0}
          className="w-full py-3 rounded-lg font-700 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: uploading || selectedFiles.length === 0 ? '#9ca3af' : '#4A3B52' }}
        >
          {uploading ? '⏳ Uploading & Notifying...' : '📤 Upload & Notify (Client + Staff/Admin)'}
        </button>

        {uploadSuccess && (
          <div className="mt-3 bg-emerald-50 border border-emerald-300 rounded-lg p-3">
            <p className="text-emerald-700 text-sm font-600">✓ Photos uploaded successfully! Client and Staff/Admin have been notified.</p>
          </div>
        )}
      </div>

      {/* Upload lightbox */}
      {uploadLightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setUploadLightboxUrl(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setUploadLightboxUrl(null)} className="absolute -top-8 right-0 text-white text-xl font-700">✕</button>
            <img src={uploadLightboxUrl} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            <a href={uploadLightboxUrl} download target="_blank" rel="noreferrer" className="block mt-2 text-center text-white underline text-sm">⬇ Download Full Image</a>
          </div>
        </div>
      )}

      {/* Section 4 — Repacking Details (weight, dimensions, notes) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Repacking Information</h2>
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Final Weight (KG)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 42.5"
                value={repack.weight}
                onChange={e => setRepack(prev => ({ ...prev, weight: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Final Volume (CBM)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="e.g. 0.38"
                value={repack.cbm}
                onChange={e => setRepack(prev => ({ ...prev, cbm: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Notes / Observations</label>
            <textarea
              className="input-field w-full"
              rows={3}
              placeholder="Any notes about repacking condition..."
              value={repack.notes}
              onChange={e => setRepack(prev => ({ ...prev, notes: e.target.value }))}
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
              <p className="text-sm font-600 text-emerald-700">Order marked as sent. Admin and sourcing staff have been notified.</p>
              <p className="text-xs text-emerald-600 mt-0.5">Tracking: {outbound.trackingId}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Outbound Tracking ID *</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="e.g. SF1234567890CN"
                value={outbound.trackingId}
                onChange={e => setOutbound(prev => ({ ...prev, trackingId: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Upload final packaging list</label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>{outbound.finalPackingList ? 'File uploaded — click to replace' : 'Upload packing list (PDF / image)'}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFinalPackingList(e.target.files)} />
              </label>
              {outbound.finalPackingList && <p className="text-xs text-emerald-700 font-600 mt-1">File uploaded</p>}
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Upload delivery slip / receipt photo</label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>{outbound.deliverySlip ? 'Photo uploaded — click to replace' : 'Upload delivery slip photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleDeliverySlip(e.target.files)} />
              </label>
              {outbound.deliverySlip && (
                <img src={outbound.deliverySlip} alt="Delivery slip" className="w-32 h-32 object-cover rounded-lg border border-border mt-2" />
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
            {replies.map((reply, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-600 text-sm">Admin / Staff</span>
                  <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">Team</span>
                </div>
                <p className="text-sm text-foreground">{reply.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(reply.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
