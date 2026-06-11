'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { supportApi, type SupportTicketListItem, type SupportTicketDetail } from '@/lib/api/support.api';
import { uploadFiles } from '@/lib/upload';
import { attachmentKind } from '@/lib/attachments';
import { ArrowLeft, Paperclip, X, FileText, Send, Loader2, RefreshCw, Search } from 'lucide-react';

const statusStyle: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border border-blue-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  CLOSED: 'bg-muted text-muted-foreground border border-border',
};
const statusLabel: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const STATUS_TABS = ['All', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function MsgAttachment({ url, onZoom }: { url: string; onZoom: (u: string) => void }) {
  const kind = attachmentKind(url);
  if (kind === 'image') return <img src={url} alt="attachment" onClick={() => onZoom(url)} className="w-20 h-20 object-cover rounded-lg border border-border cursor-zoom-in" />;
  if (kind === 'video') return <video src={url} controls className="w-32 h-20 rounded-lg border border-border bg-black" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-border bg-muted/30"><FileText className="w-3.5 h-3.5 text-red-500" /> File</a>;
}

export default function StaffSupportTicketsPage() {
  const { addToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState<SupportTicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportApi.list();
      if (res.data.success) setTickets(res.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length]);

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (!q) return true;
    return [t.ticketNumber, t.clientName, t.companyName, t.subject].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [tickets, q, statusFilter]);

  async function openTicket(id: string) {
    try {
      const res = await supportApi.get(id);
      if (res.data.success) {
        setActive(res.data.data);
        setTickets(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
      }
    } catch { addToast({ type: 'error', title: 'Could not open ticket' }); }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length + picked.length > 3) { addToast({ type: 'warning', title: 'Max 3 files per message' }); return; }
    const valid = picked.filter(file => {
      if (file.size > 10 * 1024 * 1024) { addToast({ type: 'warning', title: `"${file.name}" exceeds 10 MB` }); return false; }
      return true;
    });
    if (valid.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await uploadFiles(valid, 'support');
      const results = uploaded.map((u, i) => ({ name: valid[i].name, url: u.url }));
      setFiles(prev => [...prev, ...results].slice(0, 3));
    } catch { addToast({ type: 'error', title: 'Upload failed', description: 'Please try again.' }); }
    finally { setUploading(false); }
  }

  async function send() {
    if (!active || (!reply.trim() && files.length === 0)) return;
    setSending(true);
    try {
      await supportApi.addMessage(active.id, { text: reply.trim(), attachments: files.map(f => f.url) });
      setReply(''); setFiles([]);
      const res = await supportApi.get(active.id);
      if (res.data.success) setActive(res.data.data);
      loadList();
    } catch { addToast({ type: 'error', title: 'Could not send reply' }); }
    finally { setSending(false); }
  }

  async function changeStatus(status: string) {
    if (!active) return;
    setUpdatingStatus(true);
    try {
      await supportApi.updateStatus(active.id, status);
      setActive(prev => prev ? { ...prev, status: status as any } : prev);
      setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: status as any } : t));
      addToast({ type: 'success', title: 'Status updated' });
    } catch { addToast({ type: 'error', title: 'Could not update status' }); }
    finally { setUpdatingStatus(false); }
  }

  if (active) {
    return (
      <div>
        <button onClick={() => { setActive(null); setReply(''); setFiles([]); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>

        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-tabular font-700 text-lg">{active.ticketNumber}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusStyle[active.status]}`}>{statusLabel[active.status]}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-muted text-muted-foreground">{active.category}</span>
            {active.orderId && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-[#e4eeee] text-[#4a7a7b]">Order {active.orderId}</span>}
          </div>
          <h2 className="font-700 text-lg">{active.subject}</h2>
          <p className="text-xs text-muted-foreground mt-1">From {active.clientName} • {active.companyName} • {active.clientEmail}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={updatingStatus || active.status === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors ${active.status === s ? statusStyle[s] : 'border-border text-muted-foreground hover:bg-muted/40'}`}>
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-4">Conversation</h3>
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {active.messages.map(m => {
              const staff = m.senderRole !== 'CLIENT';
              return (
                <div key={m.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${staff ? 'bg-[#4A3B52] text-white' : 'bg-muted/50 text-foreground'}`}>
                    <p className="text-[10px] font-600 opacity-70 mb-1">{staff ? (m.senderName || 'Elios Team') : active.clientName}</p>
                    {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                    {m.attachments.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{m.attachments.map((a, i) => <MsgAttachment key={i} url={a} onZoom={setLightbox} />)}</div>}
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
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf" multiple onChange={handleFiles} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading || files.length >= 3} className="p-2.5 text-muted-foreground hover:text-foreground rounded-lg border border-border disabled:opacity-40">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}</button>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={1} placeholder="Reply to the client…" className="input-field flex-1 resize-none text-sm" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button onClick={send} disabled={sending || uploading || (!reply.trim() && files.length === 0)} className="btn-primary px-4 py-2.5 disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
            </div>
          </div>
        </div>

        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-700">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Client tickets and complaints</p>
        </div>
        <button onClick={loadList} className="btn-secondary inline-flex items-center gap-1.5 text-sm py-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ticket #, client, subject…" className="input-field w-full pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors ${statusFilter === s ? 'bg-[#4A3B52] text-white' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
              {s === 'All' ? 'All' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No tickets found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/20">
              <tr><th className="text-left py-3 px-4 font-600">Ticket</th><th className="text-left font-600">Client</th><th className="text-left font-600">Subject</th><th className="text-left font-600">Status</th><th className="text-left font-600 pr-4">Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr key={t.id} onClick={() => openTicket(t.id)} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-tabular font-600 text-primary text-xs">{t.ticketNumber}</span>
                      {t.unreadCount > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-700 bg-yellow-100 text-yellow-700">{t.unreadCount}</span>}
                    </div>
                  </td>
                  <td><div className="text-xs"><p className="font-500">{t.clientName}</p><p className="text-muted-foreground">{t.companyName}</p></div></td>
                  <td className="max-w-[260px]"><p className="truncate text-xs">{t.subject}</p><span className="text-[10px] text-muted-foreground">{t.category}</span></td>
                  <td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-600 ${statusStyle[t.status]}`}>{statusLabel[t.status]}</span></td>
                  <td className="pr-4 text-xs text-muted-foreground font-tabular">{new Date(t.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
