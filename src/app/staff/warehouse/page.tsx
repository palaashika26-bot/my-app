'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Package, ClipboardList, CheckCircle, Clock, Sun } from 'lucide-react';

interface DemoOrder {
  orderId: string;
  clientName: string;
  items: string[];
  stage: string;
  assignedAt: string;
  packagingListUploaded: boolean;
  reportSubmitted: boolean;
}

const DEMO_ORDERS: DemoOrder[] = [
  {
    orderId: 'BK-ORD-2024-0274',
    clientName: 'Sunita Verma',
    items: ['LED Strip Light (RGB, 5m) x50', 'USB-C Cable (Braided) x100'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-18',
    packagingListUploaded: true,
    reportSubmitted: false,
  },
  {
    orderId: 'BK-ORD-2024-0268',
    clientName: 'Amit Patel',
    items: ['Wireless Earbuds x25', 'Phone Case x200'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-17',
    packagingListUploaded: true,
    reportSubmitted: true,
  },
  {
    orderId: 'BK-ORD-2024-0261',
    clientName: 'Rajesh Kumar',
    items: ['Steel Bottles x100'],
    stage: 'Repacking Warehouse',
    assignedAt: '2026-05-16',
    packagingListUploaded: false,
    reportSubmitted: false,
  },
];

function StatusChip({ order }: { order: DemoOrder }) {
  if (order.reportSubmitted) {
    return (
      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        Report Submitted
      </span>
    );
  }
  if (order.packagingListUploaded) {
    return (
      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        Packaging List Ready
      </span>
    );
  }
  return (
    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Awaiting Packaging List
    </span>
  );
}

export default function WarehouseDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<DemoOrder[]>([]);
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
    try {
      const stored = localStorage.getItem('warehouse-demo-orders');
      if (!stored) {
        localStorage.setItem('warehouse-demo-orders', JSON.stringify(DEMO_ORDERS));
        setOrders(DEMO_ORDERS);
      } else {
        setOrders(JSON.parse(stored));
      }
    } catch {
      setOrders(DEMO_ORDERS);
    }
  }, []);

  const assigned = orders.length;
  const pending = orders.filter((o) => !o.reportSubmitted).length;
  const submitted = orders.filter((o) => o.reportSubmitted).length;
  const awaitingAck = orders.filter((o) => {
    if (!o.reportSubmitted) return false;
    try {
      const replies = localStorage.getItem(`warehouse-replies-${o.orderId}`);
      return !replies || JSON.parse(replies).length === 0;
    } catch {
      return true;
    }
  }).length;

  const statCards = [
    {
      label: 'Assigned Orders',
      value: assigned,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      href: '/staff/warehouse/orders',
    },
    {
      label: 'Pending Review',
      value: pending,
      icon: ClipboardList,
      color: 'bg-amber-50 text-amber-600',
      href: '/staff/warehouse/orders?filter=pending',
    },
    {
      label: 'Reports Submitted',
      value: submitted,
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-600',
      href: '/staff/warehouse/orders?filter=submitted',
    },
    {
      label: 'Awaiting Acknowledgement',
      value: awaitingAck,
      icon: Clock,
      color: 'bg-purple-50 text-purple-600',
      href: '/staff/warehouse/orders?filter=awaiting',
    },
  ];

  const displayName = user?.name ?? 'Warehouse Staff';

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <h1 className="text-xl font-700 text-foreground">Welcome back, {displayName} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-yellow-500" />
          {today} • 33°C Sunny in Mumbai
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            onClick={() => router.push(card.href)}
            className="bg-card rounded-xl border border-border shadow-card p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-700 text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Assigned Orders List */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-700 text-foreground">Assigned Orders</h2>
        <Link
          href="/staff/warehouse/orders"
          className="text-xs text-[#4A3B52] font-600 hover:underline"
        >
          View all →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">No orders assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            The admin will assign orders to you. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.orderId}
              className="bg-card rounded-xl border border-border shadow-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-tabular font-700 text-sm">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.clientName}</p>
                </div>
                <StatusChip order={order} />
              </div>
              <p className="text-xs text-muted-foreground mb-1 truncate">
                {order.items.slice(0, 2).join(', ')}
                {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
                    {order.stage}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Assigned{' '}
                    {new Date(order.assignedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <Link
                  href={`/staff/warehouse/orders/${order.orderId}`}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  View Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
