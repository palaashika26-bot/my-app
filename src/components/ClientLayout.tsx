'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  FileText,
  BookOpen,
  Truck,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ClientBottomNav from '@/components/ClientBottomNav';
import ClientTopbar from '@/components/ClientTopbar';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/client-dashboard' },
  { icon: ShoppingBag, label: 'My Orders', href: '/client-dashboard/orders' },
  { icon: FileText, label: 'My Requests', href: '/client-dashboard/requests' },
  { icon: BookOpen, label: 'Product Catalog', href: '/catalog' },
  { icon: Truck, label: 'Logistics', href: '/client-dashboard/logistics' },
  { icon: User, label: 'Profile', href: '/profile' },
];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !user) router.push('/login');
  }, [isReady, user, router]);

  const displayName = user?.name ?? 'Client';
  const displayEmail = user?.email ?? '';

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-primary text-primary-foreground">
      <div className="px-5 py-5 flex items-center border-b border-white/10">
        <img
          src="/bg.jpg"
          alt="Elios Wholesale"
          style={{ height: '40px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
        />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === '/client-dashboard'
              ? pathname === '/client-dashboard'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${
                active
                  ? 'bg-[#4A3B52] text-white shadow-orange-glow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
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
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-red-300 hover:text-red-200 font-500"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background overflow-visible">
      {/* Desktop sidebar — fixed on left */}
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 sidebar-scroll">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">{sidebar}</div>
        </>
      )}

      {/* Main column: topbar sticky, content uses window scroll, bottom nav fixed */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 overflow-visible">
        <ClientTopbar onMenuOpen={() => setOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 fade-in overflow-visible" style={{ maxHeight: 'none', height: 'auto' }}>
          {children}
        </main>

        <ClientBottomNav />
      </div>
    </div>
  );
}
