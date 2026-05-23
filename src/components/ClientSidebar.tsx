'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, FileText, BookOpen, Truck, User } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const navItems = [
  { icon: Home,       label: 'Home',           href: '/client-dashboard' },
  { icon: ShoppingBag,label: 'Orders',         href: '/client-dashboard/orders' },
  { icon: FileText,   label: 'Requests',       href: '/client-dashboard/requests' },
  { icon: BookOpen,   label: 'Browse Catalog', href: '/catalog' },
  { icon: Truck,      label: 'Logistics',      href: '/client-dashboard/logistics' },
  { icon: User,       label: 'Profile',        href: '/profile' },
];

export default function ClientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-card border-r border-border min-h-screen sticky top-16 self-start z-30 sidebar-scroll overflow-y-auto">
      <nav className="py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/client-dashboard'
              ? pathname === '/client-dashboard'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors ${
                isActive
                  ? 'bg-[#5c5470]/10 text-[#5c5470] font-600'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#5c5470]' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
