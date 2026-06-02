'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import { Package, ClipboardList, CheckCircle, Clock, Sun } from 'lucide-react';
import { adminApi, type AdminStats } from '@/lib/api/admin.api';

interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string;
  completedStages: string[];
  createdAt: string;
  client?: { companyName?: string; user?: { firstName: string; lastName: string } };
  items?: { product?: { name?: string }; notes?: string; quantity: number }[];
  warehouseReport?: { reportSubmitted?: boolean; sentToChina?: boolean } | null;
}

function getStatusChip(order: ApiOrder) {
  if (order.warehouseReport?.sentToChina) {
    return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sent to China</span>;
  }
  if (order.warehouseReport?.reportSubmitted) {
    return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Report Submitted</span>;
  }
  const inRepacking = order.completedStages?.includes('Repacking Warehouse') || order.status === 'REPACKING';
  if (inRepacking) {
    return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Awaiting Report</span>;
  }
  return <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{order.status}</span>;
}

export default function WarehouseDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );

    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

    async function fetchOrders() {
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        const all: ApiOrder[] = json?.data ?? [];
        // Show orders that are in REPACKING stage or have completedStages including 'Repacking Warehouse'
        const warehouseOrders = all.filter((o) =>
          o.status === 'REPACKING' ||
          o.completedStages?.includes('Repacking Warehouse')
        );
        setOrders(warehouseOrders);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
    adminApi.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => {});
  }, []);

  const total = orders.length;
  const pending = orders.filter(o => !o.warehouseReport?.reportSubmitted && !o.warehouseReport?.sentToChina).length;
  const submitted = orders.filter(o => o.warehouseReport?.reportSubmitted).length;

  const statCards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? total, icon: Package, color: 'bg-blue-50 text-blue-600', href: '/staff/warehouse/orders' },
    { label: 'Active Orders', value: stats?.activeOrders ?? pending, icon: ClipboardList, color: 'bg-amber-50 text-amber-600', href: '/staff/warehouse/orders?filter=pending' },
    { label: 'Reports Submitted', value: submitted, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', href: '/staff/warehouse/orders?filter=submitted' },
    { label: 'Pending Inquiries', value: stats?.pendingInquiries ?? 0, icon: Clock, color: 'bg-purple-50 text-purple-600', href: '/staff/warehouse/orders?filter=awaiting' },
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
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
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
        <Link href="/staff/warehouse/orders" className="text-xs text-[#4A3B52] font-600 hover:underline">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">No orders assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders in the Repacking Warehouse stage will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const clientName = order.client?.companyName
              ?? (order.client?.user ? `${order.client.user.firstName} ${order.client.user.lastName}` : '—');
            const itemLabels = (order.items ?? [])
              .slice(0, 2)
              .map(i => `${i.product?.name ?? i.notes ?? 'Item'} x${i.quantity}`)
              .join(', ');
            const extraItems = (order.items?.length ?? 0) - 2;
            const currentStage = order.completedStages?.length > 0
              ? order.completedStages[order.completedStages.length - 1]
              : 'Repacking Warehouse';

            return (
              <div key={order.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-tabular font-700 text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
                  </div>
                  {getStatusChip(order)}
                </div>
                {itemLabels && (
                  <p className="text-xs text-muted-foreground mb-1 truncate">
                    {itemLabels}{extraItems > 0 ? ` +${extraItems} more` : ''}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-[#4A3B52]/10 text-[#4A3B52]">
                      {currentStage}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Created {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <Link
                    href={`/staff/warehouse/orders/${order.id}`}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    View Order
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
