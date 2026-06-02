'use client';
import React, { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, FileImage, Check, Copy, CheckCheck, Building2, CreditCard } from 'lucide-react';
import { requestsApi } from '@/lib/api/requests.api';
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
    <button
      onClick={copy}
      title={copied ? 'Copied!' : 'Copy'}
      className="ml-2 p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
    >
      {copied
        ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function PaymentPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofName, setProofName] = useState('');
  const [proofSize, setProofSize] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'full' | 'advance'>('advance');
  const [customAdvanceInput, setCustomAdvanceInput] = useState('');
  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const modeInitialized = useRef(false);

  useEffect(() => {
    requestsApi.getRequestById(requestId)
      .then(res => {
        if (res.data?.data) setRequest(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  // Once the request loads: set the sensible default payment mode and fetch existing payments.
  useEffect(() => {
    if (!request) return;
    if (!modeInitialized.current) {
      modeInitialized.current = true;
      // Case 1: staff set advance → default to advance option.
      // Case 2: no advance set → default to full payment.
      setPaymentMode(request.advanceAmountINR ? 'advance' : 'full');
    }
    paymentsApi.getRequestPayments(requestId)
      .then(r => { if (r.data?.data) setExistingPayments(r.data.data); })
      .catch(() => {});
  }, [request?.id, requestId]);

  const acceptedItems: any[] = request
    ? (request.items ?? []).filter(
        (item: any) => item.clientResponse === 'ACCEPTED' || item.status === 'ACCEPTED'
      )
    : [];

  const totalINR = acceptedItems.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.quotedINR || '0') * item.quantity),
    0
  );

  const staffSetAdvance = request?.advanceAmountINR ? parseFloat(request.advanceAmountINR) : null;

  // Case 3: detect if an advance was already verified — client now owes the balance.
  const verifiedAdvancePayment = existingPayments.find(p => p.type === 'ADVANCE' && p.status === 'VERIFIED');
  const isBalancePayment = !!verifiedAdvancePayment;
  const advancePaid = isBalancePayment ? parseFloat(verifiedAdvancePayment.amountINR || '0') : 0;
  const remainingBalance = Math.max(0, totalINR - advancePaid);

  const paymentAmount: number = (() => {
    if (isBalancePayment) return remainingBalance;
    if (paymentMode === 'full') return totalINR;
    // advance mode:
    if (staffSetAdvance !== null) return staffSetAdvance;
    const parsed = parseFloat(customAdvanceInput.replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      addToast({ type: 'error', title: 'Invalid file type', description: 'JPG or PNG only.' });
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
    if (!proofDataUrl || !request) return;
    if (paymentAmount <= 0) {
      addToast({ type: 'error', title: 'Enter a valid amount', description: 'Please enter the payment amount.' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await paymentsApi.submitRequestPayment({
        requestId,
        type: (isBalancePayment || paymentMode === 'full') ? 'FULL' : 'ADVANCE',
        amountINR: paymentAmount,
        proofImageBase64: proofDataUrl,
        proofFileName: proofName || undefined,
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => router.push('/client-dashboard/requests'), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to submit payment. Please try again.';
      setError(msg);
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

  if (!request) {
    return (
      <ClientLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground font-500">Request not found.</p>
          <Link href="/client-dashboard/requests" className="btn-primary mt-4 inline-block px-4 py-2 text-sm">Back to Requests</Link>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <Link href={`/client-dashboard/requests/${requestId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Request
      </Link>
      <h1 className="text-2xl font-700 mb-1">Make Payment</h1>
      <p className="text-sm text-muted-foreground mb-6">Transfer the amount to our bank account and upload proof below.</p>

      {submitted && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-600 text-emerald-800">Payment proof submitted successfully!</p>
            <p className="text-sm text-emerald-700 mt-0.5">Our team will verify within 24 hours. You will receive an email confirmation when your order is created.</p>
            <p className="text-xs text-emerald-600 mt-1">Redirecting to My Requests…</p>
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
            <h2 className="font-700 mb-1">Order Summary</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Request: <span className="font-tabular font-600 text-foreground">{request.requestNumber}</span>
            </p>
            <div className="divide-y divide-border">
              {acceptedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No accepted items found. Please go back and accept at least one item.</p>
              ) : (
                acceptedItems.map((item: any) => {
                  const unitPrice = parseFloat(item.quotedINR || '0');
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-500">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{unitPrice.toLocaleString('en-IN')}</p>
                      </div>
                      <p className="text-sm font-600 font-tabular flex-shrink-0">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border mt-1 pt-4 flex justify-between items-center">
              <span className="font-700">Total Amount</span>
              <span className="font-700 font-tabular text-xl text-[#4A3B52]">
                ₹{totalINR.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment options */}
          <div className="bg-[#4A3B52]/5 border border-[#4A3B52]/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#4A3B52] mt-0.5 flex-shrink-0" />
              <div className="flex-1">

                {/* ── CASE 3: balance payment after verified advance ── */}
                {isBalancePayment ? (
                  <>
                    <p className="font-600 text-foreground">Balance Payment Due</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay this to release your shipment</p>
                    <p className="text-2xl font-700 font-tabular text-[#4A3B52] mt-2">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </p>
                    {advancePaid > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{advancePaid.toLocaleString('en-IN')} advance already paid
                      </p>
                    )}
                  </>

                ) : staffSetAdvance !== null ? (
                  /* ── CASE 1: staff set a specific advance amount ── */
                  <>
                    <p className="font-600 text-foreground">Payment Options</p>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === 'advance'}
                          onChange={() => setPaymentMode('advance')}
                          className="flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-600">Pay Advance</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4A3B52] text-white font-600">Recommended</span>
                          </div>
                          <p className="text-base font-700 font-tabular text-[#4A3B52]">₹{staffSetAdvance.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-muted-foreground">Minimum required to start your order</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === 'full'}
                          onChange={() => setPaymentMode('full')}
                          className="flex-shrink-0"
                        />
                        <div>
                          <p className="text-sm font-600">Pay Full Amount</p>
                          <p className="text-base font-700 font-tabular text-[#4A3B52]">₹{totalINR.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-muted-foreground">Pay everything now, no balance due later</p>
                        </div>
                      </label>
                    </div>
                    {paymentMode === 'advance' && (
                      <p className="text-xs text-muted-foreground mt-2">Remaining balance will be due before shipping</p>
                    )}
                  </>

                ) : (
                  /* ── CASE 2: no advance set — full or custom advance ── */
                  <>
                    <p className="font-600 text-foreground">Payment Options</p>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === 'full'}
                          onChange={() => setPaymentMode('full')}
                          className="flex-shrink-0"
                        />
                        <div>
                          <p className="text-sm font-600">Pay Full Amount</p>
                          <p className="text-base font-700 font-tabular text-[#4A3B52]">₹{totalINR.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-muted-foreground">Pay everything now, no balance due later</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === 'advance'}
                          onChange={() => setPaymentMode('advance')}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-600">Custom Advance</p>
                          <p className="text-xs text-muted-foreground">Enter amount you want to pay now</p>
                          {paymentMode === 'advance' && (
                            <>
                              <div className="mt-2 relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">₹</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={totalINR}
                                  value={customAdvanceInput}
                                  onChange={e => setCustomAdvanceInput(e.target.value)}
                                  placeholder="Enter amount"
                                  className="input-field w-full pl-6 text-sm"
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5">Remaining balance due before shipping</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                    {paymentMode === 'advance' && paymentAmount > 0 && (
                      <p className="text-xs font-600 text-[#4A3B52] mt-2 font-tabular">
                        Amount to pay: ₹{paymentAmount.toLocaleString('en-IN')}
                      </p>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
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
                      <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-[#4A3B52] text-white tracking-wide">
                        {acct.tag}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Account Name</span>
                      <span className="font-500">{acct.accountHolder}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">Account No.</span>
                      <div className="flex items-center">
                        <span className="font-tabular font-600">{acct.accountNumber}</span>
                        <CopyButton value={acct.accountNumber} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">IFSC Code</span>
                      <div className="flex items-center">
                        <span className="font-tabular font-600">{acct.ifsc}</span>
                        <CopyButton value={acct.ifsc} />
                      </div>
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
                      <div className="flex items-center">
                        <span className="font-tabular font-600 text-[#4A3B52]">{acct.upiId}</span>
                        <CopyButton value={acct.upiId} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload section */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h2 className="font-700 mb-1">Upload Payment Proof</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a screenshot or photo of your payment confirmation.
            </p>

            {proofDataUrl ? (
              <div className="space-y-3">
                <img
                  src={proofDataUrl}
                  alt="Payment proof preview"
                  className="w-full max-h-52 object-contain rounded-xl border border-border bg-muted"
                />
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground truncate max-w-[180px] inline-block">{proofName}</span>
                    {proofSize > 0 && (
                      <span className="text-muted-foreground ml-2">({(proofSize / 1024).toFixed(0)} KB)</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setProofDataUrl(null); setProofName(''); setProofSize(0); }}
                    className="text-muted-foreground hover:text-red-500 ml-2 flex-shrink-0"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-[#4A3B52]/50 hover:bg-[#4A3B52]/5 transition-colors"
              >
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
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value.slice(0, 500))}
                placeholder="Transaction ID or any notes"
                className="input-field w-full text-sm"
              />
            </div>

            <button
              onClick={submit}
              disabled={!proofDataUrl || submitting || submitted || acceptedItems.length === 0 || paymentAmount <= 0}
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
