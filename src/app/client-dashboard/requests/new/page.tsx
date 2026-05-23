'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { Camera, Upload, ArrowLeft, ArrowRight, Plus, X, Check } from 'lucide-react';

interface Item { name: string; desc: string; qty: string; url: string; files: string[] }

export default function NewRequestPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<Item[]>([{ name: '', desc: '', qty: '', url: '', files: [] }]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [special, setSpecial] = useState('');
  const [chinaAddress, setChinaAddress] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateItem(i: number, key: keyof Item, val: any) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  }
  function addItem() { if (items.length < 5) setItems([...items, { name: '', desc: '', qty: '', url: '', files: [] }]); }
  function removeItem(i: number) { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); }

  async function submit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    const id = `BK-REQ-2026-${Math.floor(1000 + Math.random()*9000)}`;
    addToast({ type: 'success', title: 'Request submitted!', description: `${id} created. Our team will contact you within 24 hours.` });
    setTimeout(() => router.push('/client-dashboard/requests'), 2000);
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload reference images</span>
                  <input type="file" multiple className="hidden" onChange={e => updateItem(i, 'files', Array.from(e.target.files || []).map(f => f.name))} />
                  {it.files.length > 0 && <span className="text-xs text-muted-foreground">{it.files.length} file(s)</span>}
                </label>
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
            <div><label className="text-xs font-600 text-muted-foreground">China Delivery Address</label><textarea value={chinaAddress} onChange={e => setChinaAddress(e.target.value)} className="input-field mt-1" rows={2} placeholder="Enter the address in China where goods should be delivered" /></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-700">Step 3 — Review & Submit</h3>
            <div className="bg-muted/40 rounded-xl p-4"><p className="text-xs font-600 text-muted-foreground mb-2">ITEMS</p>{items.map((it, i) => <p key={i} className="text-sm">• {it.name || `Item ${i+1}`} — Qty: {it.qty || '-'}</p>)}</div>
            <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Budget Range</p><p className="font-600">₹{budgetMin || '—'} – ₹{budgetMax || '—'}/unit</p></div>
              <div><p className="text-xs text-muted-foreground">Total Budget</p><p className="font-600">₹{totalBudget || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Required by</p><p className="font-600">{deadline || '—'}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">China Delivery Address</p><p className="font-600">{chinaAddress || '—'}</p></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="accent-accent w-4 h-4" /><span className="text-sm">I confirm the details are accurate</span></label>
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
