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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dismissAdminQcAlert, readAdminQcAlerts, subscribeOrderQc } from '@/lib/orderQcStore';
import { eliosWholesale } from '@/lib/brandAssets';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import AdminBottomNav from '@/components/AdminBottomNav';

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
  { icon: MessageCircle, label: 'Support Tickets', href: '/admin/support-tickets', show: () => true },
  { icon: UserCog, label: 'Staff', href: '/admin/staff', show: (p) => p.navStaff },
  { icon: SettingsIcon, label: 'Settings', href: '/admin/settings', show: (p) => p.navSettings },
];

const ADMIN_NOTIF_KEY = 'notifications-admin';

interface AdminNotif {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'request' | 'payment' | 'order' | 'alert';
  href: string;
}

const defaultAdminNotifs: AdminNotif[] = [
  { id: 'an-001', title: 'New Request', description: 'Client Rahul Kumar submitted BK-REQ-2024-0315.', time: '5 min ago', read: false, type: 'request', href: '/admin/requests/req-012' },
  { id: 'an-002', title: 'Payment Received', description: 'Payment confirmed for BK-ORD-2024-0287.', time: '1 hour ago', read: false, type: 'payment', href: '/admin/all-orders/ord-006' },
  { id: 'an-003', title: 'Exception Flagged', description: 'Item shortage on BK-ORD-2024-0241.', time: '3 hours ago', read: false, type: 'alert', href: '/admin/all-orders/ord-008' },
  { id: 'an-004', title: 'Order Shipped', description: 'BK-ORD-2024-0268 shipped from China.', time: '1 day ago', read: true, type: 'order', href: '/admin/all-orders/ord-004' },
];

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
  const [adminNotifs, setAdminNotifs] = useState<AdminNotif[]>(defaultAdminNotifs);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_NOTIF_KEY);
      setAdminNotifs(stored ? JSON.parse(stored) : defaultAdminNotifs);
    } catch { setAdminNotifs(defaultAdminNotifs); }
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

  const adminUnreadCount = adminNotifs.filter(n => !n.read).length;

  function openAdminNotifs() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      const updated = adminNotifs.map(n => ({ ...n, read: true }));
      setAdminNotifs(updated);
      try { localStorage.setItem(ADMIN_NOTIF_KEY, JSON.stringify(updated)); } catch {}
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
    <aside className="flex flex-col h-full w-64 bg-[#1a1423] text-white sidebar-scroll overflow-y-auto">
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
          return (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${active ? 'bg-[#c17b5c] text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <it.icon className="w-4 h-4" /> {it.label}
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
        <button onClick={logout} className="flex items-center gap-2 text-xs text-red-300 hover:text-red-200 font-500">
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
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders, clients, requests..." className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-[#4A3B52] text-sm outline-none transition-colors" />
          </form>
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-500" /> 33°C Sunny</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" /> ENG</span>
            <span className="font-tabular">{today}</span>
          </div>
          <div className="relative" ref={notifRef}>
            <button
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
                  {adminNotifs.map(notif => (
                    <Link
                      key={notif.id}
                      href={notif.href}
                      onClick={() => setNotifOpen(false)}
                      className={`flex gap-3 px-4 py-3 hover:bg-muted transition-colors ${!notif.read ? 'bg-[#faf9f7]' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-700 ${
                        notif.type === 'request' ? 'bg-[#f0eef8] text-[#5c5470]' :
                        notif.type === 'payment' ? 'bg-green-100 text-green-600' :
                        notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                        'bg-[#e4eeee] text-[#7a9e9f]'
                      }`}>
                        {notif.type === 'order' ? 'OR' : notif.type === 'payment' ? 'PM' : notif.type === 'alert' ? '!' : 'RQ'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.read ? 'font-600 text-foreground' : 'font-500 text-foreground'}`}>{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </Link>
                  ))}
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
            <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg">
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
