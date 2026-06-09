'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { supportApi, type SupportTicketListItem } from '@/lib/api/support.api';
import { ordersApi } from '@/lib/api/orders.api';
import { ChevronDown, Paperclip, X, FileText, Play, ChevronRight, Clock, CheckCircle2, XCircle, AlertOctagon } from 'lucide-react';

const statusStyle: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-muted text-muted-foreground',
};
const statusLabel: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const statusIcon: Record<string, React.ElementType> = { OPEN: Clock, IN_PROGRESS: AlertOctagon, RESOLVED: CheckCircle2, CLOSED: XCircle };

const issueTypes = ['Damaged goods', 'Missing items', 'Wrong items', 'Quality issue', 'Packaging issue', 'Other'];

const policyFaqs = [
  { q: 'What is your return policy?',              a: 'Returns accepted within 7 days of delivery for damaged, defective, or wrong items. Full refund or replacement is provided after quality inspection.' },
  { q: 'How long does a refund take?',             a: 'Refunds are processed within 5–7 business days after the complaint is approved. Bank-side credit may take an additional 2–3 working days.' },
  { q: 'Can I return items after delivery?',       a: 'Yes, you can raise a complaint within 7 days of delivery. After this window, only manufacturer-warranty issues are honoured.' },
  { q: 'What if my items are damaged in transit?', a: 'Photograph the damaged goods (and the packaging) immediately and raise a complaint here. Our insurance covers transit damage and we process replacements priority.' },
];

interface Attachment { name: string; type: 'image' | 'video' | 'pdf'; base64: string; size: number; }
const IMAGE_PDF_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const MAX_FILES = 5;

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}
function fmtSize(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

export default function AfterSalesPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<{ id: string; orderNumber: string }[]>([]);
  const [orderId, setOrderId] = useState('');
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [desc, setDesc] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState<SupportTicketListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await supportApi.list();
      if (res.data.success) setComplaints((res.data.data ?? []).filter(t => t.orderId));
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => {
    loadComplaints();
    ordersApi.getOrders({ limit: 100 }).then(res => {
      if (res.data.success) {
        const list = (res.data.data ?? []).map((o: any) => ({ id: o.id, orderNumber: o.orderNumber }));
        setOrders(list);
        if (list[0]) setOrderId(list[0].orderNumber);
      }
    }).catch(() => {});
  }, [loadComplaints]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (attachments.length + picked.length > MAX_FILES) { addToast({ type: 'warning', title: `Max ${MAX_FILES} attachments per complaint` }); e.target.value = ''; return; }
    const results: Attachment[] = [];
    for (const file of picked) {
      const isVideo = file.type.startsWith('video/');
      const limit = isVideo ? VIDEO_LIMIT : IMAGE_PDF_LIMIT;
      if (file.size > limit) { addToast({ type: 'warning', title: `"${file.name}" exceeds ${isVideo ? '50 MB' : '5 MB'} and was skipped` }); continue; }
      const base64 = await toBase64(file);
      const type = file.type.startsWith('image/') ? 'image' : isVideo ? 'video' : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setAttachments(prev => [...prev, ...results].slice(0, MAX_FILES));
    e.target.value = '';
  }

  async function submit() {
    if (!desc.trim()) { addToast({ type: 'warning', title: 'Please add a description' }); return; }
    setSubmitting(true);
    try {
      await supportApi.create({
        subject: `${issueType}${orderId ? ` — ${orderId}` : ''}`,
        category: issueType,
        description: desc.trim(),
        orderId: orderId || null,
        attachments: attachments.map(a => a.base64),
      });
      addToast({ type: 'success', title: 'Complaint submitted', description: 'Our team will contact you shortly.' });
      setDesc(''); setAttachments([]);
      loadComplaints();
    } catch {
      addToast({ type: 'error', title: 'Could not submit', description: 'Please try again in a moment.' });
    } finally {
      setSubmitting(false);
    }
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
                {orders.length === 0 && <option value="">No orders found</option>}
                {orders.map(o => <option key={o.id} value={o.orderNumber}>{o.orderNumber}</option>)}
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
              <label className="text-xs font-600 text-muted-foreground uppercase block mb-1">Upload Photos / Videos / Docs</label>
              <p className="text-[10px] text-muted-foreground mb-2">Images &amp; PDFs up to 5 MB · Videos up to 50 MB · Max {MAX_FILES} files</p>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1.5 border border-border">
                      {a.type === 'image' ? (
                        <button type="button" onClick={() => setLightbox(a.base64)}><img src={a.base64} alt={a.name} className="w-9 h-9 object-cover rounded cursor-zoom-in" /></button>
                      ) : a.type === 'video' ? (
                        <div className="w-9 h-9 bg-slate-200 rounded flex items-center justify-center"><Play className="w-4 h-4 text-slate-600" /></div>
                      ) : (
                        <div className="w-9 h-9 bg-red-50 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-500 max-w-[90px] truncate">{a.name}</span>
                        <span className="text-[9px] text-muted-foreground">{fmtSize(a.size)}</span>
                      </div>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/mp4,video/mov,video/quicktime,video/avi,video/webm,.pdf" multiple onChange={handleFiles} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= MAX_FILES} className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40">
                <Paperclip className="w-3.5 h-3.5" /> Attach Files
                {attachments.length > 0 && <span className="ml-1 text-muted-foreground">{attachments.length}/{MAX_FILES}</span>}
              </button>
            </div>

            <button onClick={submit} disabled={submitting} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Complaint'}</button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">My Complaints</h3>
          {loadingList ? (
            <p className="text-center text-sm text-muted-foreground py-6">Loading…</p>
          ) : complaints.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No complaints raised yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {complaints.map(c => {
                const Icon = statusIcon[c.status];
                return (
                  <button key={c.id} onClick={() => router.push(`/support/${c.id}`)} className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-tabular text-xs font-600 text-primary">{c.ticketNumber}</span>
                        {c.unreadCount > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-700 bg-yellow-100 text-yellow-700">{c.unreadCount}</span>}
                      </div>
                      <p className="text-sm font-500 truncate mt-0.5">{c.subject}</p>
                      <p className="text-[11px] text-muted-foreground font-tabular">{c.orderId}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 ${statusStyle[c.status]} flex-shrink-0`}><Icon className="w-3 h-3" /> {statusLabel[c.status]}</span>
                  </button>
                );
              })}
            </div>
          )}
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
