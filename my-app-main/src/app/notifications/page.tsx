'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { mockNotifications } from '@/lib/mockData';
import { Check } from 'lucide-react';

const filters = ['All', 'Orders', 'Payments', 'Requests', 'Alerts'];
const typeMap: Record<string, string> = { order: 'Orders', payment: 'Payments', request: 'Requests', alert: 'Alerts' };

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(mockNotifications);
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? notifs : notifs.filter(n => typeMap[n.type] === filter);
  const groups = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  return (
    <ClientShell>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-700">Notifications</h1><p className="text-sm text-muted-foreground">{notifs.filter(n => !n.read).length} unread</p></div>
        <button onClick={() => setNotifs(notifs.map(n => ({ ...n, read: true })))} className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Mark all read</button>
      </div>
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {filters.map(f => <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${filter === f ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}>{f}</button>)}
      </div>
      <div className="space-y-5">
        {groups.map(g => {
          const items = visible.filter(n => n.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="text-xs font-600 text-muted-foreground uppercase mb-2">{g}</p>
              <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
                {items.map(n => (
                  <div key={n.id} onClick={() => setNotifs(notifs.map(x => x.id === n.id ? { ...x, read: true } : x))} className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 ${!n.read ? 'bg-orange-50/40' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-700 capitalize">{n.type[0]}</div>
                    <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><p className={`text-sm ${!n.read ? 'font-700' : 'font-500'}`}>{n.title}</p>{!n.read && <span className="w-2 h-2 rounded-full bg-accent" />}</div><p className="text-xs text-muted-foreground mt-0.5">{n.description}</p><p className="text-[10px] text-muted-foreground mt-1">{n.time}</p></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ClientShell>
  );
}
