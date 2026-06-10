'use client';

import { useState } from 'react';
import { CheckCircle2, Package, Plane, Truck, Warehouse, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  logisticsApi,
  phaseIndex,
  LOGISTICS_PHASES,
  type LogisticsPhase,
  type DeliveryMode,
} from '@/lib/api/logistics.api';

interface LogisticsPhaseTimelineProps {
  logisticsId: string;
  currentPhase?: string | null;
  completedPhases?: string[];
  deliveryMode?: string | null;
  deliveryAddress?: string | null;
  status: string;
  isAdminOrStaff: boolean;
  isClient: boolean;
  onUpdate?: () => void;
}

const PHASE_ICONS: Record<string, React.ComponentType<any>> = {
  AT_WAREHOUSE: Package,
  FLIGHT_BOOKED: Plane,
  IN_TRANSIT: Truck,
  INDIA_WAREHOUSE: Warehouse,
};

export default function LogisticsPhaseTimeline({
  logisticsId,
  currentPhase,
  completedPhases = [],
  deliveryMode,
  deliveryAddress,
  status,
  isAdminOrStaff,
  isClient,
  onUpdate,
}: LogisticsPhaseTimelineProps) {
  const { addToast } = useToast();
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<DeliveryMode>(deliveryMode as DeliveryMode || 'PICKUP');
  const [addrInput, setAddrInput] = useState(deliveryAddress || '');
  const [formOpen, setFormOpen] = useState(false);

  const currentIdx = phaseIndex(currentPhase);
  const completed = new Set(completedPhases);

  async function handleAdvance(phase: LogisticsPhase) {
    setPhaseLoading(true);
    try {
      await logisticsApi.updatePhase(logisticsId, phase);
      addToast({ type: 'success', title: 'Phase updated' });
      onUpdate?.();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Could not update phase.' });
    } finally { setPhaseLoading(false); }
  }

  async function handleSetDeliveryMode() {
    if (selectedMode === 'DELIVERY' && !addrInput.trim()) {
      addToast({ type: 'warning', title: 'Address required', description: 'Enter a delivery address for DELIVERY mode.' });
      return;
    }
    setDeliveryLoading(true);
    try {
      await logisticsApi.setDeliveryMode(logisticsId, selectedMode, selectedMode === 'DELIVERY' ? addrInput.trim() : undefined);
      addToast({ type: 'success', title: 'Delivery preference saved' });
      onUpdate?.();
      setDeliveryOpen(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed', description: err?.response?.data?.message || 'Could not save delivery mode.' });
    } finally { setDeliveryLoading(false); }
  }

  if (status !== 'CONFIRMED') return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4">
      <h3 className="font-700 text-base">Shipment Progress</h3>

      {/* Timeline */}
      <ol className="space-y-0">
        {LOGISTICS_PHASES.map((phase, idx) => {
          const Icon = PHASE_ICONS[phase.id] || Package;
          const isCompleted = completed.has(phase.id);
          const isCurrent = phase.id === currentPhase;
          const isLast = idx === LOGISTICS_PHASES.length - 1;
          const canAdvance = isAdminOrStaff && idx === currentIdx + 1;

          return (
            <li key={phase.id} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                  isCurrent
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted border-2 border-muted-foreground/20'
                }`}>
                  {isCompleted || isCurrent ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 ${idx < currentIdx ? 'bg-emerald-400' : 'bg-border'}`} style={{ minHeight: '24px' }} />
                )}
              </div>
              <div className={`flex-1 pb-5 ${isLast ? 'pb-1' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-500 ${isCurrent ? 'font-700 text-emerald-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {phase.label}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                      Current
                    </span>
                  )}
                  {isCompleted && !isCurrent && (
                    <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                      Done
                    </span>
                  )}
                </div>
                {isAdminOrStaff && canAdvance && (
                  <button
                    onClick={() => handleAdvance(phase.id)}
                    disabled={phaseLoading}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#1A1423] transition-colors disabled:opacity-60"
                  >
                    {phaseLoading ? 'Updating…' : `Mark as ${phase.label}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Delivery mode — shown to clients */}
      {isClient && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setDeliveryOpen(p => !p)}
            className="flex items-center gap-2 text-sm font-600 text-[#4A3B52] hover:text-[#3a2d40] transition-colors"
          >
            {deliveryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Delivery Preference
          </button>

          {deliveryOpen && (
            <div className="mt-4 space-y-3">
              {deliveryMode ? (
                <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-xl p-4 text-sm">
                  <p className="font-600 mb-2">Current: {deliveryMode === 'PICKUP' ? 'Pickup from India Warehouse' : 'Home Delivery'}</p>
                  {deliveryMode === 'DELIVERY' && deliveryAddress && (
                    <p className="text-muted-foreground text-xs">{deliveryAddress}</p>
                  )}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                  <input type="radio" name="deliveryMode" checked={selectedMode === 'PICKUP'} onChange={() => setSelectedMode('PICKUP')} className="flex-shrink-0" />
                  <div>
                    <p className="text-sm font-600">Pickup from India Warehouse</p>
                    <p className="text-xs text-muted-foreground">Collect your shipment from our India warehouse</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                  <input type="radio" name="deliveryMode" checked={selectedMode === 'DELIVERY'} onChange={() => setSelectedMode('DELIVERY')} className="flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-600">Home Delivery</p>
                    <p className="text-xs text-muted-foreground">Ship directly to your address</p>
                    {selectedMode === 'DELIVERY' && (
                      <textarea
                        value={addrInput}
                        onChange={e => setAddrInput(e.target.value)}
                        className="input-field w-full text-sm mt-2 resize-none"
                        rows={2}
                        placeholder="Enter your full delivery address with pincode"
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>
              </div>
              <button
                onClick={handleSetDeliveryMode}
                disabled={deliveryLoading}
                className="px-4 py-2 rounded-lg bg-[#5c5470] text-white text-sm font-600 hover:bg-[#4A3B52] transition-colors disabled:opacity-60"
              >
                {deliveryLoading ? 'Saving…' : 'Save Delivery Preference'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin/staff phase controls */}
      {isAdminOrStaff && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setFormOpen(p => !p)}
            className="flex items-center gap-2 text-sm font-600 text-[#4A3B52] hover:text-[#3a2d40] transition-colors"
          >
            {formOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Phase Controls
          </button>
          {formOpen && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>Use the buttons on each phase above to advance the shipment.</p>
              <p className="text-xs mt-1">Phases must be completed in order.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
