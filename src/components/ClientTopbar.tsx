'use client';
import React, { useState, useRef, useEffect } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Bell, Search, ChevronDown, User, Settings, LogOut, Package, HelpCircle, RefreshCw, BookOpen } from 'lucide-react';
import Link from 'next/link';

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
  order: 'bg-blue-100 text-blue-600',
  payment: 'bg-green-100 text-green-600',
  request: 'bg-orange-100 text-orange-600',
  alert: 'bg-red-100 text-red-600',
};

export default function ClientTopbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <header
      className="sticky top-0 z-40 bg-card border-b border-border shadow-navbar h-16 flex items-center"
      role="banner"
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="EliosWholesale Home">
          <AppLogo size={32} />
          <span className="font-bold text-lg text-primary tracking-tight hidden sm:block">
            EliosWholesale
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md ml-4 hidden md:block">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
              searchFocused ? 'border-accent shadow-[0_0_0_3px_rgba(249,115,22,0.15)]' : 'border-border bg-muted'
            }`}
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search orders, requests..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search orders and requests"
            />
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search */}
          <button
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
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
                      className="text-xs text-accent hover:text-orange-600 font-500 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 flex gap-3 hover:bg-muted transition-colors cursor-pointer ${
                        !notif.read ? 'bg-orange-50' : ''
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
                            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" aria-hidden="true" />
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
                  <button className="text-xs text-accent hover:text-orange-600 font-500 w-full text-center transition-colors">
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
                RK
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-600 text-foreground leading-none">Rajesh Kumar</p>
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
                  <p className="text-sm font-600 text-foreground">Rajesh Kumar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">rajesh@techimports.in</p>
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
                  <Link
                    href="/login"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign Out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}