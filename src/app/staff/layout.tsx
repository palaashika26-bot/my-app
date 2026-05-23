'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Package,
  User as UserIcon,
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronDown,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { eliosWholesale } from '@/lib/brandAssets';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';

const WAREHOUSE_NOTIF_KEY = 'notifications-warehouse';

interface WarehouseNotif {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'assignment' | 'reply' | 'acknowledgement';
  href: string;
}

interface DemoOrder {
  orderId: string;
  clientName: string;
  items: string[];
  stage: string;
  assignedAt: string;
  packagingListUploaded: boolean;
  reportSubmitted: boolean;
}

const DEFAULT_NOTIFS: WarehouseNotif[] = [
  {
    id: 'wn-001',
    title: 'New Order Assigned',
    description: 'BK-ORD-2024-0274 has been assigned to you for repacking.',
    time: '2 hours ago',
    read: false,
    type: 'assignment',
    href: '/staff/warehouse/orders/BK-ORD-2024-0274',
  },
  {
    id: 'wn-002',
    title: 'Admin Replied',
    description: 'Admin replied on your report for BK-ORD-2024-0268.',
    time: '1 day ago',
    read: false,
    type: 'reply',
    href: '/staff/warehouse/orders/BK-ORD-2024-0268',
  },
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

export default function StaffWarehouseLayout({ children }: { children: React.ReactNode }) {
  const { role, user, logout, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DemoOrder[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [today, setToday] = useState('');
  const [notifs, setNotifs] = useState<WarehouseNotif[]>(DEFAULT_NOTIFS);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReady) return;
    if (role !== 'staff' || user?.staffRoleId !== 'warehouse-qc') {
      router.replace('/login');
    }
  }, [isReady, role, user, router]);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WAREHOUSE_NOTIF_KEY);
      setNotifs(stored ? JSON.parse(stored) : DEFAULT_NOTIFS);
    } catch {
      setNotifs(DEFAULT_NOTIFS);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearchDrop(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }
    try {
      const stored = localStorage.getItem('warehouse-demo-orders');
      const orders: DemoOrder[] = stored ? JSON.parse(stored) : [];
      const lower = q.toLowerCase();
      const filtered = orders.filter(
        (o) =>
          o.orderId.toLowerCase().includes(lower) ||
          o.clientName.toLowerCase().includes(lower)
      );
      setSearchResults(filtered);
      setShowSearchDrop(true);
    } catch {
      setSearchResults([]);
    }
  }

  const unreadCount = notifs.filter((n) => !n.read).length;

  function openNotifs() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      const updated = notifs.map((n) => ({ ...n, read: true }));
      setNotifs(updated);
      try {
        localStorage.setItem(WAREHOUSE_NOTIF_KEY, JSON.stringify(updated));
      } catch {}
    }
  }

  if (!isReady || role !== 'staff' || user?.staffRoleId !== 'warehouse-qc') return null;

  const displayName = user?.name ?? 'Warehouse Staff';

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/staff/warehouse' },
    { icon: Package, label: 'My Orders', href: '/staff/warehouse/orders' },
  ];

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
          <p className="text-[10px] text-slate-300 leading-tight truncate">Warehouse & QC</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((it) => {
          const active =
            it.href === '/staff/warehouse'
              ? pathname === '/staff/warehouse'
              : pathname?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${
                active
                  ? 'bg-[#4A3B52] text-white shadow-orange-glow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
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
            <p className="text-[10px] text-slate-400 truncate">
              {STAFF_ROLE_LABELS['warehouse-qc']}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30">{sidebar}</div>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">{sidebar}</div>
        </>
      )}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20">
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-xl relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDrop(true);
              }}
              placeholder="Search assigned orders..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-[#4A3B52] text-sm outline-none transition-colors"
            />
            {showSearchDrop && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-card-lg border border-border z-50 overflow-hidden">
                {searchResults.map((order) => (
                  <Link
                    key={order.orderId}
                    href={`/staff/warehouse/orders/${order.orderId}`}
                    onClick={() => {
                      setShowSearchDrop(false);
                      setQuery('');
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-sm"
                  >
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-600 font-tabular">{order.orderId}</p>
                      <p className="text-xs text-muted-foreground">{order.clientName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {showSearchDrop && query.trim() && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-card-lg border border-border z-50 px-4 py-3 text-sm text-muted-foreground">
                No orders found
              </div>
            )}
          </div>

          {/* Weather + date */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-yellow-500" /> 33°C Mumbai
            </span>
            <span className="font-tabular">{today}</span>
          </div>

          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotifs}
              className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center relative"
              aria-label={`Notifications — ${unreadCount} unread`}
              aria-expanded={notifOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-700 rounded-full flex items-center justify-center px-1 border-2 border-card">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-600 text-foreground">Notifications</h3>
                  <span className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notifs.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-muted-foreground">No notifications</p>
                  ) : (
                    notifs.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setNotifOpen(false)}
                        className={`flex gap-3 px-4 py-3 hover:bg-muted transition-colors ${!n.read ? 'bg-[#faf9f7]' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-700 ${
                            n.type === 'assignment'
                              ? 'bg-blue-100 text-blue-600'
                              : n.type === 'reply'
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {n.type === 'assignment' ? 'AS' : n.type === 'reply' ? 'RE' : 'OK'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${!n.read ? 'font-600 text-foreground' : 'font-500 text-foreground'}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {n.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">{n.time}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-lg"
            >
              <div className="w-9 h-9 rounded-full bg-[#5c5470] text-white flex items-center justify-center font-semibold text-sm">
                {initialsFromName(displayName)}
              </div>
              <ChevronDown
                className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#e8e4f0] z-50 py-2">
                <div className="px-4 py-3 border-b border-[#e8e4f0]">
                  <p className="font-semibold text-[#1a1a1a] text-sm truncate">{displayName}</p>
                  <p className="text-[#888888] text-xs mt-0.5">Warehouse & QC</p>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/staff/warehouse/profile');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#faf9f7] transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-[#888888]" />
                  Profile
                </button>
                <div className="border-t border-[#e8e4f0] my-1" />
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 pb-8 sm:p-6 fade-in">{children}</main>
      </div>
    </div>
  );
}
