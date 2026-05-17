'use client';
import React, { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, FileImage, Check } from 'lucide-react';
import { mockRequests } from '@/lib/mockData';
import { loadRfqLineItems } from '@/lib/rfqLineItems';
import { savePaymentProof, savePaymentTimestamp } from '@/lib/paymentStore';
import type { RequestLineItem } from '@/lib/mockData';

const BANK_DETAILS = [
  ['Bank Name', 'EliosWholesale Bank'],
  ['Account Name', 'Elios Wholesale Pvt Ltd'],
  ['Account Number', 'XXXXXXXXXXXX'],
  ['IFSC Code', 'XXXX0000000'],
  ['UPI ID', 'elioswholesale@upi'],
] as const;

export default function PaymentPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const req = mockRequests.find(r => r.id === requestId);
  if (!req) return notFound();

  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofName, setProofName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLineItems(loadRfqLineItems(req));
  }, [req.id]);

  const pricedItems = lineItems.filter(l => l.unitPriceInr != null);
  const total = pricedItems.reduce((sum, l) => sum + l.unitPriceInr! * l.quantity, 0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setProofDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function submit() {
    if (!proofDataUrl) {
      addToast({ type: 'warning', title: 'Upload required', description: 'Please upload a payment screenshot before submitting.' });
      return;
    }
    setSubmitting(true);
    savePaymentProof(requestId, proofDataUrl);
    savePaymentTimestamp(requestId);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    router.push(`/payment/${requestId}/receipt`);
  }

  return (
    <ClientShell>
      <Link href={`/client-dashboard/requests/${requestId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Request
      </Link>
      <h1 className="text-2xl font-700 mb-1">Make Payment</h1>
      <p className="text-sm text-muted-foreground mb-6">Transfer the amount to our bank account and upload proof below.</p>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Order summary */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h2 className="font-700 mb-3">Order Summary</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Request ID: <span className="font-tabular font-600 text-foreground">{req.requestId}</span>
          </p>
          <div className="divide-y divide-border">
            {lineItems.map(line => (
              <div key={line.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500">{line.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {line.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {line.unitPriceInr != null ? (
                    <>
                      <p className="text-sm font-600 font-tabular">
                        ₹{(line.unitPriceInr * line.quantity).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{line.unitPriceInr.toLocaleString('en-IN')} / unit
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Price pending</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-1 pt-4 flex justify-between items-center">
            <span className="font-700">Total Amount</span>
            <span className="font-700 font-tabular text-xl text-accent">
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* Bank details */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h2 className="font-700 mb-4">Bank Details</h2>
            <dl className="space-y-3">
              {BANK_DETAILS.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-600 font-tabular text-right">{value}</dd>
                </div>
              ))}
            </dl>
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
                  <span className="text-muted-foreground truncate max-w-[220px]">{proofName}</span>
                  <button
                    onClick={() => { setProofDataUrl(null); setProofName(''); }}
                    className="text-muted-foreground hover:text-red-500 ml-2 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
              >
                <FileImage className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, PDF accepted</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />

            <button
              onClick={submit}
              disabled={!proofDataUrl || submitting}
              className="btn-primary w-full py-3 mt-4 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : <><Check className="w-4 h-4" /> Submit Payment Proof</>}
            </button>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
