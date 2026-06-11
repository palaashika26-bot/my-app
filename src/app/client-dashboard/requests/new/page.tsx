'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { requestsApi } from '@/lib/api/requests.api';
import { requestsCache } from '@/lib/api/requestsCache';
import { uploadFiles, MAX_UPLOAD_BYTES } from '@/lib/upload';
import { Camera, Upload, ArrowLeft, ArrowRight, Plus, X, Check, ImageIcon } from 'lucide-react';

interface RefImage {
  preview: string;   // object URL for in-form display (not persisted)
  url: string;       // uploaded storage path (persisted)
  thumbUrl?: string; // uploaded thumbnail storage path
}
interface Item {
  name: string;
  desc: string;
  qty: string;
  url: string;
  refImages: RefImage[];
}

export default function NewRequestPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<Item[]>([{ name: '', desc: '', qty: '', url: '', refImages: [] }]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [special, setSpecial] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [chinaAddress, setChinaAddress] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingItem, setUploadingItem] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function updateItem(i: number, key: keyof Item, val: any) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  }
  function addItem() { if (items.length < 5) setItems([...items, { name: '', desc: '', qty: '', url: '', refImages: [] }]); }
  function removeItem(i: number) { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  async function handleRefImages(itemIdx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const current = items[itemIdx].refImages;
    const toAdd = files.slice(0, 5 - current.length);
    if (toAdd.length === 0) return;

    if (toAdd.some(f => !ALLOWED_TYPES.includes(f.type))) {
      addToast({ type: 'error', title: 'Only JPG, PNG or WEBP images are allowed' });
      return;
    }
    if (toAdd.some(f => f.size > MAX_UPLOAD_BYTES)) {
      addToast({ type: 'error', title: 'Image too large', description: 'Max 10MB per image.' });
      return;
    }

    // Upload straight to object storage; only the returned storage paths are kept
    // (a local object URL is used purely for the in-form preview).
    setUploadingItem(itemIdx);
    try {
      const uploaded = await uploadFiles(toAdd, 'request-item');
      const withPreview: RefImage[] = uploaded.map((u, i) => ({
        ...u,
        preview: URL.createObjectURL(toAdd[i]),
      }));
      updateItem(itemIdx, 'refImages', [...current, ...withPreview]);
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please check your connection and try again.' });
    } finally {
      setUploadingItem(null);
    }
  }

  function removeRefImage(itemIdx: number, imgIdx: number) {
    const img = items[itemIdx].refImages[imgIdx];
    if (img?.preview) URL.revokeObjectURL(img.preview);
    const next = items[itemIdx].refImages.filter((_, i) => i !== imgIdx);
    updateItem(itemIdx, 'refImages', next);
  }

  async function submit() {
    const validItems = items.filter(it => it.name.trim());
    if (!validItems.length) {
      addToast({ type: 'error', title: 'Add at least one product', description: 'Enter a product name to continue.' });
      return;
    }

    setSubmitting(true);
    try {
      const notes = [
        special,
        chinaAddress ? `China delivery address: ${chinaAddress}` : '',
        deadline ? `Required by: ${deadline}` : '',
        budgetMin && budgetMax ? `Budget per unit: ₹${budgetMin}–₹${budgetMax}` : '',
      ].filter(Boolean).join('\n') || undefined;

      const payload = {
        notes,
        referenceNote: referenceNote.trim() || undefined,
        totalBudgetINR: totalBudget ? parseFloat(totalBudget) : undefined,
        items: validItems.map(it => ({
          type: 'CUSTOM' as const,
          productName: it.name.trim(),
          productDescription: it.desc.trim() || undefined,
          quantity: Math.max(1, parseInt(it.qty) || 1),
          unit: 'PCS' as const,
          notes: it.url.trim() ? `Reference URL: ${it.url.trim()}` : undefined,
          referenceImageUrls: it.refImages.length > 0 ? it.refImages.map(im => im.url) : undefined,
          referenceThumbUrls: it.refImages.length > 0 ? it.refImages.map(im => im.thumbUrl ?? im.url) : undefined,
        })),
      };

      // No client-side race timeout here: the payload carries only storage paths
      // (images were already uploaded on selection), but createRequest still goes
      // through uploadClient (120s) to survive slow/cold-start backends. The old
      // 8s race fired "failed" while the POST actually succeeded on the server.
      const response = await requestsApi.createRequest(payload);
      const request = (response as any)?.data?.data;
      if (request) {
        requestsCache.set(request.id, request);
        addToast({
          type: 'success',
          title: 'Request submitted!',
          description: `${request.requestNumber} created. Our team will contact you within 24 hours.`,
        });
        router.push(`/client-dashboard/requests/${request.id}`);
      } else {
        // 2xx but an unexpected body shape — don't claim success, but don't claim
        // a hard failure either (the request may exist); send them to their list.
        addToast({ type: 'error', title: 'Could not confirm submission', description: 'Please check My Requests before resubmitting.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to submit request', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientLayout>
      <Link href="/client-dashboard/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <h1 className="text-2xl font-700 mb-1">New Sourcing Request</h1>
      <p className="text-sm text-muted-foreground mb-5">Tell us what you need — we'll source it from China.</p>

      <Link href="/client-dashboard/requests/photo" className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-[#5c5470]/40 bg-[#faf9f7] mb-6 hover:bg-[#f5f4f7] transition-colors">
        <div className="w-12 h-12 rounded-xl bg-[#5c5470] text-white flex items-center justify-center flex-shrink-0"><Camera className="w-6 h-6" /></div>
        <div className="flex-1"><p className="font-700 text-foreground">Have a product image?</p><p className="text-xs text-muted-foreground mt-0.5">Upload it and our AI will identify the product and specs.</p></div>
        <ArrowRight className="w-5 h-5 text-[#4A3B52]" />
      </Link>

      <div className="flex items-center gap-2 mb-6">
        {[1,2,3].map(n => (
          <React.Fragment key={n}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 ${n <= step ? 'bg-[#4A3B52] text-white' : 'bg-muted text-muted-foreground'}`}>{n < step ? <Check className="w-4 h-4" /> : n}</div>
            {n < 3 && <div className={`flex-1 h-1 rounded-full ${n < step ? 'bg-[#4A3B52]' : 'bg-muted'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-700">Step 1 — Product Details</h3>
            {items.map((it, i) => (
              <div key={i} className="border border-border rounded-xl p-4 space-y-3 relative">
                {items.length > 1 && <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>}
                <p className="text-xs font-600 text-muted-foreground">Item {i+1}</p>
                <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} className="input-field" placeholder="Product name *" />
                <textarea value={it.desc} onChange={e => updateItem(i, 'desc', e.target.value)} className="input-field" placeholder="Description / specifications" rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} type="number" className="input-field" placeholder="Quantity" />
                  <input value={it.url} onChange={e => updateItem(i, 'url', e.target.value)} className="input-field" placeholder="Reference URL (Alibaba)" />
                </div>

                {/* Reference images upload */}
                <div>
                  <p className="text-xs font-600 text-muted-foreground mb-2">Reference Images (optional)</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {it.refImages.map((img, imgIdx) => (
                      <div key={imgIdx} className="relative">
                        <img src={img.preview} alt={`ref-${imgIdx}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
                        <button type="button" onClick={() => removeRefImage(i, imgIdx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {it.refImages.length < 5 && (
                      <button type="button" disabled={uploadingItem === i} onClick={() => fileInputRefs.current[i]?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-[#4A3B52]/50 hover:text-[#4A3B52] transition-colors disabled:opacity-50">
                        {uploadingItem === i ? (
                          <span className="w-5 h-5 border-2 border-[#4A3B52]/30 border-t-[#4A3B52] rounded-full animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[10px]">Add</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="file" multiple accept="image/jpeg,image/png,image/webp"
                    ref={el => { fileInputRefs.current[i] = el; }}
                    className="hidden"
                    onChange={e => handleRefImages(i, e)}
                  />
                  <p className="text-[11px] text-muted-foreground">JPG, PNG accepted · Max 5 images per item</p>
                </div>
              </div>
            ))}
            {items.length < 5 && <button onClick={addItem} className="flex items-center gap-2 text-sm text-[#4A3B52] font-600"><Plus className="w-4 h-4" /> Add Another Item</button>}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-700">Step 2 — Budget & Requirements</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-600 text-muted-foreground">Budget per unit (Min, INR)</label><input value={budgetMin} onChange={e => setBudgetMin(e.target.value)} type="number" className="input-field mt-1" placeholder="e.g. 100" /></div>
              <div><label className="text-xs font-600 text-muted-foreground">Budget per unit (Max, INR)</label><input value={budgetMax} onChange={e => setBudgetMax(e.target.value)} type="number" className="input-field mt-1" placeholder="e.g. 150" /></div>
            </div>
            <div><label className="text-xs font-600 text-muted-foreground">Total Budget (INR)</label><input value={totalBudget} onChange={e => setTotalBudget(e.target.value)} type="number" className="input-field mt-1" placeholder="e.g. 50000" /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Required by</label><input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" className="input-field mt-1" /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Special requirements</label><textarea value={special} onChange={e => setSpecial(e.target.value)} className="input-field mt-1" rows={3} placeholder="QC, packaging, labeling notes..." /></div>
            <div>
              <label className="text-xs font-600 text-muted-foreground">Overall Reference Note (optional)</label>
              <textarea
                value={referenceNote}
                onChange={e => setReferenceNote(e.target.value)}
                className="input-field mt-1" rows={3}
                placeholder="Any specific requirements, reference links, sample images description..."
              />
            </div>
            <div><label className="text-xs font-600 text-muted-foreground">China Delivery Address</label><textarea value={chinaAddress} onChange={e => setChinaAddress(e.target.value)} className="input-field mt-1" rows={2} placeholder="Enter the address in China where goods should be delivered" /></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-700">Step 3 — Review & Submit</h3>
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-600 text-muted-foreground mb-2">ITEMS</p>
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-sm mb-1">
                  <span>• {it.name || `Item ${i+1}`} — Qty: {it.qty || '-'}</span>
                  {it.refImages.length > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{it.refImages.length} ref image{it.refImages.length > 1 ? 's' : ''}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Budget Range</p><p className="font-600">₹{budgetMin || '—'} – ₹{budgetMax || '—'}/unit</p></div>
              <div><p className="text-xs text-muted-foreground">Total Budget</p><p className="font-600">₹{totalBudget || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Required by</p><p className="font-600">{deadline || '—'}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">China Delivery Address</p><p className="font-600">{chinaAddress || '—'}</p></div>
              {referenceNote && <div className="col-span-2"><p className="text-xs text-muted-foreground">Reference Note</p><p className="font-600 text-sm">{referenceNote}</p></div>}
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <p className="text-sm font-600 text-amber-800 flex items-center gap-2 mb-1">
                ⚠️ No Refund Policy
              </p>
              <p className="text-sm text-amber-700">
                Please review your order carefully before submitting. Once your request is accepted and payment is made, no refunds will be issued under any circumstances.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                You may cancel your request before payment only.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="accent-accent w-4 h-4" /><span className="text-sm">I confirm the details are accurate and I have read and agreed to the No Refund Policy</span></label>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Back</button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={submit} disabled={!agree || submitting} className="btn-primary px-6 py-2 text-sm">{submitting ? 'Submitting...' : 'Submit Request'}</button>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
