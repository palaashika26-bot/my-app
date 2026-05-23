'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  priceCny: string;
  moq: number;
  images: string[];
  emoji?: string;
  bg?: string;
}

function getProductFromStorage(id: string): AdminProduct | null {
  try {
    const raw = localStorage.getItem('bk-catalog-products');
    const list: AdminProduct[] = JSON.parse(raw || '[]');
    return list.find(p => String(p.id) === id || String(p.id) === decodeURIComponent(id)) ?? null;
  } catch {
    return null;
  }
}

const DELIVERY_OPTIONS = ['ASAP', '2–4 weeks', '1–2 months', 'Flexible'];

export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState('');
  const [delivery, setDelivery] = useState('Flexible');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  useEffect(() => {
    const p = getProductFromStorage(id);
    setProduct(p);
    if (p) setQty(String(p.moq));
    setLoading(false);
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    const rid = `BK-REQ-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    setRequestId(rid);
    addToast({
      type: 'success',
      title: 'Quotation request submitted',
      description: `${rid} created. Our team will contact you within 24 hours.`,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ClientLayout>
        <div className="max-w-lg mx-auto animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </ClientLayout>
    );
  }

  // ── Product not found ───────────────────────────────────────────────────────
  if (!product) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-700 mb-2">Product not found</h2>
          <p className="text-sm text-muted-foreground mb-6">We couldn&apos;t load the product details.</p>
          <Link href="/catalog" className="btn-primary px-8 py-3 text-sm">Back to Catalog</Link>
        </div>
      </ClientLayout>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <ClientLayout>
        <div className="max-w-lg mx-auto pt-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-700 mb-2">Request Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-1">Your request ID</p>
          <p className="text-lg font-700 text-[#4A3B52] mb-4">{requestId}</p>
          <p className="text-sm text-muted-foreground mb-8">Our team will contact you within 24 hours.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push(`/catalog/${id}`)} className="btn-secondary px-6 py-3 text-sm">Back to Product</button>
            <button onClick={() => router.push('/catalog')} className="btn-primary px-6 py-3 text-sm">Continue Browsing</button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <ClientLayout>
      {/*
        On mobile: fixed topbar (64px) + fixed bottom nav (64px).
        We use a flex column that fills the available space so the
        form scrolls inside and the submit button stays pinned at bottom.
      */}
      <div
        className="flex flex-col max-w-lg mx-auto"
        style={{ minHeight: 'calc(100vh - 64px - 56px - 32px)' }}
      >
        {/* ── Scrollable area ── */}
        <div className="flex-1">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Product
          </button>

          {/* Breadcrumb — desktop only */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-[#888888] mb-5 flex-wrap">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link href="/catalog" className="hover:text-foreground">Product Catalog</Link>
            <span>/</span>
            <Link href={`/catalog/${id}`} className="hover:text-foreground truncate max-w-[120px]">{product.name}</Link>
            <span>/</span>
            <span className="text-foreground font-500">Request Quotation</span>
          </nav>

          <h1 className="text-2xl font-700 text-[#111111] mb-5">Request Quotation</h1>

          {/* Product card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F8F9F9] border border-[#e5e5e5] mb-5">
            <div className={`w-14 h-14 rounded-xl ${product.bg ?? 'bg-[#e4eeee]'} flex items-center justify-center text-3xl overflow-hidden flex-shrink-0`}>
              {product.images?.[0]
                ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                : <span className="select-none">{product.emoji ?? '📦'}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-700 text-[#111111] text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
              <p className="text-sm font-700 text-[#4A3B52] mt-0.5">
                {product.priceCny} <span className="text-xs font-500 text-muted-foreground">/ unit • MOQ {product.moq}</span>
              </p>
            </div>
          </div>

          {/* Form fields */}
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-4">

            {/* Quantity */}
            <div>
              <label className="text-xs font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">
                Quantity Needed
              </label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                min={product.moq}
                required
                className="input-field"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Minimum order: {product.moq} units</p>
            </div>

            {/* Specs */}
            <div>
              <label className="text-xs font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">
                Specs / Customization Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Colour, branding, packaging, material requirements..."
              />
            </div>

            {/* Budget */}
            <div>
              <label className="text-xs font-700 text-muted-foreground uppercase tracking-wide block mb-1.5">
                Target Budget INR <span className="text-muted-foreground/60 normal-case font-500">(optional)</span>
              </label>
              <input
                type="text"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="input-field"
                placeholder="e.g. ₹50,000"
              />
            </div>

            {/* Delivery */}
            <div>
              <label className="text-xs font-700 text-muted-foreground uppercase tracking-wide block mb-2">
                Delivery Timeline
              </label>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDelivery(opt)}
                    className={`px-4 py-2 rounded-xl border text-sm font-600 transition-colors ${
                      delivery === opt
                        ? 'bg-[#4A3B52] text-white border-[#4A3B52]'
                        : 'border-border text-muted-foreground hover:border-[#4A3B52]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </form>

          {/* Spacer so content isn't hidden behind submit button */}
          <div className="h-6" />
        </div>

        {/* ── Pinned submit button ── */}
        <div className="flex-shrink-0 pt-3 pb-2 bg-background border-t border-[#e5e5e5]">
          <button
            type="submit"
            form="quote-form"
            disabled={submitting}
            className="btn-primary w-full py-3.5 text-sm font-700"
          >
            {submitting ? 'Submitting...' : 'Submit Quotation Request'}
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}
