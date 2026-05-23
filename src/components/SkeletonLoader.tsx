'use client';
import React from 'react';

interface SkeletonProps {
  className?: string;
}

function SkeletonBase({ className = '' }: SkeletonProps) {
  return <div className={`bg-[#e8e4f0] animate-pulse rounded ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border">
      <div className="flex items-start justify-between mb-4">
        <SkeletonBase className="h-4 w-28" />
        <SkeletonBase className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBase className="h-8 w-16 mb-2" />
      <SkeletonBase className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`sk-col-${i}`} className="px-4 py-3">
          <SkeletonBase className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={`sk-row-${i}`} cols={cols} />
      ))}
    </>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/6', 'w-2/6'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase key={`sk-text-${i}`} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonImage({ className = 'aspect-square' }: { className?: string }) {
  return <SkeletonBase className={`${className} w-full`} />;
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3 lg:grid-cols-${Math.min(count, 4)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={`sk-kpi-${i}`} />
      ))}
    </div>
  );
}

export function SkeletonOrderDetail() {
  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <SkeletonBase className="h-6 w-40" />
          <SkeletonBase className="h-6 w-20 rounded-full" />
        </div>
        <SkeletonBase className="h-4 w-48" />
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <SkeletonBase className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`sk-stage-${i}`} className="flex items-start gap-3">
              <SkeletonBase className="w-5 h-5 rounded-full flex-shrink-0" />
              <SkeletonBase className={`h-4 ${i % 2 === 0 ? 'w-40' : 'w-28'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SkeletonBase;
