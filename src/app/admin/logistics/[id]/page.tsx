'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { logisticsApi, type LogisticsDetail } from '@/lib/api/logistics.api';
import { ArrowLeft, Paperclip, X, FileText, Send, Loader2, Package } from 'lucide-react';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  QUOTED: 'bg-[#e4eeee] text-[#6b8f90] border border-[#bcd9d9]',
  CONFIRMED: 'bg-green-100 text-green-700 border border-green-300',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 border border-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
};
const statusLabel: Record<string, string> = { PENDING: 'Pending', QUOTED: 'Quoted', CONFIRMED: 'Confirmed', IN_TRANSIT: 'In Transit', COMPLETED: 'Completed' };
const STATUSES = ['PENDING', 'QUOTED', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED'] as const;

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}
function Att({ url, onZoom }: { url: string; onZoom: (u: string) => void }) {
  if (url.startsWith('data:image/')) return <img src={url} alt="attachment" onClick={() => onZoom(url)} className="w-20 h-20 object-cover rounded-lg border border-border cursor-zoom-in" />;
  if (url.startsWith('data:video/')) return <video src={url} controls className="w-32 h-20 rounded-lg border border-border bg-black" />;
  return <a href={url} download className="inline-flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-border bg-muted/30"><FileText className="w-3.5 h-3.5 text-red-500" /> File</a>;
}

export default function AdminLogisticsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [req, setReq] = useState<LogisticsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState<{ name: string; base64: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await logisticsApi.get(id);
      if (res.data.success) {
        setReq(res.data.data);
        if (res.data.data.quotePricePerKg) setPrice(res.data.data.quotePricePerKg);
        if (res.data.data.quoteNote) setQuoteNote(res.data.data.quoteNote);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [req?.messages.length]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (files.length + picked.length > 3) { addToast({ type: 'warning', title: 'Max 3 files per message' }); e.target.value = ''; return; }
    const results: { name: string; base64: string }[] = [];
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { addToast({ type: 'warning', title: `"${file.name}" exceeds 10 MB` }); continue; }
      results.push({ name: file.name, base64: await toBase64(file) });
    }
    setFiles(prev => [...prev, ...results].slice(0, 3));
    e.target.value = '';
  }

  async function send() {
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    try {
      await logisticsApi.addMessage(id, { text: reply.trim(), attachments: files.map(f => f.base64) });
      setReply(''); setFiles([]); await load();
    } catch { addToast({ type: 'error', title: 'Could not send' }); }
    finally { setSending(false); }
  }

  async function saveQuote() {
    setSavingQuote(true);
    try {
      await logisticsApi.updateQuote(id, { pricePerKg: price || null, note: quoteNote || null });
      addToast({ type: 'success', title: 'Quote sent to client' });
      await load();
    } catch { addToast({ type: 'error', title: 'Could not save quote' }); }
    finally { setSavingQuote(false); }
  }

  async function changeStatus(status: string) {
    try {
      await logisticsApi.updateStatus(id, status);
      setReq(prev => prev ? { ...prev, status: status as any } : prev);
      addToast({ type: 'success', title: 'Status updated' });
    } catch { addToast({ type: 'error', title: 'Could not update status' }); }
  }

  return (
    <AdminLayout>
      <Link href="/admin/logistics" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Logistics</Link>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !req ? (
        <p className="text-center text-muted-foreground py-20">Request not found.</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-[#4A3B52]" />
                <span className="font-tabular font-700">{req.requestNumber}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{req.clientName} • {req.companyName}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-500">{req.shippingMethod || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="font-500">{req.weightKg || '—'} KG</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-500">{req.cbm || '—'} CBM</span></div>
              </div>
              <div className="mt-4">
                <label className="text-xs font-600 text-muted-foreground block mb-1">Status</label>
                <select value={req.status} onChange={e => changeStatus(e.target.value)} className="input-field text-sm w-full">
                  {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h4 className="font-700 mb-3 text-sm">Send a Quote</h4>
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">₹</span>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price per KG" className="input-field w-full pl-8 text-sm" />
                </div>
                <textarea value={quoteNote} onChange={e => setQuoteNote(e.target.value)} rows={2} placeholder="Quote note (optional)" className="input-field w-full resize-none text-sm" />
                <button onClick={saveQuote} disabled={savingQuote} className="btn-primary w-full py-2 text-sm disabled:opacity-50">{savingQuote ? 'Saving…' : 'Send Quote'}</button>
              </div>
            </div>

            {req.packagingList.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-card p-5">
                <h4 className="font-700 mb-2 text-sm">Packing List</h4>
                <div className="flex flex-wrap gap-2">{req.packagingList.map((a, i) => <Att key={i} url={a} onZoom={setLightbox} />)}</div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-4">Conversation with {req.clientName}</h3>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {req.messages.map(m => {
                const staff = m.senderRole !== 'CLIENT';
                return (
                  <div key={m.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${staff ? 'bg-[#4A3B52] text-white' : 'bg-muted/50 text-foreground'}`}>
                      <p className="text-[10px] font-600 opacity-70 mb-1">{staff ? (m.senderName || 'Elios Team') : req.clientName}</p>
                      {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.attachments.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{m.attachments.map((a, i) => <Att key={i} url={a} onZoom={setLightbox} />)}</div>}
                      <p className="text-[9px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border mt-4 pt-4">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] max-w-[90px] truncate">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf,.xlsx,.xls,.csv" multiple onChange={handleFiles} />
                <button onClick={() => fileInputRef.current?.click()} disabled={files.length >= 3} className="p-2.5 text-muted-foreground hover:text-foreground rounded-lg border border-border disabled:opacity-40"><Paperclip className="w-4 h-4" /></button>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={1} placeholder="Reply to the client…" className="input-field flex-1 resize-none text-sm" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button onClick={send} disabled={sending || (!reply.trim() && files.length === 0)} className="btn-primary px-4 py-2.5 disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
        </div>
      )}
    </AdminLayout>
  );
}
