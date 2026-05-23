'use client';
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import ExceptionChat from './ExceptionChat';
import ExceptionItemTracker from './ExceptionItemTracker';

interface ExceptionPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderLabel: string;
  isAdmin: boolean;
  orderItems?: { name: string; qty?: number }[];
}

export default function ExceptionPanelModal({
  isOpen,
  onClose,
  orderId,
  orderLabel,
  isAdmin,
  orderItems,
}: ExceptionPanelModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card rounded-2xl w-full max-w-2xl mb-4 mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-700 text-sm">Exception — {orderLabel}</h2>
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin view' : 'Client view'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <ExceptionChat orderId={orderId} isAdmin={isAdmin} />
          <ExceptionItemTracker orderId={orderId} isAdmin={isAdmin} orderItems={orderItems} />
        </div>
      </div>
    </div>
  );
}
