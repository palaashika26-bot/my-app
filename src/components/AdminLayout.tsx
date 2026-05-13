'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, FileText, Users, Settings, Menu, X, Bell, LogOut } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/context/AuthContext';

const items = [
  { icon: Home, label: 'Dashboard', href: '/admin' },
  { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
  { icon: FileText, label: 'Requests', href: '/admin/requests' },
  { icon: Users, label: 'Clients', href: '/admin/clients' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  const sidebar = (
    <aside className="flex flex-col h-full w-60 bg-primary text-primary-foreground">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M2 16 C2 16 6 8 11 8 C16 8 20 16 20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/><rect x="3" y="14" width="3" height="5" rx="1" fill="white"/><rect x="16" y="14" width="3" height="5" rx="1" fill="white"/><path d="M3 16 L19 16" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div>
          <p className="font-700 leading-none">EliosWholesale</p>
          <p className="text-[10px] text-slate-300 mt-1">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(it => {
          const active = it.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${active ? 'bg-accent text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <it.icon className="w-4 h-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-xs font-700">AS</div>
          <div className="min-w-0">
            <p className="text-xs font-600 text-white truncate">Arjun Sharma</p>
            <p className="text-[10px] text-slate-400 truncate">admin@elioswholesale.in</p>
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
      <div className="flex-1 flex flex-col md:ml-60 min-w-0">
        <header className="md:hidden h-14 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <p className="font-700">Admin Panel</p>
          <button className="ml-auto w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 fade-in">{children}</main>
      </div>
    </div>
  );
}
