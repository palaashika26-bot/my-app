'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  FileText,
  Users,
  Truck,
  Settings as SettingsIcon,
  MessageCircle,
  Building2,
  BookOpen,
  Menu,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Globe2,
  Sun,
  UserCog,
  AlertTriangle,
  X,
  Flag,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dismissAdminQcAlert, readAdminQcAlerts, subscribeOrderQc } from '@/lib/orderQcStore';
import { eliosWholesale } from '@/lib/brandAssets';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import AdminBottomNav from '@/components/AdminBottomNav';
import { notificationsApi, type ApiNotification } from '@/lib/api/notifications.api';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import { registerPushNotifications } from '@/lib/pushNotifications';

import type { EffectivePermissions } from '@/lib/staffRoles';

type NavItem = { icon: typeof Home; label: string; href: string; show: (p: EffectivePermissions) => boolean };

const navBlueprint: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/admin', show: () => true },
  { icon: ShoppingBag, label: 'Orders', href: '/admin/all-orders', show: () => true },
  { icon: FileText, label: 'Requests', href: '/admin/requests', show: () => true },
  { icon: Users, label: 'Users / Clients', href: '/admin/users', show: (p) => p.navUsers },
  { icon: Building2, label: 'Suppliers', href: '/admin/suppliers', show: (p) => p.navSuppliers },
  { icon: BookOpen, label: 'Product Catalog', href: '/admin/catalog', show: () => true },
  { icon: Truck, label: 'Logistics', href: '/admin/logistics', show: () => true },
  { icon: Flag, label: 'Disputes', href: '/admin/disputes', show: () => true },
  { icon: MessageCircle, label: 'Support Tickets', href: '/admin/support-tickets', show: () => true },
  { icon: UserCog, label: 'Staff', href: '/admin/staff', show: (p) => p.navStaff },
  { icon: SettingsIcon, label: 'Settings', href: '/admin/settings', show: (p) => p.navSettings },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function notifHref(n: ApiNotification, role: string): string {
  const isWarehouse = role === 'staff';
  if (n.relatedType === 'DISPUTE') {
    return isWarehouse ? '/staff/warehouse' : '/admin/disputes';
  }
  if (n.relatedType === 'ORDER') {
    return isWarehouse
      ? `/staff/warehouse/orders/${n.relatedId}`
      : `/admin/orders/${n.relatedId}`;
  }
  if (n.relatedType === 'REQUEST' || n.type === 'message') {
    return isWarehouse
      ? `/staff/warehouse`
      : `/admin/requests/${n.relatedId}`;
  }
  if (n.relatedType === 'INQUIRY') {
    return isWarehouse ? `/staff/warehouse` : `/admin/requests/${n.relatedId}`;
  }
  return isWarehouse ? '/staff/warehouse' : '/admin';
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, role } = useAuth();
  const perms = useAdminPermissions();
  const items = useMemo(() => navBlueprint.filter((it) => it.show(perms)), [perms]);
  const [today, setToday] = useState('');
  const [qcAlerts, setQcAlerts] = useState(() => (typeof window === 'undefined' ? [] : readAdminQcAlerts()));
  const refreshQcAlerts = useCallback(() => setQcAlerts(readAdminQcAlerts()), []);
  React.useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  }, []);
  useEffect(() => refreshQcAlerts(), [pathname, refreshQcAlerts]);
  useEffect(() => {
    return subscribeOrderQc(refreshQcAlerts);
  }, [refreshQcAlerts]);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [adminNotifs, setAdminNotifs] = useState<ApiNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openDisputeCount, setOpenDisputeCount] = useState(0);

  // Register web push once after login
  useEffect(() => { registerPushNotifications(); }, []);

  const fetchNotifs = useCallback(() => {
    notificationsApi.getNotifications({ limit: 10 })
      .then(r => setAdminNotifs(r.data.data))
      .catch(() => {/* silently fail — bell just stays empty */});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    function fetchOpenDisputes() {
      fetch('/api/disputes/count/open', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
        .then(r => r.json())
        .then(d => { if (d.success) setOpenDisputeCount(d.data?.count ?? 0); })
        .catch(() => {});
    }
    fetchOpenDisputes();
    const iv = setInterval(fetchOpenDisputes, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminUnreadCount = adminNotifs.filter(n => !readIds.has(n.id)).length;

  function openAdminNotifs() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      // Mark all currently visible as read client-side; fire-and-forget to backend
      const ids = new Set(adminNotifs.map(n => n.id));
      setReadIds(ids);
      notificationsApi.markAllAsRead().catch(() => {});
    }
  }

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const panelSubtitle =
    role === 'staff' && user?.staffRoleId ? STAFF_ROLE_LABELS[user.staffRoleId] : role === 'admin' ? 'Admin Panel' : 'Workspace';

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/admin/all-orders?q=${encodeURIComponent(query.trim())}`);
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-primary text-white sidebar-scroll overflow-y-auto">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="rounded-lg bg-white/95 p-1.5 flex-shrink-0 shadow-sm ring-1 ring-white/20">
          <Image
            src={eliosWholesale}
            alt="Elios Wholesale"
            width={160}
            height={64}
            className="h-9 w-auto max-w-[130px] object-contain object-left"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-300 leading-tight truncate">{panelSubtitle}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
        {items.map((it) => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(it.href);
          const isDisputes = it.href === '/admin/disputes';
          return (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${active ? 'bg-[#4A3B52] text-white shadow-orange-glow' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <it.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{it.label}</span>
              {isDisputes && openDisputeCount > 0 && (
                <span className="ml-auto text-[10px] font-700 bg-yellow-400 text-yellow-900 rounded-full px-1.5 py-0.5 leading-none">
                  {openDisputeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#4A3B52] flex items-center justify-center text-white text-xs font-700">
            {initialsFromName(displayName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-600 text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{displayEmail}</p>
          </div>
        </div>
        <button suppressHydrationWarning onClick={logout} className="flex items-center gap-2 text-xs text-red-300 hover:text-red-200 font-500">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 sidebar-scroll">{sidebar}</div>
      {open && (<>
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 md:hidden">{sidebar}</div>
      </>)}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        {/* Top navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="md:hidden w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <form onSubmit={submitSearch} className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input suppressHydrationWarning value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders, clients, requests..." className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-[#4A3B52] text-sm outline-none transition-colors" />
          </form>
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-500" /> 33°C Sunny</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" /> ENG</span>
            <span className="font-tabular">{today}</span>
          </div>
          <div className="relative" ref={notifRef}>
            <button
              suppressHydrationWarning
              onClick={openAdminNotifs}
              className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center relative"
              aria-label={`Notifications — ${adminUnreadCount} unread`}
              aria-expanded={notifOpen}
            >
              <Bell className="w-5 h-5" />
              {adminUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-700 rounded-full flex items-center justify-center px-1 border-2 border-card">
                  {adminUnreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-600 text-foreground">Notifications</h3>
                  <span className="text-xs text-muted-foreground">{adminUnreadCount > 0 ? `${adminUnreadCount} unread` : 'All read'}</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border notification-scroll">
                  {adminNotifs.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-muted-foreground">No notifications yet</p>
                  ) : adminNotifs.map(notif => {
                    const isUnread = !readIds.has(notif.id);
                    return (
                      <Link
                        key={notif.id}
                        href={notifHref(notif, role ?? 'admin')}
                        onClick={() => setNotifOpen(false)}
                        className={`flex gap-3 px-4 py-3 hover:bg-muted transition-colors ${isUnread ? 'bg-[#faf9f7]' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-700 ${
                          notif.type === 'request' ? 'bg-[#f0eef8] text-[#5c5470]' :
                          notif.type === 'alert'   ? 'bg-red-100 text-red-600' :
                          'bg-[#e4eeee] text-[#7a9e9f]'
                        }`}>
                          {notif.type === 'order' ? 'OR' : notif.type === 'alert' ? '!' : 'RQ'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isUnread ? 'font-600 text-foreground' : 'font-500 text-foreground'}`}>{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <Link
                    href="/admin/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-[#4A3B52] font-500 w-full text-center block hover:underline transition-colors"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button suppressHydrationWarning onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-[#5c5470] text-white flex items-center justify-center font-semibold text-sm">
                {initialsFromName(displayName)}
              </div>
              <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#e8e4f0] z-50 py-2">
                <div className="px-4 py-3 border-b border-[#e8e4f0]">
                  <p className="font-semibold text-[#1a1a1a] text-sm truncate">{displayName}</p>
                  <p className="text-[#888888] text-xs mt-0.5">
                    {role === 'admin' ? 'Administrator' : role === 'staff' && user?.staffRoleId ? STAFF_ROLE_LABELS[user.staffRoleId] : 'Signed in'}
                  </p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); router.push('/admin/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#faf9f7] transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-[#888888]" />
                  Profile
                </button>
                {perms.navSettings && (
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/admin/settings'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#faf9f7] transition-colors"
                  >
                    <SettingsIcon className="h-4 w-4 text-[#888888]" />
                    Settings
                  </button>
                )}
                <div className="border-t border-[#e8e4f0] my-1" />
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:p-8 md:pb-8 fade-in">
          {role === 'admin' && qcAlerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {qcAlerts.map((a) => (
                <div
                  key={a.id}
                  className="flex gap-3 items-start rounded-xl border border-rose-200 bg-rose-50 text-rose-900 px-4 py-3 text-sm"
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-700">Repacking Warehouse rejection — {a.displayOrderId}</p>
                    <p className="text-xs mt-1 opacity-90">
                      Client {a.clientName} rejected <span className="font-600">{a.productName}</span>: {a.reason}
                    </p>
                    <p className="text-[11px] mt-1 opacity-75">Order status set to Return from China.</p>
                    <Link
                      href={`/admin/warehouse/qc/${a.orderDbId}`}
                      className="inline-block mt-2 text-xs font-600 text-rose-800 underline underline-offset-2 hover:text-rose-950"
                    >
                      Open Repacking Warehouse
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      dismissAdminQcAlert(a.id);
                      refreshQcAlerts();
                    }}
                    className="p-1 rounded-lg hover:bg-rose-100 text-rose-800"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <AdminRouteGuard>{children}</AdminRouteGuard>
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
