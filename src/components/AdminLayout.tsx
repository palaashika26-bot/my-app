'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, FileText, Users, Truck, Settings as SettingsIcon, MessageCircle, Building2, Menu, X, Bell, Search, ChevronDown, LogOut, User as UserIcon, Globe2, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const items = [
  { icon: Home,         label: 'Dashboard',        href: '/admin' },
  { icon: ShoppingBag,  label: 'Orders',           href: '/admin/all-orders' },
  { icon: FileText,     label: 'Requests',         href: '/admin/requests' },
  { icon: Users,        label: 'Users / Clients',  href: '/admin/users' },
  { icon: Building2,    label: 'Suppliers',        href: '/admin/suppliers' },
  { icon: Truck,        label: 'Logistics',        href: '/admin/logistics' },
  { icon: MessageCircle,label: 'Support Tickets',  href: '/admin/support-tickets' },
  { icon: SettingsIcon, label: 'Settings',         href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/admin/all-orders?q=${encodeURIComponent(query.trim())}`);
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-primary text-primary-foreground">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M2 16 C2 16 6 8 11 8 C16 8 20 16 20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/><rect x="3" y="14" width="3" height="5" rx="1" fill="white"/><rect x="16" y="14" width="3" height="5" rx="1" fill="white"/><path d="M3 16 L19 16" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div>
          <p className="font-700 leading-none">EliosWholesale</p>
          <p className="text-[10px] text-slate-300 mt-1">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(it => {
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
            <button onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-700">AS</div>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-xl shadow-card-lg border border-border z-50 fade-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-600">Arjun Sharma</p>
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                </div>
                <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"><UserIcon className="w-4 h-4" /> Profile</Link>
                <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"><SettingsIcon className="w-4 h-4" /> Settings</Link>
                <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-border"><LogOut className="w-4 h-4" /> Logout</button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 fade-in">{children}</main>
      </div>
    </div>
  );
}
