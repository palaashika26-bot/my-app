'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Upload, X, Sparkles, Check } from 'lucide-react';

const mockScanResults = [
  { productName: 'LED Strip Light (RGB, 5m)', category: 'Lighting & Electrical', detectedSpecs: ['RGB Color Changing', '5 Meter Roll', 'IP65 Waterproof', '12V DC', 'SMD 5050 LEDs'], estimatedUnitPrice: '¥35–55 (₹420–660)', suggestedQuantity: 100, confidence: 94, similarProducts: ['LED Strip Light 10m', 'LED Neon Flex', 'LED Fairy Lights'] },
  { productName: 'Silicone Phone Case (Universal)', category: 'Mobile Accessories', detectedSpecs: ['Silicone Material', 'Drop Protection', 'Multiple Colors', 'Compatible: iPhone/Samsung'], estimatedUnitPrice: '¥8–15 (₹96–180)', suggestedQuantity: 500, confidence: 89, similarProducts: ['TPU Phone Case', 'Clear Phone Case', 'Leather Flip Case'] },
  { productName: 'Stainless Steel Water Bottle (500ml)', category: 'Kitchenware', detectedSpecs: ['500ml Capacity', '304 Stainless Steel', 'Double-Wall Insulated', 'BPA Free', 'Leak-Proof Lid'], estimatedUnitPrice: '¥18–28 (₹216–336)', suggestedQuantity: 200, confidence: 91, similarProducts: ['Insulated Tumbler', 'Plastic Water Bottle', 'Glass Bottle'] },
];

const analysisSteps = ['Identifying product...', 'Extracting specifications...', 'Finding sourcing details...'];

export default function PhotoRequestPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgInfo, setImgInfo] = useState<{name: string; size: string} | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<typeof mockScanResults[0] | null>(null);
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState(0);
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState('Sea Freight');
  const [specs, setSpecs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(f: File) {
    const url = URL.createObjectURL(f);
    setImgUrl(url);
    setImgInfo({ name: f.name, size: `${(f.size/1024).toFixed(1)} KB` });
  }

  async function analyse() {
    setStage('scanning');
    setScanStep(0);
    for (let i = 0; i < analysisSteps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setScanStep(i + 1);
    }
    await new Promise(r => setTimeout(r, 400));
    const r = mockScanResults[Math.floor(Math.random() * mockScanResults.length)];
    setResult(r);
    setProduct(r.productName);
    setQty(r.suggestedQuantity);
    setBudget(r.estimatedUnitPrice.split('(')[1]?.replace(')', '') || '');
    setSpecs(r.detectedSpecs);
    setStage('results');
  }

  function reset() { setStage('upload'); setImgUrl(null); setImgInfo(null); setResult(null); }
  function removeSpec(s: string) { setSpecs(specs.filter(x => x !== s)); }

  async function submit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    const id = `BK-REQ-2026-${Math.floor(1000 + Math.random()*9000)}`;
    addToast({ type: 'success', title: '🎉 Request Submitted', description: `${id} submitted. Our team will review your product image and contact you within 24 hours.` });
    setTimeout(() => router.push('/client-dashboard/requests'), 2000);
  }

  return (
    <ClientShell>
      <Link href="/client-dashboard/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center"><Camera className="w-6 h-6" /></div>
        <div><h1 className="text-2xl font-700">Request by Photo</h1><p className="text-sm text-muted-foreground">Upload a product image — our AI will identify it for you.</p></div>
      </div>

      {stage === 'upload' && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          {!imgUrl ? (
            <div onClick={() => fileRef.current?.click()} className="rounded-2xl border-2 border-dashed border-border bg-muted/40 hover:bg-orange-50/40 transition-colors cursor-pointer p-10 text-center">
              <div className="text-5xl mb-3">📷</div>
              <p className="font-600 text-foreground">Drag & drop your product image here</p>
              <p className="text-sm text-muted-foreground mt-1">or tap to browse / use camera</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Image</button>
                <button onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"><Camera className="w-4 h-4" /> Take Photo</button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Supports JPG, PNG, WEBP up to 10MB</p>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              <img src={imgUrl} alt="preview" className="w-full max-h-96 object-contain rounded-xl bg-muted" />
              <div className="flex items-center justify-between mt-3"><div><p className="text-sm font-600">{imgInfo?.name}</p><p className="text-xs text-muted-foreground">{imgInfo?.size}</p></div><button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Change Image</button></div>
              <button onClick={analyse} className="btn-primary w-full mt-4 py-3 inline-flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Analyse Image</button>
            </div>
          )}
        </div>
      )}

      {stage === 'scanning' && imgUrl && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <img src={imgUrl} alt="scanning" className="w-full max-h-96 object-contain" />
            <div className="absolute inset-x-0 h-1 bg-gradient-to-b from-accent/0 via-accent to-accent/0" style={{ animation: 'scanLine 2.5s linear infinite', top: '0%' }} />
            <style>{`@keyframes scanLine { 0% { top: 0%; } 100% { top: 100%; } }`}</style>
            <div className="absolute inset-0 bg-accent/5" />
          </div>
          <div className="mt-5 text-center">
            <p className="font-700 text-foreground">🔍 Analysing product...</p>
            <div className="mt-3 space-y-1">
              {analysisSteps.map((s, i) => (
                <p key={s} className={`text-sm transition-opacity ${i < scanStep ? 'text-emerald-600 font-500' : i === scanStep ? 'text-accent font-600' : 'text-muted-foreground opacity-50'}`}>{i < scanStep ? '✅' : i === scanStep ? '⏳' : '⚫'} {s}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === 'results' && result && imgUrl && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <img src={imgUrl} alt="" className="w-full rounded-xl bg-muted" />
            <div className="flex items-center justify-between mt-3">
              <span className="badge bg-emerald-100 text-emerald-700">✅ {result.confidence}% Match</span>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Wrong product? Try again</button>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-card p-5 space-y-4">
            <p className="text-sm font-700 text-emerald-600">✅ Product Identified</p>
            <div><label className="text-xs font-600 text-muted-foreground">Product Name</label><input value={product} onChange={e => setProduct(e.target.value)} className="input-field mt-1" /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Category</label><input value={result.category} readOnly className="input-field mt-1" /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Detected Specs</label>
              <div className="flex flex-wrap gap-1.5 mt-1">{specs.map(s => <span key={s} className="badge bg-muted text-foreground border border-border">{s}<button onClick={() => removeSpec(s)} className="ml-1 text-muted-foreground hover:text-red-500"><X className="w-3 h-3" /></button></span>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-600 text-muted-foreground">Est. Unit Price</label><div className="input-field bg-muted mt-1">{result.estimatedUnitPrice}</div></div>
              <div><label className="text-xs font-600 text-muted-foreground">Quantity</label><input value={qty} onChange={e => setQty(+e.target.value)} type="number" className="input-field mt-1" /></div>
            </div>
            <div><label className="text-xs font-600 text-muted-foreground">Budget per unit (INR)</label><input value={budget} onChange={e => setBudget(e.target.value)} className="input-field mt-1" /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Additional notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field mt-1" rows={2} placeholder="Special requirements..." /></div>
            <div><label className="text-xs font-600 text-muted-foreground">Shipping</label>
              <div className="grid grid-cols-3 gap-2 mt-1">{['Sea Freight','Air Freight','Express'].map(m => <button key={m} onClick={() => setShipping(m)} className={`px-2 py-1.5 rounded-lg text-xs font-500 border ${shipping === m ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`}>{m}</button>)}</div>
            </div>
            <div><p className="text-xs font-600 text-muted-foreground mb-2">You might also want:</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">{result.similarProducts.map(p => <button key={p} onClick={() => setProduct(p)} className="flex-shrink-0 badge bg-muted text-foreground border border-border hover:bg-accent/10 hover:border-accent">{p}</button>)}</div>
            </div>
            <button onClick={submit} disabled={submitting} className="btn-primary w-full py-3">{submitting ? 'Submitting...' : 'Submit Sourcing Request'}</button>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
