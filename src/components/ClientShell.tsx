'use client';
import React, { ReactNode } from 'react';
import ClientTopbar from '@/components/ClientTopbar';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col fade-in">
      <ClientTopbar />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8 w-full">
        {children}
      </main>
      <ClientBottomNav />
    </div>
  );
}
