'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Truck, User } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', href: '/client-dashboard' },
  { icon: ShoppingBag, label: 'Orders', href: '/client-dashboard/orders' },
  { icon: Truck, label: 'Logistics', href: '/client-dashboard/logistics' },
  { icon: User, label: 'Profile', href: '/profile' },
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
      <div className="flex items-center justify-around px-2 py-1.5 safe-area-pb">
        {navItems?.map((item) => {
          const isActive =
            item?.href === '/client-dashboard'
              ? pathname === '/client-dashboard'
              : pathname?.startsWith(item?.href);
          return (
            <Link
              key={`bottom-nav-${item?.label}`}
              href={item?.href}
              className={`bottom-nav-item flex-1 ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item?.label}
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className={`${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
                {item?.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}