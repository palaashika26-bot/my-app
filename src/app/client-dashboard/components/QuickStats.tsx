'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, MapPin, Clock, CheckCircle2, Warehouse } from 'lucide-react';
import { getOrders } from '@/lib/ordersStore';
import type { OrderRow } from '@/lib/ordersStore';

const PIPELINE_STAGES = [
  {
    id: 'china-wh',
    label: 'China Warehouse',
    statuses: ['At China Warehouse'],
    icon: Package,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    id: 'consolidation',
    label: 'Consolidation',
    statuses: ['China Consolidation Warehouse', 'Repacking Warehouse'],
    icon: Warehouse,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    id: 'in-transit',
    label: 'In Transit',
    statuses: ['Shipped from China', 'In Transit'],
    icon: MapPin,
    color: 'text-[#5c5470]',
    bg: 'bg-[#f0eef8]',
  },
  {
    id: 'india-wh',
    label: 'India Warehouse',
    statuses: ['Arrived India Warehouse'],
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    id: 'delivery',
    label: 'Out for Delivery',
    statuses: ['Out for Delivery'],
    icon: Clock,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
];

export default function QuickStats() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  const totalInPipeline = orders.filter(o =>
    PIPELINE_STAGES.some(s => s.statuses.includes(o.status))
  ).length;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-600 text-foreground">Pipeline Overview</h2>
        <span className="text-xs text-muted-foreground">Live status</span>
      </div>

      {/* Horizontal stage cards */}
      <div className="grid grid-cols-5 gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const count = orders.filter(o => stage.statuses.includes(o.status)).length;
          return (
            <div
              key={stage.id}
              onClick={() => router.push('/client-dashboard/orders?view=pipeline')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.bg}`}>
                <stage.icon className={`w-4 h-4 ${stage.color}`} aria-hidden="true" />
              </div>
              <span className={`text-xl font-700 font-tabular leading-none ${count > 0 ? stage.color : 'text-muted-foreground'}`}>
                {count}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* China → India pipeline progress bar */}
      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-base">🇨🇳</span>
          <span className="font-500">China</span>
        </div>
        <div className="flex-1 flex items-center gap-1">
          {[
            { w: '25%', color: 'bg-cyan-400' },
            { w: '15%', color: 'bg-[#5c5470]' },
            { w: '60%', color: 'bg-muted' },
          ].map((seg, i) => (
            <div
              key={`pipeline-seg-${i}`}
              className={`h-1.5 rounded-full ${seg.color}`}
              style={{ width: seg.w }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-500">India</span>
          <span className="text-base">🇮🇳</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[11px] text-muted-foreground">
          {totalInPipeline > 0
            ? `${totalInPipeline} shipment${totalInPipeline !== 1 ? 's' : ''} in pipeline`
            : 'No active shipments in pipeline'}
        </p>
        <Link
          href="/client-dashboard/orders?view=pipeline"
          className="text-[11px] font-500 hover:underline"
          style={{ color: '#c17b5c' }}
        >
          View Pipeline Details →
        </Link>
      </div>
    </div>
  );
}
