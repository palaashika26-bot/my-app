'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests, mockClients } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Check, X, MessageSquare, Send } from 'lucide-react';
import { notFound } from 'next/navigation';

const gstRates = [0, 5, 12, 18, 28];

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const req = mockRequests.find(r => r.id === id);
  if (!req) return notFound();
  const client = mockClients.find(c => c.name === req.client);

  const [productCny, setProductCny] = useState(4200);
  const [logisticsInr, setLogisticsInr] = useState(8000);
  const [customsInr, setCustomsInr] = useState(6500);
  const [gst, setGst] = useState(18);
  const [msg, setMsg] = useState('');
  const [thread, setThread] = useState([
    { by: 'client', text: 'Hi team, please source these items urgently. Sample required first.', t: '2 hours ago' },
    { by: 'admin', text: 'On it — sample available in 5–7 days. We will share supplier shortlist shortly.', t: '1 hour ago' },
  ]);

  const productInr = productCny * 12;
  const serviceFee = Math.round(productInr * 0.08);
  const subtotal = productInr + serviceFee + logisticsInr + customsInr;
  const gstAmt = Math.round(subtotal * gst / 100);
  const grand = subtotal + gstAmt;

  function sendQuote() { addToast({ type: 'success', title: 'Quotation sent', description: `Total ₹${grand.toLocaleString()} sent to ${client?.email}.` }); }
  function approve() { addToast({ type: 'success', title: 'Request approved', description: 'Converted to order.' }); }
  function reject() { addToast({ type: 'warning', title: 'Request rejected', description: 'Client has been notified.' }); }
  function moreInfo() { addToast({ type: 'info', title: 'Info requested from client' }); }
  function postMsg() { if (!msg.trim()) return; setThread(t => [...t, { by: 'admin', text: msg, t: 'just now' }]); setMsg(''); }

  return (
    <AdminLayout>
      <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-2">{req.source === 'photo_scan' && <Camera className="w-4 h-4 text-accent" />}<span className="font-tabular font-700 text-lg">{req.requestId}</span><StatusBadge status={req.status as any} /></div>
        <p className="text-xs text-muted-foreground">{req.client} • {client?.email} • {req.date} • Budget {req.totalBudget}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {req.imageAttached && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Photo Submission</h3>
              <div className="flex gap-4"><div className="w-32 h-32 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-5xl">📷</div><div><p className="text-sm">AI detected: <span className="font-600">{req.detectedProduct}</span></p><p className="text-xs text-muted-foreground mt-1">{req.confidence}% match confidence</p></div></div>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Items Requested</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground"><th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th><th className="text-left font-600 pl-3">Specs</th></tr></thead>
              <tbody className="divide-y divide-border">
                {req.itemNames.split(',').map((n, i) => <tr key={i}><td className="py-3 font-500">{n.trim()}</td><td className="text-right font-tabular">{50 + i*25}</td><td className="pl-3 text-xs text-muted-foreground">Standard specs, OEM packaging</td></tr>)}
              </tbody>
            </table></div>
          </div>

          {/* Quotation builder */}
          <div className="bg-card rounded-xl border-2 border-accent/30 shadow-card p-5">
            <h3 className="font-700 mb-3">Build Quotation</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div><label className="text-xs font-600 text-muted-foreground">Product Cost (CNY)</label><input value={productCny} onChange={e => setProductCny(+e.target.value || 0)} type="number" className="input-field mt-1 font-tabular" /></div>
              <div><label className="text-xs font-600 text-muted-foreground">Logistics (INR)</label><input value={logisticsInr} onChange={e => setLogisticsInr(+e.target.value || 0)} type="number" className="input-field mt-1 font-tabular" /></div>
              <div><label className="text-xs font-600 text-muted-foreground">Customs Duty (INR)</label><input value={customsInr} onChange={e => setCustomsInr(+e.target.value || 0)} type="number" className="input-field mt-1 font-tabular" /></div>
              <div><label className="text-xs font-600 text-muted-foreground">GST Rate</label><select value={gst} onChange={e => setGst(+e.target.value)} className="input-field mt-1">{gstRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Product Cost (INR @₹12)</span><span className="font-tabular">₹{productInr.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service Fee (8%)</span><span className="font-tabular">₹{serviceFee.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Logistics</span><span className="font-tabular">₹{logisticsInr.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customs Duty</span><span className="font-tabular">₹{customsInr.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST ({gst}%)</span><span className="font-tabular">₹{gstAmt.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="font-700">Grand Total</span><span className="font-700 font-tabular text-accent text-lg">₹{grand.toLocaleString()}</span></div>
            </div>
            <button onClick={sendQuote} className="btn-primary w-full mt-4 py-2.5 text-sm inline-flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send Quotation to Client</button>
          </div>

          {/* Conversation thread */}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Conversation</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {thread.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.by === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${m.by === 'admin' ? 'bg-accent' : 'bg-primary'}`}>{m.by === 'admin' ? 'AS' : 'CL'}</div>
                  <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm ${m.by === 'admin' ? 'bg-orange-50' : 'bg-muted/50'}`}><p>{m.text}</p><p className="text-[10px] text-muted-foreground mt-1">{m.t}</p></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3"><input value={msg} onChange={e => setMsg(e.target.value)} className="input-field flex-1" placeholder="Reply to client..." /><button onClick={postMsg} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm"><MessageSquare className="w-3.5 h-3.5" /> Send</button></div>
          </div>
        </div>

        <div className="space-y-3 h-fit">
          <button onClick={approve} className="w-full px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Approve & Convert to Order</button>
          <button onClick={reject} className="w-full px-4 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 inline-flex items-center justify-center gap-2"><X className="w-4 h-4" /> Reject Request</button>
          <button onClick={moreInfo} className="btn-secondary w-full py-2.5 text-sm">Request More Info</button>
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h4 className="font-700 text-sm mb-2">Client Snapshot</h4>
            <div className="text-xs space-y-1"><p><span className="text-muted-foreground">Company:</span> <span className="font-500">{client?.company}</span></p><p><span className="text-muted-foreground">GSTIN:</span> <span className="font-tabular">{client?.gstin}</span></p><p><span className="text-muted-foreground">Total Orders:</span> <span className="font-500">{client?.totalOrders}</span></p><p><span className="text-muted-foreground">Spend:</span> <span className="font-500">{client?.totalSpend}</span></p></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
