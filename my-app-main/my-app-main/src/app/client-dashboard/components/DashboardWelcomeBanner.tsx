'use client';
import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, TrendingUp, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function DashboardWelcomeBanner() {
  const [greeting, setGreeting] = useState('Good morning');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    setCurrentTime(now.toLocaleDateString('en-IN', options));
  }, []);

  return (
    <div className="bg-primary rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 50%, rgba(249,115,22,1) 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-500 text-slate-400 font-tabular">{currentTime}</span>
        </div>
        <h1 className="text-lg font-700 text-white">
          {greeting}, Rajesh 👋
        </h1>
        <p className="text-sm text-slate-300 mt-0.5">
          You have{' '}
          <span className="text-accent font-600">3 quotations</span> awaiting your approval and{' '}
          <span className="text-yellow-400 font-600">2 pending payments</span>.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-2.5 flex-shrink-0">
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-600 transition-colors"
          aria-label="Browse product catalog"
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Browse Catalog
        </Link>
        <Link
          href="/client-dashboard/requests/new"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-orange-600 text-white text-xs font-600 transition-colors shadow-orange-glow"
          aria-label="Submit new sourcing request"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          New Request
        </Link>
      </div>
    </div>
  );
}