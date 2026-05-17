'use client';
import React, { ReactNode } from 'react';
import ClientTopbar from '@/components/ClientTopbar';
import ClientBottomNav from '@/components/ClientBottomNav';
import ClientSidebar from '@/components/ClientSidebar';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col fade-in">
      <ClientTopbar />
      <div className="flex flex-1">
        <ClientSidebar />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8">
          {children}
        </main>
      </div>
      <ClientBottomNav />
    </div>
  );
}
