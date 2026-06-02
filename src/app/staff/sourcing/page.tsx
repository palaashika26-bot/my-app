'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FileSearch, Send, ShoppingCart, Users, Sun, Truck, BookOpen, LifeBuoy, ArrowRight } from 'lucide-react';

interface MockInquiry {
  id: string;
  inquiryNumber: string;
  clientCompany: string;
  productsCount: number;
  submittedAt: string;
  status: 'PENDING' | 'REVIEWING' | 'QUOTED';
  preview: string;
}

const MOCK_INQUIRIES: MockInquiry[] = [
  {
    id: 'inq-001',
    inquiryNumber: 'INQ-2024-001',
    clientCompany: 'Gupta Traders Pvt Ltd',
    productsCount: 3,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    preview: 'USB-C Charger (500), LED Strip (200)...',
  },
  {
    id: 'inq-002',
    inquiryNumber: 'INQ-2024-002',
    clientCompany: 'TechImports India',
    productsCount: 5,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'REVIEWING',
    preview: 'Wireless Earbuds (300), Phone Cases (1000)...',
  },
  {
    id: 'inq-003',
    inquiryNumber: 'INQ-2024-003',
    clientCompany: 'Sunrise Electronics',
    productsCount: 2,
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'QUOTED',
    preview: 'Steel Bottles (500), Bamboo Pens (1000)',
  },
];

function timeRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const STATUS_STYLES: Record<MockInquiry['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  QUOTED: 'bg-emerald-100 text-emerald-700',
};

export default function SourcingDashboardPage() {
  const { user } = useAuth();
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  const displayName = user?.name ?? 'Sourcing Staff';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const pendingCount = MOCK_INQUIRIES.filter((i) => i.status === 'PENDING').length;

  const statCards = [
    {
      label: 'Pending Inquiries',
      value: pendingCount,
      icon: FileSearch,
      color: 'bg-amber-50 text-amber-600',
      href: '/staff/sourcing/inquiries?status=PENDING',
    },
    {
      label: 'Quotes Sent Today',
      value: 4,
      icon: Send,
      color: 'bg-blue-50 text-blue-600',
      href: '/staff/sourcing/quotations',
    },
    {
      label: 'Active Sourcing Orders',
      value: 12,
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-600',
      href: '/staff/sourcing/inquiries',
    },
    {
      label: 'Suppliers Connected',
      value: 38,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
      href: '/staff/sourcing/suppliers',
    },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <h1 className="text-xl font-700 text-foreground">
          {greeting}, {displayName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-yellow-500" />
          {today} • 33°C Sunny in Mumbai
        </p>
        {pendingCount > 0 && (
          <p className="mt-2 text-sm text-amber-600 font-500">
            You have{' '}
            <Link
              href="/staff/sourcing/inquiries?status=PENDING"
              className="font-700 underline underline-offset-2"
            >
              {pendingCount} {pendingCount === 1 ? 'inquiry' : 'inquiries'}
            </Link>{' '}
            waiting for quotation.
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card rounded-xl border border-border shadow-card p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-700 text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
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
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-600 text-sm text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Inquiries */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-700 text-foreground">Recent Inquiries</h2>
        <Link href="/staff/sourcing/inquiries" className="text-xs text-[#4A3B52] font-600 hover:underline">
          View all →
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Inquiry</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Client</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden sm:table-cell">Products</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden md:table-cell">Submitted</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_INQUIRIES.map((inq) => (
              <tr key={inq.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-tabular font-600 text-xs">{inq.inquiryNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-500 text-foreground text-xs">{inq.clientCompany}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  {inq.productsCount} products
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {timeRelative(inq.submittedAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${STATUS_STYLES[inq.status]}`}
                  >
                    {inq.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/staff/sourcing/inquiries/${inq.id}`}
                    className="text-xs text-[#4A3B52] font-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
