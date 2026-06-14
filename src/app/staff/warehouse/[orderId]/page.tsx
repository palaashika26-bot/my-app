'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ordersApi } from '@/lib/api/orders.api';
import { downscaleImageToDataUrl } from '@/lib/upload';
import StatusBadge from '@/components/ui/StatusBadge';
import { ArrowLeft, CheckCircle, AlertTriangle, Upload, Truck, Package } from 'lucide-react';

interface ItemReport {
  name: string;
  qty: number;
  allOk: boolean;
  issueDescription: string;
  issuePhoto: string | null;
}

interface RepackDetails {
  weight: string;
  volume: string;
  note: string;
  photos: string[];
}

interface OutboundShipment {
  trackingId: string;
  finalPackingList: string | null;
  deliverySlip: string | null;
}

export default function WarehouseOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { addToast } = useToast();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  // Section 3 — Missing items report
  const [itemReports, setItemReports] = useState<ItemReport[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Section 4 — Repacking details
  const [repack, setRepack] = useState<RepackDetails>({ weight: '', volume: '', note: '', photos: [] });
  const [repackSaved, setRepackSaved] = useState(false);
  const [savingRepack, setSavingRepack] = useState(false);

  // Section 5 — Outbound shipment
  const [outbound, setOutbound] = useState<OutboundShipment>({ trackingId: '', finalPackingList: null, deliverySlip: null });
  const [outboundSent, setOutboundSent] = useState(false);
  const [sendingOutbound, setSendingOutbound] = useState(false);

  // Load the order and its persisted warehouse report from the backend.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      ordersApi.getOrderById(orderId),
      ordersApi.getWarehouseReport(orderId),
    ]).then(([orderRes, reportRes]) => {
      if (cancelled) return;

      if (orderRes.status !== 'fulfilled' || !orderRes.value.data?.data) {
        setNotFoundState(true);
        return;
      }
      const data = orderRes.value.data.data;
      setOrder(data);

      const orderItems = (data.items || []).map((item: any) => ({
        name: item.product?.name || item.notes || 'Unknown Product',
        qty: item.quantity,
      }));

      const report = reportRes.status === 'fulfilled' ? reportRes.value.data?.data : null;
      const savedItemReports: ItemReport[] | null = Array.isArray(report?.itemReports) ? report.itemReports : null;

      // Seed item reports from the saved report when present, otherwise from order items.
      setItemReports(
        savedItemReports && savedItemReports.length
          ? savedItemReports
          : orderItems.map((it: { name: string; qty: number }) => ({
              name: it.name, qty: it.qty, allOk: true, issueDescription: '', issuePhoto: null,
            })),
      );
      setReportSubmitted(!!report?.reportSubmitted);

      setRepack({
        weight: report?.finalWeightKg != null ? String(report.finalWeightKg) : '',
        volume: report?.finalVolumeCbm != null ? String(report.finalVolumeCbm) : '',
        note: report?.repackNotes ?? '',
        photos: Array.isArray(report?.repackPhotos) ? report.repackPhotos : [],
      });
      setRepackSaved(!!report?.repackSaved);

      setOutbound({
        trackingId: report?.outboundTrackingId ?? '',
        finalPackingList: report?.packingListUrl ?? null,
        deliverySlip: report?.deliverySlipUrl ?? null,
      });
      setOutboundSent(!!report?.sentToChina);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
  if (notFoundState || !order) { notFound(); return null; }

  const orderItems = (order.items || []).map((item: any) => ({
    name: item.product?.name || item.notes || 'Unknown Product',
    qty: item.quantity,
  }));

  function updateItemReport(idx: number, patch: Partial<ItemReport>) {
    setItemReports((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleIssuePhoto(idx: number, files: FileList | null) {
    if (!files?.length) return;
    try {
      const dataUrl = await downscaleImageToDataUrl(files[0]);
      updateItemReport(idx, { issuePhoto: dataUrl });
    } catch {
      addToast({ type: 'error', title: 'Could not read photo' });
    }
  }

  async function submitReport() {
    setSubmittingReport(true);
    try {
      await ordersApi.updateWarehouseReport(orderId, {
        itemReports,
        reportSubmitted: true,
      });
      setReportSubmitted(true);
      addToast({ type: 'success', title: 'Report submitted', description: 'Admin and sourcing staff have been notified.' });
    } catch {
      addToast({ type: 'error', title: 'Could not submit report', description: 'Please check your connection and try again.' });
    } finally {
      setSubmittingReport(false);
    }
  }

  async function handleRepackPhotos(files: FileList | null) {
    if (!files?.length) return;
    try {
      const urls = await Promise.all(Array.from(files).map((f) => downscaleImageToDataUrl(f)));
      setRepack((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
    } catch {
      addToast({ type: 'error', title: 'Could not read photos' });
    }
  }

  async function saveRepackDetails() {
    setSavingRepack(true);
    try {
      await ordersApi.updateWarehouseReport(orderId, {
        finalWeightKg: repack.weight ? parseFloat(repack.weight) : null,
        finalVolumeCbm: repack.volume ? parseFloat(repack.volume) : null,
        repackNotes: repack.note || null,
        repackPhotos: repack.photos,
        repackSaved: true,
      });
      setRepackSaved(true);
      addToast({ type: 'success', title: 'Repacking details saved' });
    } catch {
      addToast({ type: 'error', title: 'Could not save', description: 'Please try again.' });
    } finally {
      setSavingRepack(false);
    }
  }

  async function handleFinalPackingList(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    try {
      // Images are downscaled; PDFs are passed through as a data URL.
      const dataUrl = file.type.startsWith('image/')
        ? await downscaleImageToDataUrl(file)
        : await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
          });
      setOutbound((prev) => ({ ...prev, finalPackingList: dataUrl }));
    } catch {
      addToast({ type: 'error', title: 'Could not read file' });
    }
  }

  async function handleDeliverySlip(files: FileList | null) {
    if (!files?.length) return;
    try {
      const dataUrl = await downscaleImageToDataUrl(files[0]);
      setOutbound((prev) => ({ ...prev, deliverySlip: dataUrl }));
    } catch {
      addToast({ type: 'error', title: 'Could not read photo' });
    }
  }

  async function markSentToChina() {
    if (!outbound.trackingId.trim()) {
      addToast({ type: 'error', title: 'Tracking ID required', description: 'Enter the outbound tracking number first.' });
      return;
    }
    setSendingOutbound(true);
    try {
      await ordersApi.updateWarehouseReport(orderId, {
        outboundTrackingId: outbound.trackingId.trim(),
        packingListUrl: outbound.finalPackingList,
        deliverySlipUrl: outbound.deliverySlip,
        sentToChina: true,
      });
      setOutboundSent(true);
      addToast({ type: 'success', title: 'Order marked as sent', description: `Tracking ID: ${outbound.trackingId}` });
    } catch {
      addToast({ type: 'error', title: 'Could not update', description: 'Please try again.' });
    } finally {
      setSendingOutbound(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header nav */}
      <Link href="/staff/warehouse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      {/* Section 1 — Order header */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="font-tabular font-700 text-lg">{order.orderNumber || order.id}</span>
          <StatusBadge status={order.status as any} />
        </div>
        <p className="text-sm text-muted-foreground mb-4">Client: <span className="font-600 text-foreground">{order.client?.companyName || order.client?.user?.firstName || '—'}</span></p>
        <h3 className="text-xs uppercase font-600 text-muted-foreground mb-2">Items</h3>
        <ul className="space-y-1">
          {orderItems.map((it: { name: string; qty: number }) => (
            <li key={it.name} className="flex items-center justify-between text-sm border-b border-border pb-1 last:border-0 last:pb-0">
              <span className="font-500">{it.name}</span>
              <span className="font-tabular text-muted-foreground">Qty: {it.qty}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 2 — Packaging list (read only) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Packaging List from Admin</h2>
          <span className="ml-auto text-[10px] font-600 uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">Read Only</span>
        </div>
        <div className="space-y-3">
          {orderItems.map((it: { name: string; qty: number }) => (
            <div key={it.name} className="rounded-lg border border-border p-3">
              <p className="font-600 text-sm">{it.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Expected Qty: <span className="font-tabular font-600 text-foreground">{it.qty}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Missing items report */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="font-700">Report Missing / Damaged Items</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Mark each item as OK or report an issue.</p>
        <div className="space-y-4">
          {itemReports.map((item, idx) => (
            <div key={item.name} className="border border-border rounded-lg p-4">
              <p className="font-600 text-sm mb-3">{item.name} — Qty: {item.qty}</p>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => updateItemReport(idx, { allOk: true, issueDescription: '', issuePhoto: null })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-600 border transition-colors ${item.allOk ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  disabled={reportSubmitted}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> All OK
                </button>
                <button
                  type="button"
                  onClick={() => updateItemReport(idx, { allOk: false })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-600 border transition-colors ${!item.allOk ? 'bg-red-50 border-red-300 text-red-700' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  disabled={reportSubmitted}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Issue Found
                </button>
              </div>
              {!item.allOk && (
                <div className="space-y-2 pl-1">
                  <textarea
                    className="input-field w-full text-sm"
                    rows={2}
                    placeholder="Describe the issue..."
                    value={item.issueDescription}
                    onChange={(e) => updateItemReport(idx, { issueDescription: e.target.value })}
                    disabled={reportSubmitted}
                  />
                  {!reportSubmitted && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload issue photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIssuePhoto(idx, e.target.files)} />
                    </label>
                  )}
                  {item.issuePhoto && (
                    <img src={item.issuePhoto} alt="Issue" className="w-24 h-24 object-cover rounded-lg border border-border" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {reportSubmitted ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 font-600">
            <CheckCircle className="w-4 h-4" /> Report submitted
          </div>
        ) : (
          <button onClick={submitReport} disabled={submittingReport} className="btn-primary mt-4 px-4 py-2 text-sm disabled:opacity-50">
            {submittingReport ? 'Submitting…' : 'Submit Report'}
          </button>
        )}
      </div>

      {/* Section 4 — Repacking details */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="font-700 mb-4">Repacking Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Repacking Photos</label>
            {!repackSaved && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>Click to upload photos (multiple allowed)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleRepackPhotos(e.target.files)} />
              </label>
            )}
            {repack.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {repack.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Repack ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Final Weight (KG)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="0.00"
                value={repack.weight}
                onChange={(e) => setRepack((prev) => ({ ...prev, weight: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground block mb-1">Final Volume (CBM)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="0.000"
                value={repack.volume}
                onChange={(e) => setRepack((prev) => ({ ...prev, volume: e.target.value }))}
                disabled={repackSaved}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Notes / Observations</label>
            <textarea
              className="input-field w-full"
              rows={3}
              placeholder="Any observations or notes..."
              value={repack.note}
              onChange={(e) => setRepack((prev) => ({ ...prev, note: e.target.value }))}
              disabled={repackSaved}
            />
          </div>
        </div>
        {repackSaved ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 font-600">
            <CheckCircle className="w-4 h-4" /> Repacking details saved
          </div>
        ) : (
          <button onClick={saveRepackDetails} disabled={savingRepack} className="btn-primary mt-4 px-4 py-2 text-sm disabled:opacity-50">
            {savingRepack ? 'Saving…' : 'Save Repacking Details'}
          </button>
        )}
      </div>

      {/* Section 5 — Outbound shipment */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-700">Send to Final China Warehouse</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Tracking ID *</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="Enter outbound tracking number"
              value={outbound.trackingId}
              onChange={(e) => setOutbound((prev) => ({ ...prev, trackingId: e.target.value }))}
              disabled={outboundSent}
            />
          </div>
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Final Packaging List (PDF / Image)</label>
            {!outboundSent && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>{outbound.finalPackingList ? 'File uploaded — click to replace' : 'Upload packing list'}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFinalPackingList(e.target.files)} />
              </label>
            )}
            {outbound.finalPackingList && (
              <p className="text-xs text-emerald-700 font-600 mt-1">File uploaded</p>
            )}
          </div>
          <div>
            <label className="text-xs font-600 text-muted-foreground block mb-1">Delivery Slip Photo</label>
            {!outboundSent && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3">
                <Upload className="w-4 h-4" />
                <span>{outbound.deliverySlip ? 'Photo uploaded — click to replace' : 'Upload delivery slip photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDeliverySlip(e.target.files)} />
              </label>
            )}
            {outbound.deliverySlip && (
              <img src={outbound.deliverySlip} alt="Delivery slip" className="w-32 h-32 object-cover rounded-lg border border-border mt-2" />
            )}
          </div>
        </div>
        {outboundSent ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 font-600">
            <CheckCircle className="w-4 h-4" /> Marked as sent to China Warehouse — Tracking: {outbound.trackingId}
          </div>
        ) : (
          <button onClick={markSentToChina} disabled={sendingOutbound} className="btn-primary mt-4 px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">
            <Truck className="w-4 h-4" /> {sendingOutbound ? 'Saving…' : 'Mark as Sent to China Warehouse'}
          </button>
        )}
      </div>
    </div>
  );
}
