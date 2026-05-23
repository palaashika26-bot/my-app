import React from 'react';

export type OrderStatus =
  | 'Request Submitted' |'Quotation in Progress' |'Awaiting Approval' |'Payment Pending' |'Payment Confirmed' |'Sourcing' |'At China Warehouse' |'Repacking Warehouse' |'Ready for Shipping' |'Ready for Logistics' |'Return from China' |'Shipped from China' |'In Transit' |'Arrived India Warehouse' |'Out for Delivery' |'Completed' |'Exception' |'Cancelled';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<OrderStatus, { className: string; dot: string }> = {
  'Request Submitted': {
    className: 'status-submitted',
    dot: 'bg-yellow-500',
  },
  'Quotation in Progress': {
    className: 'status-progress',
    dot: 'bg-[#7a9e9f]',
  },
  'Awaiting Approval': {
    className: 'status-approval',
    dot: 'bg-yellow-600',
  },
  'Payment Pending': {
    className: 'status-payment',
    dot: 'bg-[#7a9e9f]',
  },
  'Payment Confirmed': {
    className: 'status-payment',
    dot: 'bg-[#6b8f90]',
  },
  Sourcing: {
    className: 'status-sourcing',
    dot: 'bg-indigo-500',
  },
  'At China Warehouse': {
    className: 'status-warehouse',
    dot: 'bg-cyan-600',
  },
  'Repacking Warehouse': {
    className: 'status-warehouse',
    dot: 'bg-cyan-700',
  },
  'Ready for Shipping': {
    className: 'status-shipping',
    dot: 'bg-[#4A3B52]',
  },
  'Ready for Logistics': {
    className: 'status-shipping',
    dot: 'bg-amber-500',
  },
  'Return from China': {
    className: 'status-exception',
    dot: 'bg-rose-600',
  },
  Cancelled: {
    className: 'status-exception',
    dot: 'bg-slate-500',
  },
  'Shipped from China': {
    className: 'status-transit',
    dot: 'bg-[#1A1423]',
  },
  'In Transit': {
    className: 'status-transit',
    dot: 'bg-sky-600',
  },
  'Arrived India Warehouse': {
    className: 'status-india',
    dot: 'bg-green-600',
  },
  'Out for Delivery': {
    className: 'status-delivery',
    dot: 'bg-green-500',
  },
  Completed: {
    className: 'status-completed',
    dot: 'bg-emerald-600',
  },
  Exception: {
    className: 'status-exception',
    dot: 'bg-red-500',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig['Request Submitted'];
  const sizeClass = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[0.68rem]';

  return (
    <span
      className={`badge ${config.className} ${sizeClass} inline-flex items-center gap-1.5`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}