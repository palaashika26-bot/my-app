'use client';
import React from 'react';
import { Package, MapPin, Clock, CheckCircle2, Warehouse } from 'lucide-react';

const pipelineStats = [
  {
    id: 'stat-china-warehouse',
    icon: Package,
    label: 'At China Warehouse',
    count: 2,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    dot: 'bg-cyan-500',
  },
  {
    id: 'stat-china-consolidation',
    icon: Warehouse,
    label: 'China Consolidation Warehouse',
    count: 1,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    dot: 'bg-indigo-500',
  },
  {
    id: 'stat-in-transit',
    icon: MapPin,
    label: 'In Transit (Shipped)',
    count: 1,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    dot: 'bg-orange-500',
  },
  {
    id: 'stat-india-warehouse',
    icon: CheckCircle2,
    label: 'India Warehouse',
    count: 1,
    color: 'text-green-600',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
  },
  {
    id: 'stat-out-delivery',
    icon: Clock,
    label: 'Out for Delivery',
    count: 1,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
];

export default function QuickStats() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-600 text-foreground">Pipeline Overview</h2>
        <span className="text-xs text-muted-foreground">Live status</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {pipelineStats?.map((stat) => (
          <div
            key={stat?.id}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors cursor-default"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat?.bg}`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat?.color}`} aria-hidden="true" />
            </div>
            <span className={`text-xl font-700 font-tabular ${stat?.color} leading-none`}>
              {stat?.count}
            </span>
            <span className="text-[11px] text-muted-foreground font-500 text-center mt-1 leading-tight">
              {stat?.label}
            </span>
          </div>
        ))}
      </div>
      {/* China → India visual */}
      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-base">🇨🇳</span>
          <span className="font-500">China</span>
        </div>
        <div className="flex-1 flex items-center gap-1">
          {[
            { w: '25%', color: 'bg-cyan-400' },
            { w: '15%', color: 'bg-orange-400' },
            { w: '60%', color: 'bg-muted' },
          ]?.map((seg, i) => (
            <div
              key={`pipeline-seg-${i}`}
              className={`h-1.5 rounded-full ${seg?.color}`}
              style={{ width: seg?.w }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-500">India</span>
          <span className="text-base">🇮🇳</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-1.5">
        6 shipments currently in the China → India pipeline
      </p>
    </div>
  );
}