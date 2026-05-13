'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import ShipmentMapModal from '@/components/ShipmentMapModal';
import { mockOrders, statusToLocation } from '@/lib/mockData';
import { ArrowLeft, Download, AlertTriangle, MapPin, CheckCircle2, Circle, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';

const stages = ['Order Placed', 'Payment Confirmed', 'Sourcing', 'At China Warehouse', 'Repacking/QC', 'Shipped from China', 'In Transit', 'Arrived India Warehouse', 'Out for Delivery', 'Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'Repacking/QC': 4, 'Shipped from China': 5, 'In Transit': 6, 'Arrived India Warehouse': 7, 'Out for Delivery': 8, 'Completed': 9 };

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = mockOrders.find(o => o.id === id);
  const [mapOpen, setMapOpen] = useState(false);
  if (!order) return notFound();
  const currentStage = stageMap[order.status] ?? -1;
  const hasMap = !!statusToLocation[order.status];

  const items = [
    { name: 'LED Strip Light (RGB, 5m)', qty: 50, unitCny: 42, totalCny: 2100, totalInr: 25200 },
    { name: 'USB-C Cable (Braided)',     qty: 100, unitCny: 8, totalCny: 800, totalInr: 9600 },
    { name: 'Wireless Earbuds',          qty: 25, unitCny: 88, totalCny: 2200, totalInr: 26400 },
  ];

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
                return (
                  <li key={s} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : current ? 'bg-accent text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${current ? 'font-700 text-accent' : done ? 'font-500 text-foreground' : 'font-500 text-muted-foreground'}`}>{s}</p>
                      {current && hasMap && <button onClick={() => setMapOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent font-600 hover:underline"><MapPin className="w-3 h-3" /> View on Map</button>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                  <th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th><th className="text-right font-600">Unit (CNY)</th><th className="text-right font-600">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {items.map(it => (
                    <tr key={it.name}><td className="py-3 font-500">{it.name}</td><td className="text-right font-tabular">{it.qty}</td><td className="text-right font-tabular">¥{it.unitCny}</td><td className="text-right font-tabular font-600">¥{it.totalCny.toLocaleString()} <span className="text-[11px] text-muted-foreground">(₹{it.totalInr.toLocaleString()})</span></td></tr>
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
              {[{ l: 'Product Cost (CNY)', v: '¥5,100' }, { l: 'EliosWholesale Service Fee (8%)', v: '¥408' }, { l: 'Logistics (Sea)', v: '¥680' }, { l: 'Customs Duty (Est.)', v: '₹6,800' }].map(r => (
                <div key={r.l} className="flex items-center justify-between"><span className="text-muted-foreground">{r.l}</span><span className="font-tabular font-500">{r.v}</span></div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between"><span className="font-700">Total</span><div className="text-right"><p className="font-700 font-tabular text-foreground">{order.amount}</p><p className="text-[11px] text-muted-foreground font-tabular">{order.amountCny}</p></div></div>
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
    </ClientShell>
  );
}
