import React from 'react';
import ClientLayout from '@/components/ClientLayout';
import KpiCards from './components/KpiCards';
import RecentRequestsTable from './components/RecentRequestsTable';
import RecentOrdersTable from './components/RecentOrdersTable';
import DashboardWelcomeBanner from './components/DashboardWelcomeBanner';
import QuickStats from './components/QuickStats';

export default function ClientDashboardPage() {
  return (
    <ClientLayout>
      <div className="flex flex-col gap-6">
        <DashboardWelcomeBanner />
        <KpiCards />
        <QuickStats />
        <RecentRequestsTable />
        <RecentOrdersTable />
        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-muted-foreground">Last updated: 11 May 2026, 05:10 IST</p>
          <p className="text-xs text-muted-foreground">EliosWholesale v2.4 — Your Bridge from China to India</p>
        </div>
      </div>
    </ClientLayout>
  );
}
