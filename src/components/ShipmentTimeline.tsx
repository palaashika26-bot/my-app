'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const STAGES = [
  { key: 'order_placed',                  label: 'Order Placed' },
  { key: 'payment_confirmed',             label: 'Payment Confirmed' },
  { key: 'sourcing',                      label: 'Sourcing' },
  { key: 'at_china_warehouse',            label: 'At China Warehouse' },
  { key: 'china_consolidation_warehouse', label: 'China Consolidation Warehouse' },
  { key: 'repacking_warehouse',           label: 'Repacking Warehouse' },
  { key: 'shipped_from_china',            label: 'Shipped from China' },
  { key: 'in_transit',                    label: 'In Transit' },
  { key: 'arrived_india_warehouse',       label: 'Arrived India Warehouse' },
  { key: 'out_for_delivery',              label: 'Out for Delivery' },
  { key: 'completed',                     label: 'Completed' },
];

// Maps each timeline stage key → the order status string used by the admin dropdown
const STAGE_TO_ORDER_STATUS: Record<string, string> = {
  order_placed:                  'Payment Confirmed',
  payment_confirmed:             'Payment Confirmed',
  sourcing:                      'Sourcing',
  at_china_warehouse:            'At China Warehouse',
  china_consolidation_warehouse: 'At China Warehouse',
  repacking_warehouse:           'Repacking Warehouse',
  shipped_from_china:            'Shipped from China',
  in_transit:                    'Shipped from China',
  arrived_india_warehouse:       'Arrived India Warehouse',
  out_for_delivery:              'Out for Delivery',
  completed:                     'Completed',
};

// Maps order display status → the highest STAGES index that should be green
const ORDER_STATUS_TO_STAGE_IDX: Record<string, number> = {
  'Payment Confirmed':             1,
  'Order Confirmed':               1,
  'Sourcing':                      2,
  'At China Warehouse':            3,
  'China Consolidation Warehouse': 4,
  'Repacking Warehouse':           5,
  'Ready for Shipping':            5,
  'Ready for Logistics':           5,
  'Shipped from China':            6,
  'In Transit':                    7,
  'Arrived India Warehouse':       8,
  'Out for Delivery':              9,
  'Completed':                     10,
};

interface TrackingEntry {
  id: string;
  stage: string;
  statusNote?: string | null;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

interface ShipmentTimelineProps {
  orderId: string;
  isAdminOrStaff: boolean;
  /** Current order display status — used to show stages immediately without waiting for fetch */
  orderStatus?: string;
  /** Called after a stage is posted so the parent can update its local status state */
  onStatusChange?: (newStatus: string) => void;
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('elios_access_token') ?? '';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDefaultDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function ShipmentTimeline({ orderId, isAdminOrStaff, orderStatus, onStatusChange }: ShipmentTimelineProps) {
  const [trackingData, setTrackingData] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin / staff form state
  const [selectedStage, setSelectedStage] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function fetchTimeline() {
    try {
      const res = await fetch(`/api/tracking/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) {
        setTrackingData(json.data ?? []);
        setError(null);
      } else {
        setError(json.error ?? json.message ?? 'Failed to load tracking data');
      }
    } catch {
      setError('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Set default datetime when form opens
  useEffect(() => {
    if (formOpen && !updatedAt) {
      setUpdatedAt(getDefaultDateTimeLocal());
    }
  }, [formOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedStage) {
      setFormError('Please select a stage.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tracking/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          stage: selectedStage,
          statusNote: statusNote.trim() || undefined,
          updatedAt: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        // ── Optimistic UI: update timeline instantly ──────────────────────────
        const optimisticEntry: TrackingEntry = {
          id: json.data?.id ?? `optimistic-${Date.now()}`,
          stage: selectedStage,
          statusNote: statusNote.trim() || undefined,
          updatedBy: 'you',
          updatedAt: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        setTrackingData((prev) => {
          const exists = prev.find((t) => t.stage === selectedStage);
          return exists
            ? prev.map((t) => (t.stage === selectedStage ? optimisticEntry : t))
            : [...prev, optimisticEntry];
        });

        // Backend already updated order.status + completedStages atomically.
        // Fire the callback so the detail page dropdown updates instantly.
        const displayStatus = json.displayStatus ?? STAGE_TO_ORDER_STATUS[selectedStage];
        if (displayStatus) {
          onStatusChange?.(displayStatus);
        }

        // Bust the orders list cache so both admin & client list pages show
        // the correct status on their next fetch / visibilitychange.
        import('@/lib/api/ordersCache').then(({ ordersCache }) => ordersCache.clear()).catch(() => {});

        // Reset form and show success immediately
        setFormSuccess(true);
        setSelectedStage('');
        setStatusNote('');
        setUpdatedAt(getDefaultDateTimeLocal());
        setSubmitting(false);
        setTimeout(() => setFormSuccess(false), 3000);

        // Reconcile timeline with server in background
        fetchTimeline();

        return;
      } else {
        setFormError(json.error ?? json.message ?? 'Failed to post update');
      }
    } catch {
      setFormError('Failed to post update');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this tracking stage?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/tracking/stage/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        await fetchTimeline();
      }
    } catch {}
    setDeleting(null);
  }

  // Index from tracking records (explicit posts)
  const trackingLastIdx = STAGES.reduce((max, s, i) =>
    trackingData.find((t) => t.stage === s.key) ? i : max, -1);

  // Index from the order status dropdown — drives display immediately (no wait for fetch)
  const statusLastIdx = orderStatus ? (ORDER_STATUS_TO_STAGE_IDX[orderStatus] ?? -1) : -1;

  // Use whichever is furthest ahead
  const effectiveLastIdx = Math.max(trackingLastIdx, statusLastIdx);

  // Stages not yet posted (available for selection in admin form)
  const postedStageKeys = trackingData.map((t) => t.stage);
  const availableStages = STAGES.filter((s) => !postedStageKeys.includes(s.key));
  const allStagesDone = availableStages.length === 0;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-5">
      <h3 className="font-700 text-base">Shipment Timeline</h3>

      {/* ── Timeline — renders immediately using orderStatus; enriches with dates once loaded */}
      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : (() => {
        const lastCompletedIdx = effectiveLastIdx;

        return (
        <ol className="space-y-0">
          {STAGES.map((stage, idx) => {
            const stageData = trackingData.find((t) => t.stage === stage.key);
            // Cumulative: all stages UP TO the furthest known stage are green
            const isCompleted = idx <= lastCompletedIdx;
            const isLatest = idx === lastCompletedIdx && lastCompletedIdx >= 0;
            const isLast = idx === STAGES.length - 1;

            return (
              <li key={stage.key} className="flex gap-3">
                {/* Left column: line + circle */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                      isLatest
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted border-2 border-muted-foreground/20'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 my-1 ${
                        idx < lastCompletedIdx ? 'bg-emerald-400' : 'bg-border'
                      }`}
                      style={{ minHeight: '24px' }}
                    />
                  )}
                </div>

                {/* Right column: content */}
                <div className={`flex-1 pb-5 ${isLast ? 'pb-1' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-sm font-500 ${
                        isLatest
                          ? 'font-700 text-emerald-700'
                          : isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {isLatest && (
                      <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                        Current
                      </span>
                    )}
                    {isAdminOrStaff && isCompleted && stageData && (
                      <button
                        onClick={() => handleDelete(stageData.id)}
                        disabled={deleting === stageData.id}
                        className="ml-auto text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Remove this stage"
                      >
                        {deleting === stageData.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  {isCompleted && stageData && (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(stageData.updatedAt)}
                      </p>
                      {stageData.statusNote && (
                        <p className="text-[11px] text-gray-500 italic">{stageData.statusNote}</p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        );
      })()}

      {/* ── Admin / Staff Update Form ─────────────────────────────────── */}
      {isAdminOrStaff && !error && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setFormOpen((p) => !p)}
            className="flex items-center gap-2 text-sm font-600 text-[#4A3B52] hover:text-[#3a2d40] transition-colors"
          >
            {formOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Update Shipment Stage
          </button>

          {formOpen && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {allStagesDone ? (
                <p className="text-sm text-emerald-700 font-500">
                  ✓ All stages have been completed for this order.
                </p>
              ) : (
                <>
                  {/* Stage dropdown */}
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">
                      Select Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input-field w-full text-sm"
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                    >
                      <option value="">— Choose a stage —</option>
                      {availableStages.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">
                      Date &amp; Time of Update
                    </label>
                    <input
                      type="datetime-local"
                      className="input-field w-full text-sm"
                      value={updatedAt}
                      onChange={(e) => setUpdatedAt(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave as-is to use current date &amp; time
                    </p>
                  </div>

                  {/* Status Note */}
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">
                      Status Note <span className="text-muted-foreground font-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      placeholder="e.g. Cleared Mumbai customs at 3PM"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>

                  {/* Feedback */}
                  {formError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}
                  {formSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Stage updated successfully!
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Posting…' : 'Post Update'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
