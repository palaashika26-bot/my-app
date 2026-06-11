'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { supportApi, type SupportTicketDetail } from '@/lib/api/support.api';
import { uploadFiles } from '@/lib/upload';
import { attachmentKind } from '@/lib/attachments';
import { ArrowLeft, Paperclip, X, FileText, Send, Loader2 } from 'lucide-react';

const statusStyle: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-muted text-muted-foreground',
};
const statusLabel: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };

function Attachment({ url, onZoom }: { url: string; onZoom: (u: string) => void }) {
  const kind = attachmentKind(url);
  if (kind === 'image') return <img src={url} alt="attachment" onClick={() => onZoom(url)} className="w-20 h-20 object-cover rounded-lg border border-border cursor-zoom-in" />;
  if (kind === 'video') return <video src={url} controls className="w-32 h-20 rounded-lg border border-border bg-black" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-border bg-muted/30"><FileText className="w-3.5 h-3.5 text-red-500" /> File</a>;
}

export default function ClientTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await supportApi.get(id);
      if (res.data.success) setTicket(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages.length]);

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
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    try {
      await supportApi.addMessage(id, { text: reply.trim(), attachments: files.map(f => f.url) });
      setReply('');
      setFiles([]);
      await load();
    } catch {
      addToast({ type: 'error', title: 'Could not send', description: 'Please try again.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <ClientLayout>
      <Link href="/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Support</Link>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !ticket ? (
        <p className="text-center text-muted-foreground py-20">Ticket not found.</p>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="font-tabular font-700 text-lg">{ticket.ticketNumber}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusStyle[ticket.status]}`}>{statusLabel[ticket.status]}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-muted text-muted-foreground">{ticket.category}</span>
            </div>
            <h2 className="font-700 text-lg">{ticket.subject}</h2>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-4">Conversation</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {ticket.messages.map(m => {
                const mine = m.senderRole === 'CLIENT';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-[#4A3B52] text-white' : 'bg-muted/50 text-foreground'}`}>
                      <p className="text-[10px] font-600 opacity-70 mb-1">{mine ? 'You' : (m.senderName || 'Elios Team')}</p>
                      {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {m.attachments.map((a, i) => <Attachment key={i} url={a} onZoom={setLightbox} />)}
                        </div>
                      )}
                      <p className="text-[9px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {ticket.status !== 'CLOSED' ? (
              <div className="border-t border-border mt-4 pt-4">
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] max-w-[90px] truncate">{f.name}</span>
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3 text-muted-foreground" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf" multiple onChange={handleFiles} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading || files.length >= 3} className="p-2.5 text-muted-foreground hover:text-foreground rounded-lg border border-border disabled:opacity-40">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}</button>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={1} placeholder="Type your message…" className="input-field flex-1 resize-none text-sm" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                  <button onClick={send} disabled={sending || uploading || (!reply.trim() && files.length === 0)} className="btn-primary px-4 py-2.5 disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                </div>
              </div>
            ) : (
              <p className="border-t border-border mt-4 pt-4 text-center text-sm text-muted-foreground">This ticket is closed.</p>
            )}
          </div>
        </>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
        </div>
      )}
    </ClientLayout>
  );
}
