import React from 'react';
import ClientTopbar from '@/components/ClientTopbar';
import ClientBottomNav from '@/components/ClientBottomNav';
import KpiCards from './components/KpiCards';
import RecentRequestsTable from './components/RecentRequestsTable';
import RecentOrdersTable from './components/RecentOrdersTable';
import DashboardWelcomeBanner from './components/DashboardWelcomeBanner';
import QuickStats from './components/QuickStats';

export default function ClientDashboardPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col fade-in">
      <ClientTopbar />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16 py-6 pb-24 md:pb-8">
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
      </main>
      <ClientBottomNav />
    </div>
  );
}
