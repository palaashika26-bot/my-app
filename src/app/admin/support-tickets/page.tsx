'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { mockTickets, type SupportTicket } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { Search, ArrowLeft, Send, Paperclip, X, FileText, Play } from 'lucide-react';

const statusColor: Record<SupportTicket['status'], string> = {
  Open: 'bg-[#e4eeee] text-[#6b8f90]',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-600',
};
const priorityColor: Record<SupportTicket['priority'], string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-[#e4eeee] text-[#6b8f90]',
  High: 'bg-[#fdf2ed] text-[#c17b5c]',
  Urgent: 'bg-red-100 text-red-700',
};

interface Attachment {
  name: string;
  type: 'image' | 'video' | 'pdf';
  base64: string;
  size: number;
}

interface TicketMessage {
  id: string;
  role: 'client' | 'admin';
  text: string;
  timestamp: string;
  attachments?: Attachment[];
}

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

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

function PendingChips({ pending, onRemove }: { pending: Attachment[]; onRemove: (i: number) => void }) {
  if (!pending.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {pending.map((a, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
          {a.type === 'image' ? (
            <img src={a.base64} alt={a.name} className="w-8 h-8 object-cover rounded" />
          ) : a.type === 'video' ? (
            <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center"><Play className="w-4 h-4 text-slate-600" /></div>
          ) : (
            <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-500 max-w-[90px] truncate">{a.name}</span>
            <span className="text-[9px] text-muted-foreground">{fmtSize(a.size)}</span>
          </div>
          <button type="button" onClick={() => onRemove(i)} className="ml-0.5 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
  );
}

function BubbleAttachments({ attachments, onImageClick }: { attachments: Attachment[]; onImageClick: (src: string) => void }) {
  return (
    <div className="mt-1.5 space-y-1">
      {attachments.map((a, i) => (
        <div key={i}>
          {a.type === 'image' && (
            <button onClick={() => onImageClick(a.base64)} className="block">
              <img src={a.base64} alt={a.name} className="max-w-[160px] max-h-[100px] rounded-lg object-cover border border-white/20 hover:opacity-90 cursor-zoom-in" />
            </button>
          )}
          {a.type === 'video' && (
            <video src={a.base64} controls className="max-w-[200px] rounded-lg" style={{ maxHeight: 120 }} />
          )}
          {a.type === 'pdf' && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <FileText className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
              <span className="truncate max-w-[140px]">{a.name}</span>
              <a href={a.base64} download={a.name} className="underline hover:no-underline ml-1 text-[#7a9e9f]">Download</a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminSupportTicketsPage() {
  const { addToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [thread, setThread] = useState<TicketMessage[]>([]);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (!q) return true;
    return [t.id, t.clientName, t.subject].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [tickets, q, statusFilter]);

  useEffect(() => {
    if (!active) return;
    const stored = localStorage.getItem(`ticket-thread-${active.id}`);
    setThread(stored ? JSON.parse(stored) : []);
    setReadSet(prev => new Set([...prev, active.id]));
    localStorage.setItem(`ticket-attachments-read-${active.id}`, 'true');
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  function hasClientProof(id: string) {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(`ticket-thread-${id}`);
    if (!stored) return false;
    const msgs: TicketMessage[] = JSON.parse(stored);
    return msgs.some(m => m.role === 'client' && m.attachments && m.attachments.length > 0);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (pending.length + picked.length > MAX_FILES) {
      addToast({ type: 'warning', title: `Max ${MAX_FILES} attachments per message` });
      e.target.value = '';
      return;
    }
    const results: Attachment[] = [];
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        addToast({ type: 'warning', title: `"${file.name}" exceeds 10 MB and was skipped` });
        continue;
      }
      const base64 = await toBase64(file);
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setPending(prev => [...prev, ...results].slice(0, MAX_FILES));
    e.target.value = '';
  }

  function changeStatus(id: string, s: SupportTicket['status']) {
    setTickets(p => p.map(t => t.id === id ? { ...t, status: s } : t));
    if (active?.id === id) setActive(prev => prev ? { ...prev, status: s } : prev);
    addToast({ type: 'success', title: 'Status updated' });
  }

  function changePriority(id: string, pr: SupportTicket['priority']) {
    setTickets(p => p.map(t => t.id === id ? { ...t, priority: pr } : t));
    if (active?.id === id) setActive(prev => prev ? { ...prev, priority: pr } : prev);
  }

  function sendReply() {
    if ((!reply.trim() && pending.length === 0) || !active) return;
    const msgId = `msg-${Date.now()}`;
    const msg: TicketMessage = {
      id: msgId,
      role: 'admin',
      text: reply.trim(),
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      attachments: pending.length > 0 ? [...pending] : undefined,
    };
    if (pending.length > 0) {
      localStorage.setItem(`ticket-attachments-${active.id}-${msgId}`, JSON.stringify(pending));
    }
    const updated = [...thread, msg];
    setThread(updated);
    localStorage.setItem(`ticket-thread-${active.id}`, JSON.stringify(updated));
    setReply('');
    setPending([]);
    changeStatus(active.id, 'In Progress');
    addToast({ type: 'success', title: 'Reply sent', description: `To ${active.clientEmail}` });
  }

  if (active) {
    return (
      <AdminLayout>
        <button onClick={() => { setActive(null); setThread([]); setPending([]); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>
        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-tabular font-700 text-lg">{active.id}</span>
            <span className={`badge ${statusColor[active.status]}`}>{active.status}</span>
            <span className={`badge ${priorityColor[active.priority]}`}>{active.priority}</span>
            <span className="badge bg-muted text-muted-foreground">{active.category}</span>
            {hasClientProof(active.id) && <span className="badge bg-[#e4eeee] text-[#6b8f90]">📎 Proof Submitted</span>}
          </div>
          <h2 className="font-700 text-lg">{active.subject}</h2>
          <p className="text-xs text-muted-foreground mt-1">From {active.clientName} • {active.clientEmail} • {active.createdAt}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-2">Initial message</h3>
              <p className="text-sm">{active.description}</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Thread</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto mb-4 p-2 bg-muted/20 rounded-lg">
                {thread.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p>
                ) : (
                  thread.map(msg => {
                    const isAdmin = msg.role === 'admin';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${isAdmin ? 'bg-[#4A3B52] text-white' : 'bg-white border border-border text-foreground'}`}>
                          <p className={`text-[10px] font-600 mb-0.5 ${isAdmin ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {isAdmin ? 'You (Admin)' : active.clientName}
                          </p>
                          {msg.text && <p>{msg.text}</p>}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <BubbleAttachments attachments={msg.attachments} onImageClick={setLightbox} />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{msg.timestamp}</span>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <PendingChips pending={pending} onRemove={i => setPending(prev => prev.filter((_, j) => j !== i))} />

              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} className="input-field mb-3" placeholder="Type your reply..." />
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf" multiple onChange={handleFiles} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending.length >= MAX_FILES}
                  title={`Attach files (max ${MAX_FILES}, up to 10 MB each)`}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 disabled:opacity-40 border border-border"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {pending.length > 0 && <span className="text-xs text-muted-foreground">{pending.length}/{MAX_FILES}</span>}
                <button onClick={sendReply} disabled={!reply.trim() && pending.length === 0} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" /> Send Reply
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 h-fit">
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Status</p>
              <select value={active.status} onChange={e => changeStatus(active.id, e.target.value as SupportTicket['status'])} className="input-field text-sm">
                <option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
              </select>
              <p className="text-[10px] uppercase text-muted-foreground mt-3 mb-1">Priority</p>
              <select value={active.priority} onChange={e => changePriority(active.id, e.target.value as SupportTicket['priority'])} className="input-field text-sm">
                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
              </select>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-card p-4 text-xs space-y-1">
              <p><span className="text-muted-foreground">Category:</span> <span className="font-500">{active.category}</span></p>
              <p><span className="text-muted-foreground">Created:</span> <span className="font-tabular">{active.createdAt}</span></p>
              <p><span className="text-muted-foreground">Last reply:</span> <span className="font-tabular">{active.lastReply}</span></p>
            </div>
          </div>
        </div>

        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
          </div>
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-700 mb-1">Support Tickets</h1>
      <p className="text-sm text-muted-foreground mb-5">{tickets.length} tickets • {tickets.filter(t => t.status === 'Open').length} open • {tickets.filter(t => t.priority === 'Urgent').length} urgent</p>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <input value={q} onChange={e => setQ(e.target.value)} className="input-field !pl-10" placeholder="Search ticket ID, client, subject..." />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
          <option>All</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
        </select>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-[11px] uppercase text-muted-foreground">
                <th className="px-3 py-3 text-left font-600">Ticket ID</th>
                <th className="px-3 py-3 text-left font-600">Client</th>
                <th className="px-3 py-3 text-left font-600">Subject</th>
                <th className="px-3 py-3 text-left font-600">Category</th>
                <th className="px-3 py-3 text-left font-600">Priority</th>
                <th className="px-3 py-3 text-left font-600">Status</th>
                <th className="px-3 py-3 text-left font-600">Last Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => {
                const hasProof = hasClientProof(t.id);
                const unread = hasProof && !readSet.has(t.id) && (typeof window !== 'undefined' ? !localStorage.getItem(`ticket-attachments-read-${t.id}`) : false);
                return (
                  <tr key={t.id} onClick={() => setActive(t)} className="table-row-hover cursor-pointer">
                    <td className="px-3 py-3 font-tabular font-600 text-primary">
                      <div className="flex items-center gap-1.5">
                        {t.id}
                        {unread && <span className="text-[10px] text-[#4A3B52]" title="Unread client attachments">⚠️</span>}
                        {hasProof && !unread && <span className="text-[10px] text-[#7a9e9f]" title="Has client attachments">📎</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3"><p className="text-sm font-500">{t.clientName}</p><p className="text-[11px] text-muted-foreground">{t.clientEmail}</p></td>
                    <td className="px-3 py-3 text-sm">{t.subject}</td>
                    <td className="px-3 py-3"><span className="badge bg-muted text-muted-foreground">{t.category}</span></td>
                    <td className="px-3 py-3"><span className={`badge ${priorityColor[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-3 py-3"><span className={`badge ${statusColor[t.status]}`}>{t.status}</span></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{t.lastReply}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
