'use client';
import React, { useState, useRef, useEffect } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Bell, Search, ChevronDown, User, Settings, LogOut, Package, HelpCircle, RefreshCw, BookOpen, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'order' | 'payment' | 'request' | 'alert';
  href: string;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    title: 'Quotation Ready',
    description: 'Quotation for BK-REQ-2024-0312 is ready for your review.',
    time: '10 min ago',
    read: false,
    type: 'request',
    href: '/client-dashboard/requests/req-001',
  },
  {
    id: 'notif-002',
    title: 'Payment Verified',
    description: 'Your payment for order BK-ORD-2024-0287 has been verified.',
    time: '2 hours ago',
    read: false,
    type: 'payment',
    href: '/client-dashboard/orders/ord-001',
  },
  {
    id: 'notif-003',
    title: 'Shipment Update',
    description: 'Order BK-ORD-2024-0268 has shipped from China.',
    time: '1 day ago',
    read: false,
    type: 'order',
    href: '/client-dashboard/orders/ord-004',
  },
  {
    id: 'notif-004',
    title: 'Exception Alert',
    description: 'Item shortage on order BK-ORD-2024-0241. Admin will contact you.',
    time: '2 days ago',
    read: true,
    type: 'alert',
    href: '/client-dashboard/orders/ord-008',
  },
  {
    id: 'notif-005',
    title: 'Order Completed',
    description: 'Order BK-ORD-2024-0248 has been delivered successfully.',
    time: '3 days ago',
    read: true,
    type: 'order',
    href: '/client-dashboard/orders/ord-007',
  },
];

const typeColors: Record<Notification['type'], string> = {
  order: 'bg-[#e4eeee] text-[#7a9e9f]',
  payment: 'bg-green-100 text-green-600',
  request: 'bg-[#f0eef8] text-[#5c5470]',
  alert: 'bg-red-100 text-red-600',
};

interface ClientTopbarProps {
  onMenuOpen?: () => void;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function ClientTopbar({ onMenuOpen }: ClientTopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name ?? 'Client';
  const displayEmail = user?.email ?? '';
  const displayInitials = initialsFromName(displayName);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('notifications-client');
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        localStorage.setItem('notifications-client', JSON.stringify(mockNotifications));
      }
    } catch {}
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try { localStorage.setItem('notifications-client', JSON.stringify(updated)); } catch {}
  }

  function markNotifRead(id: string) {
    const updated = notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    try { localStorage.setItem('notifications-client', JSON.stringify(updated)); } catch {}
  }

  return (
    <header
      className="sticky top-0 z-40 bg-card border-b border-border shadow-navbar h-16 flex items-center"
      role="banner"
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 flex items-center gap-4">
        {/* Mobile hamburger */}
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0" aria-label="EliosWholesale Home">
          <AppLogo size={36} />
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md ml-4 hidden md:block">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
              searchFocused ? 'border-[#4A3B52] shadow-[0_0_0_3px_rgba(74,59,82,0.15)]' : 'border-border bg-muted'
            }`}
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, requests..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search orders and requests"
            />
          </div>
        </form>

        <div className="flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search */}
          <button
            onClick={() => router.push('/search')}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                const opening = !notifOpen;
                setNotifOpen(opening);
                setProfileOpen(false);
                if (opening) {
                  const updated = notifications.map(n => ({ ...n, read: true }));
                  setNotifications(updated);
                  try { localStorage.setItem('notifications-client', JSON.stringify(updated)); } catch {}
                }
              }}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={`Notifications — ${unreadCount} unread`}
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-700 rounded-full flex items-center justify-center px-1 border-2 border-card">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-600 text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#4A3B52] hover:text-[#4A3B52] font-500 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border notification-scroll">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => { markNotifRead(notif.id); setNotifOpen(false); router.push(notif.href); }}
                      className={`px-4 py-3 flex gap-3 hover:bg-muted transition-colors cursor-pointer ${
                        !notif.read ? 'bg-[#faf9f7]' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-700 ${typeColors[notif.type]}`}
                      >
                        {notif.type === 'order' ? 'OR' : notif.type === 'payment' ? 'PM' : notif.type === 'alert' ? '!' : 'RQ'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notif.read ? 'font-600 text-foreground' : 'font-500 text-foreground'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#5c5470] flex-shrink-0 mt-1" aria-hidden="true" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
                          {notif.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <button
                    onClick={() => { setNotifOpen(false); router.push('/notifications'); }}
                    className="text-xs text-[#4A3B52] hover:text-[#4A3B52] font-500 w-full text-center transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-muted transition-colors"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-700 flex-shrink-0">
                {displayInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-600 text-foreground leading-none">{displayName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Client Account</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${
                  profileOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-600 text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{displayEmail}</p>
                </div>
                <div className="py-1">
                  {[
                    { icon: User, label: 'My Profile', href: '/profile' },
                    { icon: Package, label: 'My Orders', href: '/client-dashboard' },
                    { icon: BookOpen, label: 'Product Catalog', href: '/catalog' },
                    { icon: Settings, label: 'Account Settings', href: '/settings' },
                    { icon: HelpCircle, label: 'Help & Support', href: '/support' },
                    { icon: RefreshCw, label: 'After Sales', href: '/after-sales' },
                  ].map((item) => (
                    <Link
                      key={`profile-${item.label}`}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-border py-1">
                  <button
                    onClick={() => { setProfileOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}