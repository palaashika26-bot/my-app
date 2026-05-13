'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import ShipmentMapModal from '@/components/ShipmentMapModal';
import { mockOrders, statusToLocation } from '@/lib/mockData';
import { MapPin, Truck } from 'lucide-react';

const tabs = ['All Shipments', 'Sea Freight', 'Air Freight', 'Delivered'];

export default function LogisticsPage() {
  const [tab, setTab] = useState('All Shipments');
  const [open, setOpen] = useState<typeof mockOrders[0] | null>(null);
  const inTransit = mockOrders.filter(o => statusToLocation[o.status] || o.status === 'Completed');
  const filtered = tab === 'Delivered' ? inTransit.filter(o => o.status === 'Completed') : tab === 'All Shipments' ? inTransit : inTransit;

  return (
    <ClientShell>
      <h1 className="text-2xl font-700 mb-1">Logistics & Tracking</h1>
      <p className="text-sm text-muted-foreground mb-5">Live tracking for all your active shipments</p>
      <div className="flex gap-1 overflow-x-auto mb-5 scrollbar-hide">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${tab === t ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>)}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {filtered.map(o => {
          const loc = statusToLocation[o.status] || { label: 'Delivered', progress: 100 };
          return (
            <div key={o.id} className="bg-card rounded-xl border border-border shadow-card p-4">
              <div className="flex items-center justify-between mb-3"><span className="font-tabular font-700 text-sm">{o.orderId}</span><StatusBadge status={o.status as any} /></div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3"><span>📍 Shenzhen</span> <span>→</span> <span>Mumbai</span></div>
              <div className="mb-3"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-orange-500 transition-all" style={{ width: `${loc.progress}%` }} /></div><p className="text-[11px] text-muted-foreground mt-1">Current: {loc.label} • ETA: {o.estimatedDelivery}</p></div>
              <button onClick={() => setOpen(o)} className="btn-primary w-full py-2 text-xs inline-flex items-center justify-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Track on Map</button>
            </div>
          );
        })}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-6 text-center">
        <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="font-700">Live network map</p>
        <p className="text-xs text-muted-foreground mt-1">All your shipments on one global map — coming soon</p>
      </div>
      {open && <ShipmentMapModal isOpen={!!open} onClose={() => setOpen(null)} order={{ orderId: open.orderId, status: open.status as string, estimatedDelivery: open.estimatedDelivery }} />}
    </ClientShell>
  );
}
