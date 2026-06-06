'use client';
import React from 'react';
import ClientLayout from '@/components/ClientLayout';
import KpiCards from './components/KpiCards';
import RecentRequestsTable from './components/RecentRequestsTable';
import RecentOrdersTable from './components/RecentOrdersTable';
import DashboardWelcomeBanner from './components/DashboardWelcomeBanner';
import QuickStats from './components/QuickStats';
import { useDashboardData } from './useDashboardData';

export default function ClientDashboardPage() {
  const { orders, requests, kpis, loading } = useDashboardData();

  return (
    <ClientLayout>
      <div className="flex flex-col gap-6">
        <DashboardWelcomeBanner
          awaitingApproval={kpis.awaitingApproval.value}
          pendingPayments={kpis.pendingPayments.value}
        />
        <KpiCards kpis={kpis} />
        <QuickStats orders={orders} />
        <RecentRequestsTable requests={requests} loading={loading} />
        <RecentOrdersTable orders={orders} loading={loading} />
        <div className="flex items-center justify-end py-2">
          <p className="text-xs text-muted-foreground">EliosWholesale — Your Bridge from China to India</p>
        </div>
      </div>
    </ClientLayout>
  );
}
