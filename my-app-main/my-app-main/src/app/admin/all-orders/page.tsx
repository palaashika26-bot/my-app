'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { Search, Download, Eye, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { isWarehouseShippingOrderStatus } from '@/lib/staffRoles';

const statusOptions: OrderStatus[] = ['Payment Pending','Payment Confirmed','Sourcing','At China Warehouse','Repacking Warehouse','Ready for Shipping','Shipped from China','Arrived India Warehouse','Out for Delivery','Completed','Exception'];
const pageSizes = [10, 25, 50];

export default function AdminAllOrdersPage() {
  const { addToast } = useToast();
  const perms = useAdminPermissions();
  const [orders, setOrders] = useState(mockAdminOrders);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'orderId'|'date'|'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const filtered = useMemo(() => {
    let arr = orders.filter((o) => {
      if (perms.ordersScope === 'shipping_only' && !isWarehouseShippingOrderStatus(String(o.status))) {
        return false;
      }
      if (
        q &&
        !(
          o.orderId.toLowerCase().includes(q.toLowerCase()) ||
          (o.client || '').toLowerCase().includes(q.toLowerCase()) ||
          (o.itemNames || '').toLowerCase().includes(q.toLowerCase())
        )
      ) {
        return false;
      }
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (clientFilter !== 'All' && o.client !== clientFilter) return false;
      return true;
    });
    const sortKey = sortBy === 'amount' && !perms.canSeeOrderListAmounts ? 'date' : sortBy;
    arr = [...arr].sort((a, b) => {
      const av = String(a[sortKey as keyof typeof a] || '');
      const bv = String(b[sortKey as keyof typeof b] || '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [orders, q, statusFilter, clientFilter, sortBy, sortDir, perms.ordersScope, perms.canSeeOrderListAmounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page-1)*perPage, page*perPage);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selected[r.id]);

  function changeStatus(id: string, ns: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: ns as any } : o));
    addToast({ type: 'success', title: 'Status updated', description: `Order set to “${ns}”.` });
  }

  function toggleSelect(id: string) { setSelected(s => ({ ...s, [id]: !s[id] })); }
  function toggleSelectAllPage() {
    if (allOnPageSelected) { const next = { ...selected }; pageRows.forEach(r => delete next[r.id]); setSelected(next); }
    else { const next = { ...selected }; pageRows.forEach(r => next[r.id] = true); setSelected(next); }
  }

  function bulkUpdate(ns: string) {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (!ids.length) { addToast({ type: 'warning', title: 'No orders selected' }); return; }
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: ns as any } : o));
    setSelected({});
    addToast({ type: 'success', title: `Updated ${ids.length} order(s)`, description: `Set to “${ns}”.` });
  }

  function exportCsv() { addToast({ type: 'info', title: 'Exporting CSV...', description: `${filtered.length} rows queued.` }); }

  function toggleSort(k: 'orderId' | 'date' | 'amount') {
    if (k === 'amount' && !perms.canSeeOrderListAmounts) return;
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('asc');
    }
  }

  const colCount = perms.canSeeOrderListAmounts ? 10 : 9;

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-700">All Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {perms.ordersScope === 'shipping_only'
              ? 'Shipping and warehouse view — procurement-stage orders are hidden.'
              : 'Manage all client orders'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Order ID, client, items..." className="input-field pl-9" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
          <option>All</option>{statusOptions.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="input-field">
          <option>All</option>{mockClients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input value={dateFrom} onChange={e => setDateFrom(e.target.value)} type="date" className="input-field text-xs" />
          <input value={dateTo} onChange={e => setDateTo(e.target.value)} type="date" className="input-field text-xs" />
        </div>
      </div>

      {Object.values(selected).some(Boolean) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
          <p className="text-sm font-600 text-orange-800">{Object.values(selected).filter(Boolean).length} selected</p>
          <select onChange={e => { if (e.target.value) bulkUpdate(e.target.value); e.currentTarget.value=''; }} className="input-field text-xs ml-auto sm:w-56">
            <option value="">Bulk status update...</option>
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-[11px] uppercase text-muted-foreground">
                <th className="px-3 py-3"><input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllPage} className="accent-accent" /></th>
                <th className="px-3 py-3 text-left font-600 cursor-pointer" onClick={() => toggleSort('orderId')}>Order ID {sortBy === 'orderId' && (sortDir==='asc' ? <ChevronUp className="w-3 h-3 inline"/> : <ChevronDown className="w-3 h-3 inline"/>)}</th>
                <th className="px-3 py-3 text-left font-600">Client</th>
                <th className="px-3 py-3 text-left font-600">GSTIN</th>
                <th className="px-3 py-3 text-left font-600">Items</th>
                {perms.canSeeOrderListAmounts && (
                  <th className="px-3 py-3 text-right font-600 cursor-pointer" onClick={() => toggleSort('amount')}>
                    Amount {sortBy === 'amount' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                  </th>
                )}
                <th className="px-3 py-3 text-left font-600 cursor-pointer" onClick={() => toggleSort('date')}>Date</th>
                <th className="px-3 py-3 text-left font-600">ETA</th>
                <th className="px-3 py-3 text-left font-600">Status</th>
                <th className="px-3 py-3 text-right font-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => {
                  const client = mockClients.find((c) => c.name === o.client);
                  return (
                  <tr key={o.id} className="table-row-hover">
                    <td className="px-3 py-3"><input type="checkbox" checked={!!selected[o.id]} onChange={() => toggleSelect(o.id)} className="accent-accent" /></td>
                    <td className="px-3 py-3"><Link href={`/admin/orders/${o.id}`} className="font-tabular font-600 text-primary hover:text-accent">{o.orderId}</Link></td>
                    <td className="px-3 py-3"><p className="text-sm font-500">{o.client}</p><p className="text-[11px] text-muted-foreground">{client?.email}</p></td>
                    <td className="px-3 py-3 text-[11px] font-tabular text-muted-foreground">{client?.gstin || '—'}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm">{o.itemCount} items</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{o.itemNames}</p>
                    </td>
                    {perms.canSeeOrderListAmounts && (
                      <td className="px-3 py-3 text-right">
                        <p className="text-sm font-600 font-tabular">{o.amount}</p>
                        <p className="text-[11px] text-muted-foreground font-tabular">{o.amountCny}</p>
                      </td>
                    )}
                    <td className="px-3 py-3 text-xs font-tabular text-muted-foreground">{o.date}</td>
                    <td className="px-3 py-3 text-xs font-tabular text-muted-foreground">{o.estimatedDelivery}</td>
                    <td className="px-3 py-3">
                      <select value={o.status as string} onChange={e => changeStatus(o.id, e.target.value)} className="input-field text-xs py-1 px-2 min-w-[160px]">
                        {statusOptions.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/orders/${o.id}`} className="p-1.5 rounded-md hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => addToast({ type: 'info', title: 'Email composer opened', description: `To: ${client?.email}` })} className="p-1.5 rounded-md hover:bg-muted" title="Contact"><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">Showing <span className="font-600 text-foreground">{(page-1)*perPage + 1}–{Math.min(page*perPage, filtered.length)}</span> of <span className="font-600 text-foreground">{filtered.length}</span> orders</div>
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1); }} className="input-field text-xs py-1 px-2">{pageSizes.map(s => <option key={s}>{s}</option>)}</select>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-2 py-1 text-xs font-500 rounded hover:bg-muted disabled:opacity-40">Prev</button>
            <span className="text-xs font-600 font-tabular">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-2 py-1 text-xs font-500 rounded hover:bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
