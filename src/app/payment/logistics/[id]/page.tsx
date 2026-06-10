'use client';
import React, { useState, useRef, useCallback, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, FileImage, Check, Copy, CheckCheck, Building2, CreditCard } from 'lucide-react';
import { logisticsApi } from '@/lib/api/logistics.api';
import { paymentsApi } from '@/lib/api/payments.api';

const BANK_ACCOUNTS = [
  {
    id: 'hdfc',
    bankName: 'HDFC Bank',
    tag: 'BUSINESS',
    accountHolder: 'ELIOS WHOLESALE',
    accountNumber: '50200106917504',
    ifsc: 'HDFC0000002',
    branch: 'Khar West',
    accountType: 'Current Account',
    upiId: '8591055209@hdfc',
  },
  {
    id: 'kotak',
    bankName: 'Kotak Mahindra Bank',
    tag: null,
    accountHolder: 'Ishmeen Ravneet Bhasin',
    accountNumber: '4650053157',
    ifsc: 'KKBK0000667',
    branch: 'Mumbai - Khar (West)',
    accountType: 'Savings Account',
    upiId: '8433703555@kotak',
  },
] as const;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} title={copied ? 'Copied!' : 'Copy'} className="ml-2 p-1 rounded hover:bg-muted transition-colors flex-shrink-0">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function LogisticsPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logisticsReq, setLogisticsReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofName, setProofName] = useState('');
  const [proofSize, setProofSize] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState<'full' | 'advance'>('full');

  const fetchReq = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi.getById(id, signal)
      .then(r => {
        const d = r.data?.data;
        if (!d) { setNotFound(true); return; }
        setLogisticsReq(d);
      })
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') {
          if (err?.response?.status === 404) setNotFound(true);
          else setError('Failed to load logistics request.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    fetchReq(ac.signal);
    paymentsApi.getLogisticsPayments(id)
      .then(r => { if (r.data?.data) setExistingPayments(r.data.data); })
      .catch(() => {});
    return () => ac.abort();
  }, [fetchReq, id]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      addToast({ type: 'error', title: 'Invalid file type', description: 'JPG, PNG or WEBP only.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'File too large', description: 'Maximum file size is 5 MB.' });
      return;
    }
    setProofName(file.name);
    setProofSize(file.size);
    const reader = new FileReader();
    reader.onload = ev => setProofDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function submit() {
    if (!proofDataUrl || !logisticsReq) return;
    setSubmitting(true);
    setError(null);
    try {
      await paymentsApi.submitLogisticsPayment({
        logisticsRequestId: id,
        type: paymentMode === 'full' ? 'FULL' : 'ADVANCE',
        amountINR: paymentMode === 'advance' ? Math.round(Number(logisticsReq.estimatedPriceINR) * 0.75) : Number(logisticsReq.estimatedPriceINR),
        proofImageBase64: proofDataUrl,
        proofFileName: proofName || undefined,
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.push('/client-dashboard/logistics'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading…</div>
      </ClientLayout>
    );
  }

  if (notFound || !logisticsReq) {
    return (
      <ClientLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground font-500">Logistics request not found.</p>
          <Link href="/client-dashboard/logistics" className="btn-primary mt-4 inline-block px-4 py-2 text-sm">Back to Logistics</Link>
        </div>
      </ClientLayout>
    );
  }

  const amountINR = Number(logisticsReq.estimatedPriceINR);
  const hasExistingPayments = existingPayments.length > 0;

  return (
    <ClientLayout>
      <Link href={`/client-dashboard/logistics/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Logistics Request
      </Link>
      <h1 className="text-2xl font-700 mb-1">Make Payment</h1>
      <p className="text-sm text-muted-foreground mb-6">Transfer the amount to our bank account and upload proof below.</p>

      {submitted && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-600 text-emerald-800">Payment proof submitted successfully!</p>
            <p className="text-sm text-emerald-700 mt-0.5">Our team will verify within 24 hours.</p>
            <p className="text-xs text-emerald-600 mt-1">Redirecting to Logistics…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left — Order Summary */}
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h2 className="font-700 mb-1">Shipment Summary</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Request: <span className="font-tabular font-600 text-foreground">{logisticsReq.requestNumber || id}</span>
            </p>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Shipping Method</span>
                <span className="font-600">{logisticsReq.shippingMethod}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="font-600">{logisticsReq.weightKg ? `${Number(logisticsReq.weightKg)} KG` : '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="font-600">{logisticsReq.volumeCbm ? `${Number(logisticsReq.volumeCbm)} CBM` : '—'}</span>
              </div>
              {logisticsReq.carrier && (
                <div className="flex justify-between py-2 border-b border-border/60">
                  <span className="text-sm text-muted-foreground">Carrier</span>
                  <span className="font-600">{logisticsReq.carrier}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <span className="font-700">Total Amount</span>
              <span className="font-700 font-tabular text-xl text-[#4A3B52]">
                ₹{amountINR.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-[#4A3B52]/5 border border-[#4A3B52]/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#4A3B52] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-600 text-foreground">Payment Options</p>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <input type="radio" name="payMode" checked={paymentMode === 'full'} onChange={() => setPaymentMode('full')} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-600">Pay Full Amount</p>
                      <p className="text-base font-700 font-tabular text-[#4A3B52]">₹{amountINR.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">Pay everything now</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <input type="radio" name="payMode" checked={paymentMode === 'advance'} onChange={() => setPaymentMode('advance')} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-600">Pay Advance (75%)</p>
                      <p className="text-base font-700 font-tabular text-[#4A3B52]">₹{(amountINR * 0.75).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">Balance due before shipping</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {hasExistingPayments && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              {existingPayments.some(p => p.status === 'VERIFIED')
                ? 'Payment already processed for this shipment.'
                : existingPayments.some(p => p.status === 'SUBMITTED')
                ? 'You have a pending payment submission awaiting verification.'
                : 'Previous payment records found.'}
            </div>
          )}
        </div>

        {/* Right — Bank Details + Upload */}
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h2 className="font-700 mb-1">Bank Details</h2>
            <p className="text-xs text-muted-foreground mb-4">Transfer to any one of the following accounts.</p>
            <div className="space-y-4">
              {BANK_ACCOUNTS.map(acct => (
                <div key={acct.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#4A3B52]" />
                      <span className="font-600 text-sm">{acct.bankName}</span>
                    </div>
                    {acct.tag && (
                      <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-[#4A3B52] text-white tracking-wide">{acct.tag}</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Account Name</span>
                      <span className="font-500">{acct.accountHolder}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Account No.</span>
                      <div className="flex items-center"><span className="font-tabular font-600">{acct.accountNumber}</span><CopyButton value={acct.accountNumber} /></div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">IFSC Code</span>
                      <div className="flex items-center"><span className="font-tabular font-600">{acct.ifsc}</span><CopyButton value={acct.ifsc} /></div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Branch</span>
                      <span className="font-500 text-right">{acct.branch}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Account Type</span>
                      <span className="font-500">{acct.accountType}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                      <span className="text-muted-foreground text-xs">UPI ID</span>
                      <div className="flex items-center"><span className="font-tabular font-600 text-[#4A3B52]">{acct.upiId}</span><CopyButton value={acct.upiId} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload section */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h2 className="font-700 mb-1">Upload Payment Proof</h2>
            <p className="text-xs text-muted-foreground mb-4">Upload a screenshot or photo of your payment confirmation.</p>

            {proofDataUrl ? (
              <div className="space-y-3">
                <img src={proofDataUrl} alt="Payment proof preview" className="w-full max-h-52 object-contain rounded-xl border border-border bg-muted" />
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground truncate max-w-[180px] inline-block">{proofName}</span>
                    {proofSize > 0 && <span className="text-muted-foreground ml-2">({(proofSize / 1024).toFixed(0)} KB)</span>}
                  </div>
                  <button onClick={() => { setProofDataUrl(null); setProofName(''); setProofSize(0); }} className="text-muted-foreground hover:text-red-500 ml-2 flex-shrink-0">✕ Remove</button>
                </div>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-[#4A3B52]/50 hover:bg-[#4A3B52]/5 transition-colors">
                <FileImage className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                <p className="text-xs text-muted-foreground">JPG, PNG accepted — Max 5 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

            <div className="mt-4">
              <label className="text-xs font-600 text-muted-foreground mb-1.5 block">
                Notes <span className="font-400">(optional)</span>
              </label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} placeholder="Transaction ID or any notes" className="input-field w-full text-sm" />
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
              <p className="text-xs font-600 text-amber-800">
                Once payment is submitted, please allow up to 24 hours for verification. Our team will confirm receipt.
              </p>
            </div>

            <button
              onClick={submit}
              disabled={!proofDataUrl || submitting || submitted}
              className="btn-primary w-full py-3 mt-4 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
                : <><Check className="w-4 h-4" /> Submit Payment Proof</>}
            </button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
