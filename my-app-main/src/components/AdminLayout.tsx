'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const panelSubtitle =
    role === 'staff' && user?.staffRoleId ? STAFF_ROLE_LABELS[user.staffRoleId] : role === 'admin' ? 'Admin Panel' : 'Workspace';

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/admin/all-orders?q=${encodeURIComponent(query.trim())}`);
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-primary text-primary-foreground">
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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${active ? 'bg-accent text-white shadow-orange-glow' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <it.icon className="w-4 h-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-xs font-700">
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
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30">{sidebar}</div>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search orders, clients, requests..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-accent text-sm outline-none transition-colors" />
          </form>
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-500" /> 33°C Sunny</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" /> ENG</span>
            <span className="font-tabular">{today}</span>
          </div>
          <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center relative" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-card"></span>
          </button>
          <div className="relative">
            <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-700">
                {initialsFromName(displayName)}
              </div>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-600 truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {role === 'admin' ? 'Administrator' : role === 'staff' && user?.staffRoleId ? STAFF_ROLE_LABELS[user.staffRoleId] : 'Signed in'}
                  </p>
                </div>
                {perms.navSettings && (
                  <>
                    <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                      <UserIcon className="w-4 h-4" /> Profile
                    </Link>
                    <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                      <SettingsIcon className="w-4 h-4" /> Settings
                    </Link>
                  </>
                )}
                <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-border">
                  <LogOut className="w-4 h-4" /> Logout
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
                    <p className="font-700">QC rejection — {a.displayOrderId}</p>
                    <p className="text-xs mt-1 opacity-90">
                      Client {a.clientName} rejected <span className="font-600">{a.productName}</span>: {a.reason}
                    </p>
                    <p className="text-[11px] mt-1 opacity-75">Order status set to Return from China.</p>
                    <Link
                      href={`/admin/warehouse/qc/${a.orderDbId}`}
                      className="inline-block mt-2 text-xs font-600 text-rose-800 underline underline-offset-2 hover:text-rose-950"
                    >
                      Open warehouse QC
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
