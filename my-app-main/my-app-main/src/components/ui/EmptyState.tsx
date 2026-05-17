import React from 'react';
import { PackageSearch, ShoppingBag, Truck, FileText } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type EmptyStateVariant = 'requests' | 'orders' | 'logistics' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantConfig: Record<
  EmptyStateVariant,
  { icon: React.ElementType; defaultTitle: string; defaultDescription: string }
> = {
  requests: {
    icon: FileText,
    defaultTitle: 'No sourcing requests yet',
    defaultDescription:
      'Submit your first product sourcing request and our team will prepare a quotation within 24 hours.',
  },
  orders: {
    icon: ShoppingBag,
    defaultTitle: 'No orders placed yet',
    defaultDescription:
      'Once you accept a quotation and confirm payment, your order will appear here with real-time tracking.',
  },
  logistics: {
    icon: Truck,
    defaultTitle: 'No logistics requests yet',
    defaultDescription:
      'Submit a logistics-only request if you have products ready in China and need them shipped to India.',
  },
  generic: {
    icon: PackageSearch,
    defaultTitle: 'Nothing here yet',
    defaultDescription: 'Data will appear here once available.',
  },
};

export default function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-600 text-foreground mb-1.5">
        {title ?? config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        {description ?? config.defaultDescription}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}