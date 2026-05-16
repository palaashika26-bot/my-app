'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockAdminOrders, statusToLocation, carrierForOrder } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { MapPin, Eye, RefreshCw } from 'lucide-react';

export default function AdminLogisticsPage() {
  const { addToast } = useToast();
  const shipments = mockAdminOrders.filter(o => statusToLocation[o.status as string]);
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? shipments : shipments.filter(s => (carrierForOrder(s.orderId).mode === filter));
  const active = shipments.length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-700">Logistics & Shipments</h1><p className="text-sm text-muted-foreground mt-1">{active} active shipments in the pipeline</p></div>
        <div className="flex gap-1">
          {['All','Sea Freight','Air Freight','Express'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-600 ${filter === f ? 'bg-accent text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{f}</button>)}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <h3 className="font-700 mb-3">Network Map</h3>
        <div className="aspect-[16/6] rounded-xl bg-gradient-to-br from-cyan-50 via-orange-50 to-emerald-50 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #06B6D4 0%, transparent 12%), radial-gradient(circle at 70% 50%, #10B981 0%, transparent 12%)' }} />
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-2 text-5xl"><span>🇨🇳</span><span className="text-3xl">──▶──</span><span>🇮🇳</span></div>
            <p className="mt-2 text-sm font-600 text-foreground">{active} shipments • China → India</p>
            <p className="text-xs text-muted-foreground">Live map integration coming soon</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground">
            <th className="px-3 py-3 text-left font-600">Tracking ID</th><th className="px-3 py-3 text-left font-600">Order ID</th><th className="px-3 py-3 text-left font-600">Client</th><th className="px-3 py-3 text-left font-600">Carrier</th><th className="px-3 py-3 text-left font-600">Current Location</th><th className="px-3 py-3 text-left font-600">ETA</th><th className="px-3 py-3 text-left font-600">Status</th><th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(s => {
              const c = carrierForOrder(s.orderId); const loc = statusToLocation[s.status as string];
              return (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-3 py-3 font-tabular font-600">{c.trackingNo}</td>
                  <td className="px-3 py-3"><Link href={`/admin/orders/${s.id}`} className="font-tabular text-primary font-600 hover:text-accent">{s.orderId}</Link></td>
                  <td className="px-3 py-3 text-sm">{s.client}</td>
                  <td className="px-3 py-3"><p className="text-sm">{c.carrier}</p><p className="text-[11px] text-muted-foreground">{c.mode}</p></td>
                  <td className="px-3 py-3"><p className="text-sm">{loc.label}</p><div className="w-24 h-1 mt-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-orange-500" style={{ width: `${loc.progress}%` }} /></div></td>
                  <td className="px-3 py-3 text-xs font-tabular">{s.estimatedDelivery}</td>
                  <td className="px-3 py-3"><StatusBadge status={s.status as any} /></td>
                  <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => addToast({ type: 'success', title: 'Location updated' })} className="p-1.5 rounded-md hover:bg-muted" title="Update Location"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <Link href={`/admin/shipments/tracking/${s.id}`} className="p-1.5 rounded-md hover:bg-muted text-accent" title="View Tracking"><MapPin className="w-3.5 h-3.5" /></Link>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </AdminLayout>
  );
}
