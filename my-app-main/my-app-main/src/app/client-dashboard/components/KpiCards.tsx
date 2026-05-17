import React from 'react';
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
}: KpiCardProps) {
  return (
    <div
      className={`bg-card rounded-xl p-5 shadow-card border border-border card-hover ${accentClass}`}
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
        iconBg="bg-orange-50"
        iconColor="text-accent"
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
      />
      <KpiCard
        icon={Clock}
        label="Awaiting Approval"
        value={kpiData.awaitingApproval.value}
        subtext={kpiData.awaitingApproval.change}
        accentClass="kpi-card-accent-blue"
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        subtextColor="text-blue-600"
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
      />
    </div>
  );
}