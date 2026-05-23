'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileText, Info, Package, ChevronRight, Clock } from 'lucide-react';

interface AdminQuote {
  carrier: string;
  shippingMode: string;
  estimatedPrice: string;
  pricePerKg: string;
  eta: string;
  note: string;
}

interface LogisticsRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  orderId: string;
  weight: string;
  cbm: string;
  shippingMethod: string;
  packagingList: string[];
  status: 'Pending' | 'Quoted' | 'Approved' | 'Rejected';
  submittedAt: string;
  adminQuote: AdminQuote | null;
}

function genId() {
  return 'LR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function genOrderId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase();
}

function loadRequests(): LogisticsRequest[] {
  try {
    const raw = localStorage.getItem('logistics-requests');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRequests(reqs: LogisticsRequest[]) {
  localStorage.setItem('logistics-requests', JSON.stringify(reqs));
}

export default function LogisticsPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [packagingFiles, setPackagingFiles] = useState<string[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [cbm, setCbm] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [myRequests, setMyRequests] = useState<LogisticsRequest[]>([]);

  useEffect(() => {
    const all = loadRequests();
    const email = user?.email ?? '';
    setMyRequests(email ? all.filter(r => r.clientEmail === email) : all);
  }, [user]);

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

    const newRequest: LogisticsRequest = {
      id: genId(),
      clientName: user?.name ?? 'Client',
      clientEmail: user?.email ?? '',
      orderId: genOrderId(),
      weight: weightKg,
      cbm,
      shippingMethod,
      packagingList: packagingFiles,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      adminQuote: null,
    };

    const all = loadRequests();
    all.push(newRequest);
    saveRequests(all);

    const email = user?.email ?? '';
    setMyRequests(email ? all.filter(r => r.clientEmail === email) : all);

    setSubmitting(false);
    addToast({ type: 'success', title: 'Logistics request submitted', description: 'Our team will get back to you with a quote shortly.' });
    setPackagingFiles([]);
    setWeightKg('');
    setCbm('');
    setShippingMethod('');
  }

  const statusColor: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Quoted: 'bg-[#e4eeee] text-[#6b8f90]',
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
  };

  return (
    <ClientLayout>
      <h1 className="text-2xl font-700 mb-1">Logistics</h1>
      <p className="text-sm text-muted-foreground mb-6">Submit your shipment details to get a logistics quote.</p>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">

        {/* Packaging list upload */}
        <div>
          <label className="text-sm font-600 block mb-1">Item Packaging List</label>
          <p className="text-xs text-muted-foreground mb-2">Upload your packing list — images or documents accepted.</p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-[#4A3B52]/50 hover:bg-[#4A3B52]/10 transition-colors"
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

      {/* My Logistics Requests */}
      {myRequests.length > 0 && (
        <div className="mt-10 max-w-2xl">
          <h2 className="text-lg font-700 mb-1 flex items-center gap-2"><Package className="w-5 h-5" /> My Logistics Requests</h2>
          <p className="text-sm text-muted-foreground mb-4">Track your submitted requests and review admin quotes.</p>
          <div className="space-y-3">
            {myRequests.slice().reverse().map(req => (
              <Link
                key={req.id}
                href={`/client-dashboard/logistics/${req.id}`}
                className="block bg-card rounded-xl border border-border shadow-card p-4 hover:border-[#4A3B52]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${statusColor[req.status]}`}>{req.status}</span>
                      {req.status === 'Quoted' && (
                        <span className="text-xs text-[#7a9e9f] font-600">Quote ready — tap to review</span>
                      )}
                    </div>
                    <p className="text-sm font-600">{req.shippingMethod} Freight</p>
                    <p className="text-xs text-muted-foreground font-tabular mt-0.5">{req.orderId}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{req.weight || '—'} KG</span>
                      <span>{req.cbm || '—'} CBM</span>
                      <span>{new Date(req.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    {req.status === 'Pending' && <Clock className="w-4 h-4" />}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
