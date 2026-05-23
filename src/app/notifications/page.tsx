'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { Check } from 'lucide-react';

interface ClientNotif {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'order' | 'payment' | 'request' | 'alert';
  href: string;
  group?: string;
}

const NOTIF_KEY = 'notifications-client';

const filters = ['All', 'Orders', 'Payments', 'Requests', 'Alerts'];
const typeMap: Record<string, string> = { order: 'Orders', payment: 'Payments', request: 'Requests', alert: 'Alerts' };

const typeColors: Record<ClientNotif['type'], string> = {
  order: 'bg-[#e4eeee] text-[#7a9e9f]',
  payment: 'bg-green-100 text-green-600',
  request: 'bg-[#f0eef8] text-[#5c5470]',
  alert: 'bg-red-100 text-red-600',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<ClientNotif[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY);
      if (stored) {
        setNotifs(JSON.parse(stored));
      }
    } catch {}
  }, []);

  function persist(updated: ClientNotif[]) {
    setNotifs(updated);
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(updated)); } catch {}
  }

  function markAllRead() {
    persist(notifs.map(n => ({ ...n, read: true })));
  }

  function handleClick(notif: ClientNotif) {
    const updated = notifs.map(n => n.id === notif.id ? { ...n, read: true } : n);
    persist(updated);
    if (notif.href) router.push(notif.href);
  }

  const visible = filter === 'All' ? notifs : notifs.filter(n => typeMap[n.type] === filter);

  // Group by the group field; fall back to a single "Recent" bucket
  const groupNames = ['Today', 'Yesterday', 'This Week', 'Earlier', 'Recent'];
  const groupedItems: Record<string, ClientNotif[]> = {};
  visible.forEach(n => {
    const g = n.group || 'Recent';
    if (!groupedItems[g]) groupedItems[g] = [];
    groupedItems[g].push(n);
  });
  const activeGroups = groupNames.filter(g => (groupedItems[g] || []).length > 0);

  return (
    <ClientLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-700">Notifications</h1>
          <p className="text-sm text-muted-foreground">{notifs.filter(n => !n.read).length} unread</p>
        </div>
        <button
          onClick={markAllRead}
          className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${filter === f ? 'bg-[#4A3B52] text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No notifications to show.</div>
      ) : (
        <div className="space-y-5">
          {activeGroups.length > 0 ? activeGroups.map(g => (
            <div key={g}>
              <p className="text-xs font-600 text-muted-foreground uppercase mb-2">{g}</p>
              <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
                {(groupedItems[g] || []).map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!n.read ? 'bg-[#faf9f7]' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0 ${typeColors[n.type]}`}>
                      {n.type === 'order' ? 'OR' : n.type === 'payment' ? 'PM' : n.type === 'alert' ? '!' : 'RQ'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${!n.read ? 'font-700' : 'font-500'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#5c5470] flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
              {visible.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!n.read ? 'bg-[#faf9f7]' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0 ${typeColors[n.type]}`}>
                    {n.type === 'order' ? 'OR' : n.type === 'payment' ? 'PM' : n.type === 'alert' ? '!' : 'RQ'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!n.read ? 'font-700' : 'font-500'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#4A3B52] flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ClientLayout>
  );
}
