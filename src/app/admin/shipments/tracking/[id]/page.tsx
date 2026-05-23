'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients, statusToLocation, carrierForOrder } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, MapPin, Copy, Check, RefreshCw } from 'lucide-react';
import { notFound } from 'next/navigation';

const statusOptions: OrderStatus[] = ['Sourcing','At China Warehouse','Repacking Warehouse','Shipped from China','Arrived India Warehouse','Out for Delivery','Completed','Exception'];

export default function AdminShipmentTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const order = mockAdminOrders.find(o => o.id === id);
  if (!order) return notFound();
  const client = mockClients.find(c => c.name === order.client);
  const [status, setStatus] = useState(order.status as string);
  const [copied, setCopied] = useState(false);
  const carrier = carrierForOrder(order.orderId);
  const loc = statusToLocation[status] ?? { label: 'Pre-shipment', progress: 10, query: 'Shenzhen China' };
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(loc.query || 'Shenzhen China')}&z=4&output=embed`;

  const checkpoints = [
    { date: '08 May 2026', text: 'Departed Shenzhen Port', done: loc.progress >= 35 },
    { date: '09 May 2026', text: 'Entered South China Sea', done: loc.progress >= 45 },
    { date: '10 May 2026', text: 'Passing Strait of Malacca', done: loc.progress >= 55 },
    { date: '11 May 2026', text: `In ${loc.label}`, done: loc.progress >= 60, current: loc.progress >= 45 && loc.progress < 80 },
    { date: '13 May 2026', text: 'Expected: JNPT Mumbai Port', done: loc.progress >= 80 },
    { date: '14 May 2026', text: 'Expected: Customs Clearance', done: loc.progress >= 90 },
    { date: '15 May 2026', text: 'Expected: Delivered', done: loc.progress >= 100 },
  ];

  function updateStatus(s: string) { setStatus(s); addToast({ type: 'success', title: 'Tracking status updated', description: `Now: ${s}` }); }
  function copyTracking() { navigator.clipboard?.writeText(carrier.trackingNo); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return (
    <AdminLayout>
      <Link href="/admin/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Logistics</Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-3"><MapPin className="w-5 h-5 text-[#4A3B52]" /><h1 className="text-xl font-700">Live Tracking — {order.orderId}</h1><StatusBadge status={status as any} /></div><p className="text-xs text-muted-foreground mt-1">{order.client} • {client?.email}</p></div>
        <div className="flex gap-2"><select value={status} onChange={e => updateStatus(e.target.value)} className="input-field text-sm py-2 min-w-[200px]">{statusOptions.map(s => <option key={s}>{s}</option>)}</select><button onClick={() => addToast({ type: 'success', title: 'Location refreshed' })} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-3"><iframe src={mapUrl} width="100%" height="380" style={{ border: 0, borderRadius: 12 }} loading="lazy" title="Map" /></div>
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Checkpoints</h3>
            <ol className="space-y-2.5">{checkpoints.map((c, i) => <li key={i} className="flex items-start gap-3 text-sm"><span className="w-5">{c.done ? '✅' : c.current ? '🔄' : '⏳'}</span><div className="flex-1"><p className={`font-500 ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.text}</p><p className="text-[10px] text-muted-foreground font-tabular">{c.date}</p></div></li>)}</ol>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Carrier Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{carrier.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{carrier.mode}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Tracking</span><div className="flex items-center gap-2"><span className="font-tabular font-500">{carrier.trackingNo}</span><button onClick={copyTracking}>{copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}</button></div></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular font-500">{order.estimatedDelivery}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-500">{loc.label}</span></div>
              <div className="pt-2 border-t border-border"><p className="text-[10px] uppercase text-muted-foreground mb-1">Progress</p><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-[#1A1423]" style={{ width: `${loc.progress}%` }} /></div><p className="text-[11px] text-muted-foreground mt-1 font-tabular">{loc.progress}% complete</p></div>
            </div>
          </div>
          <button onClick={() => addToast({ type: 'success', title: 'Client notified', description: `Status sent to ${client?.email}` })} className="btn-primary w-full py-2.5 text-sm">Notify Client of Update</button>
        </div>
      </div>
    </AdminLayout>
  );
}
