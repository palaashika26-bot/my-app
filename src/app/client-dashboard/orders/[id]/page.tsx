'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import ShipmentMapModal from '@/components/ShipmentMapModal';
import { mockOrders, statusToLocation } from '@/lib/mockData';
import { ArrowLeft, Download, AlertTriangle, MapPin, CheckCircle2, Circle, FileText, Info, Camera, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { notFound } from 'next/navigation';

const stages = ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'China Consolidation Warehouse', 'Repacking/QC', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking/QC': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };

// Mock repackaging photos — gallery shown when client clicks "View Repackaged Product"
const repackPhotos = [
  { id: 1, emoji: '📦', label: 'Sealed outer carton',     bg: 'bg-gradient-to-br from-amber-100 to-orange-200', note: 'Reinforced corrugated carton with EliosWholesale tape seal' },
  { id: 2, emoji: '🔍', label: 'QC inspection',           bg: 'bg-gradient-to-br from-cyan-100 to-blue-200',    note: 'Random sample tested for power, finish, packaging integrity' },
  { id: 3, emoji: '💡', label: 'Product close-up',        bg: 'bg-gradient-to-br from-yellow-100 to-amber-200', note: 'LED Strip Light (RGB, 5m) — colour rendering verified' },
  { id: 4, emoji: '📋', label: 'Item count & labels',     bg: 'bg-gradient-to-br from-emerald-100 to-green-200', note: '50 units counted, SKU label affixed, packing list inside' },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = mockOrders.find(o => o.id === id);
  const [mapOpen, setMapOpen] = useState(false);
  const [repackOpen, setRepackOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  if (!order) return notFound();
  const currentStage = stageMap[order.status] ?? -1;
  const hasMap = !!statusToLocation[order.status];
  // Repackaging photos available once Repacking/QC stage (index 5) has been reached
  const repackingDone = currentStage >= 5;

  const items = [
    { name: 'LED Strip Light (RGB, 5m)', qty: 50,  unitInr: 504,   totalInr: 25200 },
    { name: 'USB-C Cable (Braided)',     qty: 100, unitInr: 96,    totalInr: 9600 },
    { name: 'Wireless Earbuds',          qty: 25,  unitInr: 1056,  totalInr: 26400 },
  ];

  function openPhoto(i: number) { setPhotoIdx(i); setRepackOpen(true); }
  function prevPhoto() { setPhotoIdx((p) => (p - 1 + repackPhotos.length) % repackPhotos.length); }
  function nextPhoto() { setPhotoIdx((p) => (p + 1) % repackPhotos.length); }

  return (
    <ClientShell>
      <Link href="/client-dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Orders</Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="font-tabular font-700 text-foreground">{order.orderId}</span><StatusBadge status={order.status as any} /></div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {order.date} • ETA: {order.estimatedDelivery}</p>
        </div>
        {hasMap && (
          <button onClick={() => setMapOpen(true)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> View Live Location</button>
        )}
      </div>

      {order.status === 'Exception' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-600 text-red-800">Exception flagged</p>
            <p className="text-xs text-red-700 mt-1">Supplier reported short stock for 2 items. Our team is sourcing replacements.</p>
          </div>
          <button className="text-xs font-600 text-red-700 hover:text-red-800">Contact Admin</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-4">Shipment Timeline</h3>
            <ol className="space-y-3">
              {stages.map((s, i) => {
                const done = i <= currentStage;
                const current = i === currentStage;
                const isRepack = s === 'Repacking/QC';
                const showRepackBtn = isRepack && repackingDone;
                return (
                  <li key={s} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : current ? 'bg-accent text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${current ? 'font-700 text-accent' : done ? 'font-500 text-foreground' : 'font-500 text-muted-foreground'}`}>{s}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {current && hasMap && (
                          <button onClick={() => setMapOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-accent font-600 hover:underline">
                            <MapPin className="w-3 h-3" /> View on Map
                          </button>
                        )}
                        {showRepackBtn && (
                          <button onClick={() => openPhoto(0)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-600 bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors">
                            <Camera className="w-3 h-3" /> View Repackaged Product
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {repackingDone && (
              <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border italic">
                Tip: Once your goods are repackaged & QC-cleared at the China warehouse, you can review photos here before they ship to India.
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                  <th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th><th className="text-right font-600">Unit Price</th><th className="text-right font-600">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {items.map(it => (
                    <tr key={it.name}><td className="py-3 font-500">{it.name}</td><td className="text-right font-tabular">{it.qty}</td><td className="text-right font-tabular">₹{it.unitInr.toLocaleString()}</td><td className="text-right font-tabular font-600">₹{it.totalInr.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Cost</span><span className="font-tabular font-500">₹61,200</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Logistics (Sea)</span><span className="font-tabular font-500">₹8,160</span></div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-2 mt-1">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Indian Exchange Rate</span>
                <span className="font-tabular text-xs text-muted-foreground">1 CNY = ₹12.0</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between"><span className="font-700">Total</span><p className="font-700 font-tabular text-foreground">₹69,360</p></div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Documents</h3>
            <ul className="space-y-2">
              {['Commercial Invoice', 'Packing List', 'Bill of Lading'].map(d => (
                <li key={d} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{d}</span>
                  <button className="text-accent text-xs font-600 hover:underline inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ShipmentMapModal isOpen={mapOpen} onClose={() => setMapOpen(false)} order={{ orderId: order.orderId, status: order.status as string, estimatedDelivery: order.estimatedDelivery }} />

      {/* Repackaged Product Photo Gallery Modal */}
      {repackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in" onClick={() => setRepackOpen(false)} role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-card-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <div className="flex items-center gap-2"><Camera className="w-5 h-5 text-accent" /><h3 className="font-700">Repackaged Product Photos</h3></div>
                <p className="text-xs text-muted-foreground mt-0.5">Order {order.orderId} • QC verified at China warehouse</p>
              </div>
              <button onClick={() => setRepackOpen(false)} aria-label="Close" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5">
              {/* Main photo */}
              <div className="relative">
                <div className={`aspect-video rounded-xl ${repackPhotos[photoIdx].bg} flex items-center justify-center text-8xl shadow-inner`}>
                  <span aria-hidden="true">{repackPhotos[photoIdx].emoji}</span>
                </div>
                <button onClick={prevPhoto} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white" aria-label="Previous photo">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextPhoto} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white" aria-label="Next photo">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="absolute top-3 right-3 badge bg-white/90 text-foreground font-600">
                  <ZoomIn className="w-3 h-3 mr-1" /> {photoIdx + 1} / {repackPhotos.length}
                </span>
              </div>

              {/* Caption */}
              <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border">
                <p className="font-600 text-foreground">{repackPhotos[photoIdx].label}</p>
                <p className="text-xs text-muted-foreground mt-1">{repackPhotos[photoIdx].note}</p>
                <p className="text-[11px] text-muted-foreground mt-2 font-tabular">📅 Captured: 10 May 2026 • 14:22 CST • Shenzhen Consolidation Warehouse</p>
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {repackPhotos.map((p, i) => (
                  <button key={p.id} onClick={() => setPhotoIdx(i)} className={`aspect-square rounded-lg ${p.bg} flex items-center justify-center text-3xl transition-all ${i === photoIdx ? 'ring-2 ring-accent ring-offset-2' : 'opacity-60 hover:opacity-100'}`} aria-label={p.label}>
                    {p.emoji}
                  </button>
                ))}
              </div>

              {/* Approve / Flag */}
              <div className="mt-5 flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
                <button className="btn-primary flex-1 py-2.5 text-sm inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Looks good — Approve for Shipping
                </button>
                <button className="btn-secondary flex-1 py-2.5 text-sm">
                  Flag an issue
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-3">Photos are stored for 90 days after delivery as part of your order record.</p>
            </div>
          </div>
        </div>
      )}
    </ClientShell>
  );
}
