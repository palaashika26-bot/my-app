'use client';
import React, { useState, useRef } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { Upload, FileText, Info } from 'lucide-react';

export default function LogisticsPage() {
  const { addToast } = useToast();
  const [packagingFiles, setPackagingFiles] = useState<string[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [cbm, setCbm] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const names = Array.from(e.target.files || []).map(f => f.name);
    setPackagingFiles(prev => [...prev, ...names]);
    e.target.value = '';
  }

  function removeFile(i: number) {
    setPackagingFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingMethod) {
      addToast({ type: 'warning', title: 'Select shipping method', description: 'Please choose Air, Express, or Sea.' });
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setSubmitting(false);
    addToast({ type: 'success', title: 'Logistics request submitted', description: 'Our team will get back to you with a quote shortly.' });
    setPackagingFiles([]);
    setWeightKg('');
    setCbm('');
    setShippingMethod('');
  }

  return (
    <ClientShell>
      <h1 className="text-2xl font-700 mb-1">Logistics</h1>
      <p className="text-sm text-muted-foreground mb-6">Submit your shipment details to get a logistics quote.</p>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">

        {/* Packaging list upload */}
        <div>
          <label className="text-sm font-600 block mb-1">Item Packaging List</label>
          <p className="text-xs text-muted-foreground mb-2">Upload your packing list — images or documents accepted.</p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
          >
            <Upload className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload files</p>
            <p className="text-xs text-muted-foreground">Images, PDF, Excel — any format</p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" className="hidden" onChange={handleFiles} />
          {packagingFiles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {packagingFiles.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{name}</span>
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
            <input
              type="number"
              min="0"
              step="0.01"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
              className="input-field"
              placeholder="e.g. 42.5"
            />
          </div>
          <div>
            <label className="text-sm font-600 block mb-1">Volume (CBM)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={cbm}
              onChange={e => setCbm(e.target.value)}
              className="input-field"
              placeholder="e.g. 0.38"
            />
          </div>
        </div>

        {/* Shipping method */}
        <div>
          <label className="text-sm font-600 block mb-1">Shipping Method</label>
          <select
            value={shippingMethod}
            onChange={e => setShippingMethod(e.target.value)}
            className="input-field"
          >
            <option value="">Select shipping method</option>
            <option value="Air">Air</option>
            <option value="Express">Express</option>
            <option value="Sea">Sea</option>
          </select>
        </div>

        {/* Port-only note */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Note: Prices are till port only</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-2.5 text-sm"
        >
          {submitting ? 'Submitting…' : 'Submit Logistics Request'}
        </button>
      </form>
    </ClientShell>
  );
}
