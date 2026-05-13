'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/ClientShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests } from '@/lib/mockData';
import { ArrowLeft, Check, MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

const stages = ['Request Submitted', 'Quotation in Progress', 'Awaiting Approval', 'Payment Pending', 'Order Confirmed'];

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const req = mockRequests.find(r => r.id === id);
  const { addToast } = useToast();
  const [accepted, setAccepted] = useState(false);
  if (!req) return notFound();

  const currentStage = (() => {
    const s = req.status as string;
    if (['Request Submitted'].includes(s)) return 0;
    if (['Quotation in Progress'].includes(s)) return 1;
    if (['Awaiting Approval'].includes(s)) return 2;
    if (['Payment Pending'].includes(s)) return 3;
    return 4;
  })();

  const showQuote = currentStage >= 1;

  return (
    <ClientShell>
      <Link href="/client-dashboard/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Requests</Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3"><span className="font-tabular font-700">{req.requestId}</span><StatusBadge status={req.status as any} /></div>
        <p className="text-xs text-muted-foreground mt-1">Submitted: {req.date} • Budget: {req.totalBudget}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {req.imageAttached && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="text-sm font-700 mb-3">Photo-Scan Submission</h3>
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-xl bg-muted flex items-center justify-center text-4xl">📷</div>
                <div className="flex-1"><p className="text-sm">AI Detected: <span className="font-600">{req.detectedProduct}</span></p><p className="text-xs text-muted-foreground mt-1">{req.confidence}% confidence match</p></div>
              </div>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Items Requested</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="py-2 text-left font-600">Item</th><th className="text-right font-600">Qty</th><th className="text-left font-600 pl-4">Specs / Notes</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {req.itemNames.split(',').slice(0,4).map((n, i) => (
                  <tr key={i}><td className="py-3 font-500">{n.trim()}</td><td className="text-right font-tabular">{50 + i*25}</td><td className="pl-4 text-xs text-muted-foreground">Standard specs, branded packaging</td></tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {showQuote && (
            <div className="bg-card rounded-xl border-2 border-accent/30 shadow-card p-5 bg-gradient-to-br from-orange-50/40 to-card">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-700">📄 Quotation</h3><span className="text-[10px] font-600 bg-orange-100 text-orange-700 px-2 py-1 rounded">Valid till 18 May 2026</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                <div><p className="text-[10px] uppercase text-muted-foreground">Unit Price</p><p className="font-700 font-tabular text-lg">¥42</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Total (CNY)</p><p className="font-700 font-tabular text-lg">¥4,200</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Total (INR)</p><p className="font-700 font-tabular text-lg">{req.totalBudget}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">BK Margin</p><p className="font-700 font-tabular text-lg">8%</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">GST (18%)</p><p className="font-700 font-tabular text-lg text-accent">₹8,100</p></div>
              </div>
              <p className="text-[11px] text-muted-foreground italic mb-4">GST applicable as per Indian import regulations. Final invoice will include IGST.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button disabled={accepted} onClick={() => { setAccepted(true); addToast({ type: 'success', title: 'Quotation Accepted', description: 'Payment instructions sent via email.' }); }} className="btn-primary px-4 py-2 text-sm flex-1 inline-flex items-center justify-center gap-2">{accepted ? <><Check className="w-4 h-4" /> Accepted</> : 'Accept Quotation'}</button>
                <button className="btn-secondary px-4 py-2 text-sm flex-1">Reject / Negotiate</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-700 mb-3">Conversation</h3>
            <div className="space-y-3">
              <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-700">AS</div><div className="flex-1 bg-muted/50 rounded-lg p-3"><p className="text-xs font-600">Arjun (Admin)</p><p className="text-sm mt-1">We've sourced this from 3 suppliers in Yiwu. Best price attached above. Lead time: 12–15 days.</p><p className="text-[10px] text-muted-foreground mt-1">2 hours ago</p></div></div>
              <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-700">RK</div><div className="flex-1 bg-orange-50/40 rounded-lg p-3"><p className="text-xs font-600">You</p><p className="text-sm mt-1">Can we get a sample first before placing the bulk order?</p><p className="text-[10px] text-muted-foreground mt-1">1 hour ago</p></div></div>
            </div>
            <div className="flex gap-2 mt-4"><input className="input-field flex-1" placeholder="Type a message..." /><button className="btn-primary px-4 inline-flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Send</button></div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5 h-fit">
          <h3 className="text-sm font-700 mb-4">Request Timeline</h3>
          <ol className="space-y-3">
            {stages.map((s, i) => {
              const done = i <= currentStage;
              const current = i === currentStage;
              return (
                <li key={s} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : current ? 'bg-accent text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                  </div>
                  <p className={`text-sm ${current ? 'font-700 text-accent' : done ? 'font-500' : 'font-500 text-muted-foreground'}`}>{s}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </ClientShell>
  );
}
