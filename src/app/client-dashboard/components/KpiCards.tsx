'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { kpiData } from '@/lib/mockData';
import Icon from '@/components/ui/AppIcon';


interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext: string;
  accentClass: string;
  iconBg: string;
  iconColor: string;
  subtextColor?: string;
  href?: string;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  accentClass,
  iconBg,
  iconColor,
  subtextColor = 'text-muted-foreground',
  href,
}: KpiCardProps) {
  const router = useRouter();
  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={`bg-card rounded-xl p-5 shadow-card border border-border card-hover ${accentClass}${href ? ' cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200' : ''}`}
      role="region"
      aria-label={label}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider leading-none">
            {label}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>
      <p className="text-3xl font-700 text-foreground font-tabular leading-none mb-2">
        {value}
      </p>
      <p className={`text-xs font-500 ${subtextColor}`}>{subtext}</p>
    </div>
  );
}

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={ShoppingBag}
        label="Active Orders"
        value={kpiData.activeOrders.value}
        subtext={kpiData.activeOrders.change}
        accentClass="kpi-card-accent-orange"
        iconBg="bg-[#fdf2ed]"
        iconColor="text-[#c17b5c]"
        href="/client-dashboard/orders"
      />
      <KpiCard
        icon={CreditCard}
        label="Pending Payments"
        value={kpiData.pendingPayments.value}
        subtext={kpiData.pendingPayments.change}
        accentClass="kpi-card-accent-yellow"
        iconBg="bg-yellow-50"
        iconColor="text-yellow-600"
        subtextColor="text-yellow-600"
        href="/client-dashboard/orders?filter=pending-payment"
      />
      <KpiCard
        icon={Clock}
        label="Awaiting Approval"
        value={kpiData.awaitingApproval.value}
        subtext={kpiData.awaitingApproval.change}
        accentClass="kpi-card-accent-blue"
        iconBg="bg-[#e4f4f4]"
        iconColor="text-[#4a9e9f]"
        subtextColor="text-[#4a9e9f]"
        href="/client-dashboard/requests?filter=awaiting-approval"
      />
      <KpiCard
        icon={CheckCircle}
        label="Completed"
        value={kpiData.completed.value}
        subtext={kpiData.completed.change}
        accentClass="kpi-card-accent-green"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        subtextColor="text-emerald-600"
        href="/client-dashboard/orders?filter=completed"
      />
    </div>
  );
}