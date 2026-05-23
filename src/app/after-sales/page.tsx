'use client';
import React, { useState, useRef } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { mockOrders } from '@/lib/mockData';
import { ChevronDown, AlertOctagon, CheckCircle2, XCircle, Clock, Paperclip, X, FileText, Play } from 'lucide-react';

interface Complaint {
  id: string;
  orderId: string;
  date: string;
  issueType: string;
  status: 'Under Review' | 'Resolved' | 'Rejected' | 'Processing';
  hasAttachments?: boolean;
}

const initialComplaints: Complaint[] = [
  { id: 'BK-COMP-2026-0012', orderId: 'BK-ORD-2024-0261', date: '10 May 2026', issueType: 'Damaged goods',  status: 'Under Review' },
  { id: 'BK-COMP-2026-0008', orderId: 'BK-ORD-2024-0248', date: '02 May 2026', issueType: 'Missing items',  status: 'Resolved' },
  { id: 'BK-COMP-2026-0003', orderId: 'BK-ORD-2024-0215', date: '15 Apr 2026', issueType: 'Quality issue',  status: 'Resolved' },
];

const statusStyle: Record<Complaint['status'], string> = {
  'Under Review': 'bg-yellow-100 text-yellow-700',
  'Resolved':     'bg-emerald-100 text-emerald-700',
  'Rejected':     'bg-red-100 text-red-700',
  'Processing':   'bg-[#e4eeee] text-[#6b8f90]',
};
const statusIcon: Record<Complaint['status'], React.ElementType> = {
  'Under Review': Clock,
  'Resolved':     CheckCircle2,
  'Rejected':     XCircle,
  'Processing':   AlertOctagon,
};

const issueTypes = ['Damaged goods', 'Missing items', 'Wrong items', 'Quality issue', 'Packaging issue', 'Other'];

const policyFaqs = [
  { q: 'What is your return policy?',              a: 'Returns accepted within 7 days of delivery for damaged, defective, or wrong items. Full refund or replacement is provided after quality inspection.' },
  { q: 'How long does a refund take?',             a: 'Refunds are processed within 5–7 business days after the complaint is approved. Bank-side credit may take an additional 2–3 working days.' },
  { q: 'Can I return items after delivery?',       a: 'Yes, you can raise a complaint within 7 days of delivery. After this window, only manufacturer-warranty issues are honoured.' },
  { q: 'What if my items are damaged in transit?', a: 'Photograph the damaged goods (and the packaging) immediately and raise a complaint here. Our insurance covers transit damage and we process replacements priority.' },
];

interface Attachment {
  name: string;
  type: 'image' | 'video' | 'pdf';
  base64: string;
  size: number;
}

const IMAGE_PDF_LIMIT = 5  * 1024 * 1024;
const VIDEO_LIMIT     = 50 * 1024 * 1024;
const MAX_FILES = 5;

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AfterSalesPage() {
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [orderId,    setOrderId]    = useState(mockOrders[0]?.orderId || '');
  const [issueType,  setIssueType]  = useState(issueTypes[0]);
  const [desc,       setDesc]       = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lightbox,   setLightbox]   = useState<string | null>(null);
  const [openFaq,    setOpenFaq]    = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (attachments.length + picked.length > MAX_FILES) {
      addToast({ type: 'warning', title: `Max ${MAX_FILES} attachments per complaint` });
      e.target.value = '';
      return;
    }
    const results: Attachment[] = [];
    for (const file of picked) {
      const isVideo = file.type.startsWith('video/');
      const limit   = isVideo ? VIDEO_LIMIT : IMAGE_PDF_LIMIT;
      const limitLbl = isVideo ? '50 MB' : '5 MB';
      if (file.size > limit) {
        addToast({ type: 'warning', title: `"${file.name}" exceeds ${limitLbl} and was skipped` });
        continue;
      }
      const base64 = await toBase64(file);
      const type   = file.type.startsWith('image/') ? 'image' : isVideo ? 'video' : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setAttachments(prev => [...prev, ...results].slice(0, MAX_FILES));
    e.target.value = '';
  }

  function removeAttachment(i: number) {
    setAttachments(prev => prev.filter((_, j) => j !== i));
  }

  async function submit() {
    if (!desc.trim()) { addToast({ type: 'warning', title: 'Please add a description' }); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const newId = `BK-COMP-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (attachments.length > 0) {
      try {
        localStorage.setItem(`aftersales-attachments-${orderId}-${newId}`, JSON.stringify(attachments));
      } catch {
        addToast({ type: 'warning', title: 'Storage full — attachments not saved locally', description: 'Complaint still submitted.' });
      }
    }
    setComplaints([{ id: newId, orderId, date: today, issueType, status: 'Under Review', hasAttachments: attachments.length > 0 }, ...complaints]);
    addToast({ type: 'success', title: 'Complaint submitted', description: `${newId} — our team will contact you within 24 hours.` });
    setDesc(''); setAttachments([]); setSubmitting(false);
  }

  return (
    <ClientLayout>
      <h1 className="text-2xl font-700 mb-1">After Sales Support</h1>
      <p className="text-sm text-muted-foreground mb-5">We're here to help even after your order is delivered</p>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
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
              <label className="text-xs font-600 text-muted-foreground uppercase block mb-1">
                Upload Photos / Videos / Docs
              </label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Images &amp; PDFs up to 5 MB · Videos up to 50 MB · Max {MAX_FILES} files
              </p>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1.5 border border-border">
                      {a.type === 'image' ? (
                        <button type="button" onClick={() => setLightbox(a.base64)}>
                          <img src={a.base64} alt={a.name} className="w-9 h-9 object-cover rounded cursor-zoom-in" />
                        </button>
                      ) : a.type === 'video' ? (
                        <div className="w-9 h-9 bg-slate-200 rounded flex items-center justify-center"><Play className="w-4 h-4 text-slate-600" /></div>
                      ) : (
                        <div className="w-9 h-9 bg-red-50 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-500 max-w-[90px] truncate">{a.name}</span>
                        <span className="text-[9px] text-muted-foreground">{fmtSize(a.size)}</span>
                      </div>
                      <button type="button" onClick={() => removeAttachment(i)} className="ml-0.5 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/mp4,video/mov,video/quicktime,video/avi,video/webm,.pdf" multiple onChange={handleFiles} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach Files
                {attachments.length > 0 && <span className="ml-1 text-muted-foreground">{attachments.length}/{MAX_FILES}</span>}
              </button>
            </div>

            <button onClick={submit} disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
              {submitting ? 'Submitting…' : 'Submit Complaint'}
            </button>
          </div>
        </div>

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
                      <td className="py-3 font-tabular font-600 text-primary">
                        <div className="flex items-center gap-1.5">
                          {c.id}
                          {c.hasAttachments && <span className="text-[10px] text-[#7a9e9f]" title="Has attachments">📎</span>}
                        </div>
                      </td>
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

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="font-700 mb-3">Return &amp; Refund Policy</h3>
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

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
        </div>
      )}
    </ClientLayout>
  );
}
