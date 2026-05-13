'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockOrders } from '@/lib/mockData';
import { Search, MapPin, Eye } from 'lucide-react';

const statusFilters = ['All', 'Active', 'Completed', 'Exception'];

export default function AllOrdersPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => mockOrders.filter(o => {
    const matchesSearch = !q || o.orderId.toLowerCase().includes(q.toLowerCase()) || (o.itemNames || '').toLowerCase().includes(q.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Completed') return o.status === 'Completed';
    if (filter === 'Exception') return o.status === 'Exception';
    if (filter === 'Active') return !['Completed', 'Exception'].includes(o.status as string);
    return true;
  }), [q, filter]);

  return (
    <ClientShell>
      <div className="mb-6">
        <h1 className="text-2xl font-700 text-foreground">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all your sourcing orders</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} className="input-field pl-9" placeholder="Search by order ID or item..." />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field sm:w-44">
          {statusFilters.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                {['Order ID', 'Date', 'Items', 'Amount', 'Est. Delivery', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders match your filters.</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="table-row-hover">
                  <td className="px-4 py-3.5"><span className="text-sm font-600 text-primary font-tabular">{o.orderId}</span></td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground font-tabular">{o.date}</td>
                  <td className="px-4 py-3.5"><div><p className="text-sm font-500">{o.itemCount} items</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{o.itemNames}</p></div></td>
                  <td className="px-4 py-3.5"><div><p className="text-sm font-600 font-tabular">{o.amount}</p><p className="text-[11px] text-muted-foreground font-tabular">{o.amountCny}</p></div></td>
                  <td className="px-4 py-3.5 text-xs font-500 font-tabular text-muted-foreground">{o.estimatedDelivery}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={o.status as any} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/client-dashboard/orders/${o.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-accent border border-accent/30 rounded-lg hover:bg-accent/10"><Eye className="w-3.5 h-3.5" /> View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClientShell>
  );
}
