'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { Upload, FileText, Info, Package, ChevronRight, Clock } from 'lucide-react';
import {
  logisticsApi,
  LOGISTICS_STATUS_COLORS,
  LOGISTICS_STATUS_LABELS,
  type ShippingMethod,
} from '@/lib/api/logistics.api';
import { uploadFiles, ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/lib/upload';

export default function LogisticsPage() {
  const { addToast } = useToast();
  const [packagingFiles, setPackagingFiles] = useState<File[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [cbm, setCbm] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi
      .getList(undefined, signal)
      .then((r) => setMyRequests(r.data?.data ?? []))
      .catch((err) => {
        if (err?.code !== 'ERR_CANCELED') {
          setError('Could not load logistics requests. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchRequests(ac.signal);
    return () => ac.abort();
  }, [fetchRequests]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of picked) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        addToast({ type: 'warning', title: 'Unsupported file', description: `${f.name}: images only (JPG, PNG, WEBP).` });
        continue;
      }
      if (f.size > MAX_UPLOAD_BYTES) {
        addToast({ type: 'warning', title: 'File too large', description: `${f.name} exceeds 15 MB.` });
        continue;
      }
      valid.push(f);
    }
    setPackagingFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  }

  function removeFile(i: number) {
    setPackagingFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingMethod) {
      addToast({ type: 'warning', title: 'Select shipping method', description: 'Please choose Air, Express, or Sea.' });
      return;
    }
    setSubmitting(true);
    try {
      let packagingListUrls: string[] = [];
      let packagingThumbUrls: string[] = [];
      if (packagingFiles.length) {
        const uploaded = await uploadFiles(packagingFiles, 'logistics-packing');
        packagingListUrls = uploaded.map((u) => u.url);
        packagingThumbUrls = uploaded.map((u) => u.thumbUrl || u.url);
      }
      await logisticsApi.create({
        shippingMethod: shippingMethod as ShippingMethod,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        volumeCbm: cbm ? parseFloat(cbm) : undefined,
        packagingListUrls,
        packagingThumbUrls,
        note: note.trim() || undefined,
      });
      addToast({ type: 'success', title: 'Logistics request submitted', description: 'Our team will get back to you with a quote shortly.' });
      setPackagingFiles([]);
      setWeightKg('');
      setCbm('');
      setShippingMethod('');
      setNote('');
      fetchRequests();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Submission failed', description: err?.response?.data?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientLayout>
      <h1 className="text-2xl font-700 mb-1">Logistics</h1>
      <p className="text-sm text-muted-foreground mb-6">Submit your shipment details to get a logistics quote.</p>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
        {/* Packaging list upload */}
        <div>
          <label className="text-sm font-600 block mb-1">Item Packaging List</label>
          <p className="text-xs text-muted-foreground mb-2">Upload photos of your packing list — JPG, PNG, or WEBP.</p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-[#4A3B52]/50 hover:bg-[#4A3B52]/10 transition-colors"
          >
            <Upload className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload images</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — up to 15 MB each</p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFiles} />
          {packagingFiles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {packagingFiles.map((file, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-500 text-xs">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weight & CBM */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-600 block mb-1">Weight (KG)</label>
            <input type="number" min="0" step="0.01" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="input-field" placeholder="e.g. 42.5" />
          </div>
          <div>
            <label className="text-sm font-600 block mb-1">Volume (CBM)</label>
            <input type="number" min="0" step="0.001" value={cbm} onChange={(e) => setCbm(e.target.value)} className="input-field" placeholder="e.g. 0.38" />
          </div>
        </div>

        {/* Shipping method */}
        <div>
          <label className="text-sm font-600 block mb-1">Shipping Method</label>
          <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="input-field">
            <option value="">Select shipping method</option>
            <option value="Air">Air</option>
            <option value="Express">Express</option>
            <option value="Sea">Sea</option>
          </select>
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-600 block mb-1">Note <span className="text-muted-foreground font-400">(optional)</span></label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input-field resize-none" placeholder="Anything our team should know about this shipment" />
        </div>

        {/* Port-only note */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Note: Prices are till port only</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
          {submitting ? 'Submitting…' : 'Submit Logistics Request'}
        </button>
      </form>

      {/* My Logistics Requests */}
      <div className="mt-10 max-w-2xl">
        <h2 className="text-lg font-700 mb-1 flex items-center gap-2"><Package className="w-5 h-5" /> My Logistics Requests</h2>
        <p className="text-sm text-muted-foreground mb-4">Track your submitted requests and review admin quotes.</p>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-600 text-red-800">{error}</p>
              </div>
              <button onClick={() => fetchRequests()} className="text-xs font-600 text-red-700 hover:underline flex-shrink-0">Retry</button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : myRequests.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-card p-6 text-center text-sm text-muted-foreground">
            No logistics requests yet. Submit your first shipment above.
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <Link
                key={req.id}
                href={`/client-dashboard/logistics/${req.id}`}
                className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-[#4A3B52]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
                      </span>
                      {req.status === 'QUOTED' && <span className="text-xs text-[#7a9e9f] font-600">Quote ready — tap to review</span>}
                      {req.status === 'ACCEPTED' && <span className="text-xs text-[#5c5470] font-600">Proceed to payment</span>}
                    </div>
                    <p className="text-sm font-600">{req.shippingMethod} Freight</p>
                    <p className="text-xs text-muted-foreground font-tabular mt-0.5">{req.requestNumber}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{req.weightKg ? `${parseFloat(req.weightKg)} KG` : '— KG'}</span>
                      <span>{req.volumeCbm ? `${parseFloat(req.volumeCbm)} CBM` : '— CBM'}</span>
                      <span>{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    {req.status === 'SUBMITTED' && <Clock className="w-4 h-4" />}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
