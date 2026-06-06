'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FileSearch, ShoppingCart, Truck, BookOpen, LifeBuoy, ArrowRight } from 'lucide-react';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function SourcingDashboardPage() {
  const { user } = useAuth();
  const [today, setToday] = useState('');
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
    import('@/lib/api/inquiries.api').then(({ inquiriesApi }) =>
      inquiriesApi.getInquiries({ limit: 10 }).then(r => setInquiries(r.data?.data ?? [])).catch(() => {})
    );
  }, []);

  const displayName = user?.name ?? 'Sourcing Staff';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <h1 className="text-xl font-700 text-foreground">{greeting}, {displayName} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Inquiries', value: inquiries.filter((i: any) => i.status === 'PENDING').length, icon: FileSearch, color: 'bg-amber-50 text-amber-600', href: '/staff/sourcing/requests' },
          { label: 'Active Orders', value: '—', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-600', href: '/staff/sourcing/orders' },
          { label: 'Logistics', value: '—', icon: Truck, color: 'bg-blue-50 text-blue-600', href: '/staff/sourcing/logistics' },
          { label: 'Support', value: '—', icon: LifeBuoy, color: 'bg-purple-50 text-purple-600', href: '/staff/sourcing/support' },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="bg-card rounded-xl border border-border shadow-card p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}><card.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-700 text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mb-4">
        <h2 className="font-700 text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: ShoppingCart, label: 'View Orders', desc: 'Track all client orders', href: '/staff/sourcing/orders', color: 'bg-emerald-50 text-emerald-600' },
            { icon: FileSearch, label: 'New Requests', desc: 'Quote pending requests', href: '/staff/sourcing/requests', color: 'bg-amber-50 text-amber-600' },
            { icon: Truck, label: 'Logistics', desc: 'Manage shipments', href: '/staff/sourcing/logistics', color: 'bg-blue-50 text-blue-600' },
            { icon: BookOpen, label: 'Catalog', desc: 'Update products', href: '/staff/sourcing/catalog', color: 'bg-purple-50 text-purple-600' },
          ].map(action => (
            <Link key={action.href} href={action.href} className="bg-card rounded-xl border border-border shadow-card p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-3 group">
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}><action.icon className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-600 text-sm text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
