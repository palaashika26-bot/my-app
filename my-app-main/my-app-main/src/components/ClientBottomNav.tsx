'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, FileText, BookOpen, Truck, User } from 'lucide-react';

const navItems = [
  { icon: Home,       label: 'Home',     href: '/client-dashboard' },
  { icon: ShoppingBag,label: 'Orders',   href: '/client-dashboard/orders' },
  { icon: FileText,   label: 'Requests', href: '/client-dashboard/requests' },
  { icon: BookOpen,   label: 'Catalog',  href: '/catalog' },
  { icon: Truck,      label: 'Logistics',href: '/client-dashboard/logistics' },
  { icon: User,       label: 'Profile',  href: '/profile' },
];

export default function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-bottom-nav md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-1 py-1 safe-area-pb">
        {navItems.map((item) => {
          const isActive =
            item.href === '/client-dashboard'
              ? pathname === '/client-dashboard'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={`bottom-nav-${item.label}`}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <item.icon
                className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className={`text-[10px] leading-none ${isActive ? 'text-accent font-600' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
