'use client';
import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { mockTickets, type SupportTicket } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { Search, ArrowLeft, Send } from 'lucide-react';

const statusColor: Record<SupportTicket['status'], string> = { Open: 'bg-blue-100 text-blue-700', 'In Progress': 'bg-yellow-100 text-yellow-700', Resolved: 'bg-emerald-100 text-emerald-700', Closed: 'bg-slate-200 text-slate-600' };
const priorityColor: Record<SupportTicket['priority'], string> = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-blue-100 text-blue-700', High: 'bg-orange-100 text-orange-700', Urgent: 'bg-red-100 text-red-700' };

export default function AdminSupportTicketsPage() {
  const { addToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (!q) return true;
    return [t.id, t.clientName, t.subject].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [tickets, q, statusFilter]);

  function changeStatus(id: string, s: SupportTicket['status']) { setTickets(p => p.map(t => t.id === id ? { ...t, status: s } : t)); if (active?.id === id) setActive({ ...active, status: s }); addToast({ type: 'success', title: 'Status updated' }); }
  function changePriority(id: string, pr: SupportTicket['priority']) { setTickets(p => p.map(t => t.id === id ? { ...t, priority: pr } : t)); if (active?.id === id) setActive({ ...active, priority: pr }); }
  function sendReply() { if (!reply.trim() || !active) return; addToast({ type: 'success', title: 'Reply sent', description: `To ${active.clientEmail}` }); setReply(''); changeStatus(active.id, 'In Progress'); }

  if (active) {
    return (
      <AdminLayout>
        <button onClick={() => setActive(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to Tickets</button>
        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-2"><span className="font-tabular font-700 text-lg">{active.id}</span><span className={`badge ${statusColor[active.status]}`}>{active.status}</span><span className={`badge ${priorityColor[active.priority]}`}>{active.priority}</span><span className="badge bg-muted text-muted-foreground">{active.category}</span></div>
          <h2 className="font-700 text-lg">{active.subject}</h2>
          <p className="text-xs text-muted-foreground mt-1">From {active.clientName} • {active.clientEmail} • {active.createdAt}</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border shadow-card p-5"><h3 className="font-700 mb-2">Initial message</h3><p className="text-sm">{active.description}</p></div>
            <div className="bg-card rounded-xl border border-border shadow-card p-5"><h3 className="font-700 mb-3">Reply to client</h3><textarea value={reply} onChange={e => setReply(e.target.value)} rows={5} className="input-field" placeholder="Type your reply..." /><button onClick={sendReply} className="btn-primary mt-3 px-4 py-2 text-sm inline-flex items-center gap-2"><Send className="w-4 h-4" /> Send Reply</button></div>
          </div>
          <div className="space-y-3 h-fit">
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Status</p>
              <select value={active.status} onChange={e => changeStatus(active.id, e.target.value as any)} className="input-field text-sm"><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select>
              <p className="text-[10px] uppercase text-muted-foreground mt-3 mb-1">Priority</p>
              <select value={active.priority} onChange={e => changePriority(active.id, e.target.value as any)} className="input-field text-sm"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-card p-4 text-xs space-y-1">
              <p><span className="text-muted-foreground">Category:</span> <span className="font-500">{active.category}</span></p>
              <p><span className="text-muted-foreground">Created:</span> <span className="font-tabular">{active.createdAt}</span></p>
              <p><span className="text-muted-foreground">Last reply:</span> <span className="font-tabular">{active.lastReply}</span></p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-700 mb-1">Support Tickets</h1>
      <p className="text-sm text-muted-foreground mb-5">{tickets.length} tickets • {tickets.filter(t => t.status === 'Open').length} open • {tickets.filter(t => t.priority === 'Urgent').length} urgent</p>
      <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} className="input-field pl-9" placeholder="Search ticket ID, client, subject..." /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field"><option>All</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground"><th className="px-3 py-3 text-left font-600">Ticket ID</th><th className="px-3 py-3 text-left font-600">Client</th><th className="px-3 py-3 text-left font-600">Subject</th><th className="px-3 py-3 text-left font-600">Category</th><th className="px-3 py-3 text-left font-600">Priority</th><th className="px-3 py-3 text-left font-600">Status</th><th className="px-3 py-3 text-left font-600">Last Reply</th></tr></thead>
          <tbody className="divide-y divide-border">{filtered.map(t => (
            <tr key={t.id} onClick={() => setActive(t)} className="table-row-hover cursor-pointer">
              <td className="px-3 py-3 font-tabular font-600 text-primary">{t.id}</td>
              <td className="px-3 py-3"><p className="text-sm font-500">{t.clientName}</p><p className="text-[11px] text-muted-foreground">{t.clientEmail}</p></td>
              <td className="px-3 py-3 text-sm">{t.subject}</td>
              <td className="px-3 py-3"><span className="badge bg-muted text-muted-foreground">{t.category}</span></td>
              <td className="px-3 py-3"><span className={`badge ${priorityColor[t.priority]}`}>{t.priority}</span></td>
              <td className="px-3 py-3"><span className={`badge ${statusColor[t.status]}`}>{t.status}</span></td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{t.lastReply}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </AdminLayout>
  );
}
