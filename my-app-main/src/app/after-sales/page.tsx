'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { mockOrders } from '@/lib/mockData';
import { Upload, ChevronDown, AlertOctagon, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Complaint {
  id: string;
  orderId: string;
  date: string;
  issueType: string;
  status: 'Under Review' | 'Resolved' | 'Rejected' | 'Processing';
}

const initialComplaints: Complaint[] = [
  { id: 'BK-COMP-2026-0012', orderId: 'BK-ORD-2024-0261', date: '10 May 2026', issueType: 'Damaged goods', status: 'Under Review' },
  { id: 'BK-COMP-2026-0008', orderId: 'BK-ORD-2024-0248', date: '02 May 2026', issueType: 'Missing items', status: 'Resolved' },
  { id: 'BK-COMP-2026-0003', orderId: 'BK-ORD-2024-0215', date: '15 Apr 2026', issueType: 'Quality issue', status: 'Resolved' },
];

const statusStyle: Record<Complaint['status'], string> = {
  'Under Review': 'bg-yellow-100 text-yellow-700',
  'Resolved': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Processing': 'bg-blue-100 text-blue-700',
};
const statusIcon: Record<Complaint['status'], React.ElementType> = {
  'Under Review': Clock,
  'Resolved': CheckCircle2,
  'Rejected': XCircle,
  'Processing': AlertOctagon,
};

const issueTypes = ['Damaged goods', 'Missing items', 'Wrong items', 'Quality issue', 'Packaging issue', 'Other'];

const policyFaqs = [
  { q: 'What is your return policy?', a: 'Returns accepted within 7 days of delivery for damaged, defective, or wrong items. Full refund or replacement is provided after quality inspection.' },
  { q: 'How long does a refund take?', a: 'Refunds are processed within 5–7 business days after the complaint is approved. Bank-side credit may take an additional 2–3 working days.' },
  { q: 'Can I return items after delivery?', a: 'Yes, you can raise a complaint within 7 days of delivery. After this window, only manufacturer-warranty issues are honoured.' },
  { q: 'What if my items are damaged in transit?', a: 'Photograph the damaged goods (and the packaging) immediately and raise a complaint here. Our insurance covers transit damage and we process replacements priority.' },
];

export default function AfterSalesPage() {
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [orderId, setOrderId] = useState(mockOrders[0]?.orderId || '');
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!desc.trim()) { addToast({ type: 'warning', title: 'Please add a description' }); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const newId = `BK-COMP-2026-${String(Math.floor(1000 + Math.random()*9000))}`;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    setComplaints([{ id: newId, orderId, date: today, issueType, status: 'Under Review' }, ...complaints]);
    addToast({ type: 'success', title: 'Complaint submitted', description: `${newId} submitted. Our team will contact you within 24 hours.` });
    setDesc(''); setFiles([]); setSubmitting(false);
  }

  return (
    <ClientShell>
      <h1 className="text-2xl font-700 mb-1">After Sales Support</h1>
      <p className="text-sm text-muted-foreground mb-5">We're here to help even after your order is delivered</p>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Raise a Complaint */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Raise a Complaint</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-600 text-muted-foreground uppercase">Order ID</label>
              <select value={orderId} onChange={e => setOrderId(e.target.value)} className="input-field mt-1">
                {mockOrders.map(o => <option key={o.id} value={o.orderId}>{o.orderId} — {o.itemNames}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground uppercase">Issue Type</label>
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="input-field mt-1">
                {issueTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground uppercase">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} className="input-field mt-1" placeholder="Describe your issue in detail..." />
            </div>
            <div>
              <label className="text-xs font-600 text-muted-foreground uppercase block mb-1">Upload Photos</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Choose Files</span>
                <input type="file" multiple hidden onChange={e => setFiles(Array.from(e.target.files || []).map(f => f.name))} />
                {files.length > 0 && <span className="text-xs text-muted-foreground truncate">{files.length} file(s) selected</span>}
              </label>
            </div>
            <button onClick={submit} disabled={submitting} className="btn-primary w-full py-2.5 text-sm">{submitting ? 'Submitting...' : 'Submit Complaint'}</button>
          </div>
        </div>

        {/* My Complaints Table */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">My Complaints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2 font-600">Complaint ID</th><th className="text-left font-600">Order</th><th className="text-left font-600">Date</th><th className="text-left font-600">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {complaints.map(c => {
                  const Icon = statusIcon[c.status];
                  return (
                    <tr key={c.id}>
                      <td className="py-3 font-tabular font-600 text-primary">{c.id}</td>
                      <td className="font-tabular text-xs text-muted-foreground">{c.orderId}</td>
                      <td className="text-xs text-muted-foreground font-tabular">{c.date}</td>
                      <td><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 ${statusStyle[c.status]}`}><Icon className="w-3 h-3" /> {c.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {complaints.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No complaints raised yet.</p>}
          </div>
        </div>
      </div>

      {/* Return & Refund Policy */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="font-700 mb-3">Return & Refund Policy</h3>
        <div className="divide-y divide-border">
          {policyFaqs.map((f, i) => (
            <div key={i} className="py-3">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between text-left">
                <span className="text-sm font-500">{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </ClientShell>
  );
}
