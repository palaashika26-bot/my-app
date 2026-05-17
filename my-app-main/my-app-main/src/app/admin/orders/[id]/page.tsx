'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockClients, orderNotesLog, carrierForOrder, statusToLocation } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Upload, Download, FileText, AlertTriangle, Mail, Edit3, MessageSquare, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { notFound } from 'next/navigation';
import { getEffectiveOrderStatus } from '@/lib/orderQcStore';

const stages = ['Order Placed','Payment Confirmed','Sourcing','At China Warehouse','China Consolidation Warehouse','Repacking Warehouse','Shipped from China','In Transit','Arrived India Warehouse','Out for Delivery','Completed'];
const stageMap: Record<string, number> = { 'Payment Pending': 0, 'Payment Confirmed': 1, 'Sourcing': 2, 'At China Warehouse': 3, 'China Consolidation Warehouse': 4, 'Repacking Warehouse': 5, 'Shipped from China': 6, 'In Transit': 7, 'Arrived India Warehouse': 8, 'Out for Delivery': 9, 'Completed': 10 };
const statusOptions: OrderStatus[] = ['Payment Pending','Payment Confirmed','Sourcing','At China Warehouse','Repacking Warehouse','Ready for Shipping','Ready for Logistics','Return from China','Shipped from China','Arrived India Warehouse','Out for Delivery','Completed','Exception'];
const gstRates = [0, 5, 12, 18, 28];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const { user, role } = useAuth();
  const perms = useAdminPermissions();
  const actorName = user?.name ?? 'Team';
  const initial = mockAdminOrders.find(o => o.id === id);
  if (!initial) return notFound();
  const client = mockClients.find(c => c.name === initial.client);
  const [status, setStatus] = useState(initial.status as string);
  const [gst, setGst] = useState(18);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState(orderNotesLog);
  const carrier = carrierForOrder(initial.orderId);
  const loc = statusToLocation[status] ?? { label: 'Pre-shipment', progress: 10 };
  const stageIdx = stageMap[status] ?? -1;

  const items = [
    { name: 'LED Strip Light (RGB, 5m)', qty: 50, unitCny: 42, totalCny: 2100, totalInr: 25200 },
    { name: 'USB-C Cable (Braided)',     qty: 100, unitCny: 8, totalCny: 800, totalInr: 9600 },
    { name: 'Wireless Earbuds',          qty: 25, unitCny: 88, totalCny: 2200, totalInr: 26400 },
  ];
  const productCny = 5100, logisticsCny = 680;
  const productInr = productCny * 12, logisticsInr = logisticsCny * 12;
  const advancePaid = 15000;
  const subTotal = productInr + logisticsInr - advancePaid;
  const gstAmt = Math.round(subTotal * gst / 100);
  const grand = subTotal + gstAmt;

  function saveStatus(s: string) {
    setStatus(s);
    setNotes((prev) => [
      {
        id: `n${Date.now()}`,
        time: new Date().toLocaleString('en-IN'),
        actor: actorName,
        message: `Status changed: ${status} → ${s}`,
        icon: '🔄',
      },
      ...prev,
    ]);
    addToast({ type: 'success', title: 'Status updated', description: `Order is now “${s}”.` });
  }
  function addNote() {
    if (!note.trim()) return;
    setNotes((prev) => [
      { id: `n${Date.now()}`, time: new Date().toLocaleString('en-IN'), actor: actorName, message: note, icon: '📝' },
      ...prev,
    ]);
    setNote('');
    addToast({ type: 'success', title: 'Note added' });
  }
  function flagException() { saveStatus('Exception'); }
  function refund() {
    if (!perms.canSeeClientPayments || !initial) return;
    addToast({ type: 'info', title: 'Refund initiated', description: 'Refund of ' + initial.amount + ' processing.' });
  }
  function emailClient() { addToast({ type: 'info', title: 'Email composer opened', description: `To: ${client?.email}` }); }
  function uploadDoc(d: string) { addToast({ type: 'success', title: `${d} uploaded`, description: 'Visible to client now.' }); }

  return (
    <AdminLayout>
      <Link href="/admin/all-orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Orders</Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-tabular font-700 text-lg">{initial.orderId}</span>
            <StatusBadge status={status as any} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed: {initial.date} • ETA: {initial.estimatedDelivery}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(role === 'admin' || (role === 'staff' && user?.staffRoleId === 'warehouse_staff')) &&
            (initial.status === 'Repacking Warehouse' ||
              ['Ready for Logistics', 'Return from China'].includes(
                getEffectiveOrderStatus(initial.id, initial.status as OrderStatus) as string
              )) && (
              <Link
                href={`/admin/warehouse/qc/${initial.id}`}
                className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Repacking Warehouse
              </Link>
            )}
          <select value={status} onChange={e => saveStatus(e.target.value)} className="input-field text-sm py-2 min-w-[180px]">{statusOptions.map(s => <option key={s}>{s}</option>)}</select>
          <button onClick={emailClient} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Client</button>
          <button onClick={flagException} className="px-3 py-2 text-xs font-600 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Mark Exception</button>
          {perms.canSeeClientPayments && (
            <button onClick={refund} className="btn-secondary px-3 py-2 text-xs">Process Refund</button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Client Information */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Client Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] uppercase text-muted-foreground">Name</p><p className="font-500">{client?.name}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Email</p><p className="font-500">{client?.email}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phone</p><p className="font-500 font-tabular">{client?.phone}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Company</p><p className="font-500">{client?.company}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">GSTIN</p><p className="font-500 font-tabular">{client?.gstin}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Total Orders</p><p className="font-500">{client?.totalOrders}</p></div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Items</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th>
                {perms.canSeeSupplierCostsInOrders && (
                  <>
                    <th className="text-right font-600">Unit (¥)</th>
                    <th className="text-right font-600">Total (¥)</th>
                    <th className="text-right font-600">Total (₹)</th>
                  </>
                )}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.map(it => (
                  <tr key={it.name}>
                    <td className="py-3 font-500">{it.name}</td>
                    <td className="text-right font-tabular">{it.qty}</td>
                    {perms.canSeeSupplierCostsInOrders && (
                      <>
                        <td className="text-right font-tabular">¥{it.unitCny}</td>
                        <td className="text-right font-tabular">¥{it.totalCny.toLocaleString()}</td>
                        <td className="text-right font-tabular font-600">₹{it.totalInr.toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Shipment Timeline</h3>
            <ol className="space-y-2.5">
              {stages.map((s, i) => {
                const done = i <= stageIdx; const current = i === stageIdx;
                return (
                  <li key={s} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : current ? 'bg-accent text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>{done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}</div>
                    <p className={`text-sm ${current ? 'font-700 text-accent' : done ? 'font-500' : 'font-500 text-muted-foreground'}`}>{s}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Documents */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Documents</h3>
            <ul className="space-y-2">
              {['Commercial Invoice', 'Packing List'].map(d => (
                <li key={d} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{d}</span>
                  <div className="flex gap-1">
                    <button onClick={() => uploadDoc(d)} className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
                    <button className="text-accent text-xs font-600 px-2 py-1 hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes / Timeline log */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Order Notes & Activity Log</h3>
            <div className="flex gap-2 mb-3">
              <input value={note} onChange={e => setNote(e.target.value)} className="input-field flex-1" placeholder="Add internal note..." />
              <button onClick={addNote} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm"><MessageSquare className="w-3.5 h-3.5" /> Add Note</button>
            </div>
            <ol className="space-y-3 max-h-72 overflow-y-auto">
              {notes.map(n => <li key={n.id} className="flex items-start gap-3 text-sm"><span className="flex-shrink-0">{n.icon}</span><div className="flex-1"><p>{n.message}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.actor} • {n.time}</p></div></li>)}
            </ol>
          </div>
        </div>

        <div className="space-y-5">
          {/* Payment Summary */}
          {perms.canSeeClientPayments && (
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Product Cost</span><span className="font-tabular font-500">¥{productCny.toLocaleString()} / ₹{productInr.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-emerald-600 font-500">Advance Paid</span><span className="font-tabular font-500 text-emerald-600">− ₹{advancePaid.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Logistics (Sea)</span><span className="font-tabular font-500">₹{logisticsInr.toLocaleString()}</span></div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-2"><span className="text-muted-foreground inline-flex items-center gap-1">GST <select value={gst} onChange={e => setGst(+e.target.value)} className="input-field text-[10px] py-0.5 px-1">{gstRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></span><span className="font-tabular font-500">₹{gstAmt.toLocaleString()}</span></div>
              <div className="border-t border-border pt-2 mt-1 flex items-center justify-between"><span className="font-700">Grand Total</span><span className="font-700 font-tabular text-foreground">₹{grand.toLocaleString()}</span></div>
            </div>
          </div>
          )}

          {/* Logistics info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Logistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-500">{carrier.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-500">{carrier.mode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tracking #</span><span className="font-tabular font-500">{carrier.trackingNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-tabular font-500">{initial.estimatedDelivery}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-500">{loc.label}</span></div>
              <Link href={`/admin/shipments/tracking/${initial.id}`} className="btn-primary block text-center mt-3 py-2 text-xs">Open Live Tracking</Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
