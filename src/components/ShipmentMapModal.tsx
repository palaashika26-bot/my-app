'use client';
import React, { useEffect, useState } from 'react';
import { X, MapPin, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { statusToLocation, carrierForOrder } from '@/lib/mockData';

interface ShipmentMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderId: string;
    status: string;
    origin?: string;
    destination?: string;
    estimatedDelivery?: string;
  };
}

export default function ShipmentMapModal({ isOpen, onClose, order }: ShipmentMapModalProps) {
  const [copied, setCopied] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  const carrier = carrierForOrder(order.orderId);
  const loc = statusToLocation[order.status] ?? { label: order.origin || 'Shenzhen, China', query: 'Shenzhen China', progress: 10 };
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(loc.query)}&z=4&output=embed`;
  const origin = order.origin || 'Shenzhen, China';
  const destination = order.destination || 'Mumbai, India';

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (isOpen) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function copyTracking() {
    navigator.clipboard?.writeText(carrier.trackingNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const checkpoints = [
    { date: '08 May 2026', text: 'Departed Shenzhen Port, China', done: loc.progress >= 35 },
    { date: '09 May 2026', text: 'Entered South China Sea', done: loc.progress >= 45 },
    { date: '10 May 2026', text: 'Passing Strait of Malacca', done: loc.progress >= 55 },
    { date: '11 May 2026', text: `In ${loc.label} ${loc.progress < 100 ? '(Current)' : ''}`, done: loc.progress >= 60, current: loc.progress >= 45 && loc.progress < 80 },
    { date: '13 May 2026', text: 'Expected: JNPT Mumbai Port', done: loc.progress >= 80 },
    { date: '14 May 2026', text: 'Expected: Customs Clearance', done: loc.progress >= 90 },
    { date: '15 May 2026', text: 'Expected: Delivered', done: loc.progress >= 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto pt-4 md:pt-8 fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shipment tracking">
      <div className="bg-card rounded-2xl shadow-card-lg w-full max-w-2xl mb-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#4A3B52]" />
            <h3 className="font-700 text-foreground">Live Tracking — {order.orderId}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl overflow-hidden border border-border">
            <iframe src={mapUrl} width="100%" height="320" style={{ border: 0 }} loading="lazy" title={`Map for ${order.orderId}`} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
              <span>Current Location: <span className="font-600 text-foreground">{loc.label}</span></span>
              <span className="font-tabular">{loc.progress}%</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-[#1A1423] rounded-full transition-all duration-700" style={{ width: `${loc.progress}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#4A3B52] border-2 border-white shadow-orange-glow animate-pulse" style={{ left: `${loc.progress}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{origin}</span>
              <span className="flex items-center gap-1">{destination}<span className="w-2 h-2 rounded-full bg-emerald-500"></span></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] uppercase text-muted-foreground font-600 tracking-wider">Carrier</p>
              <p className="text-sm font-600 text-foreground mt-1">{carrier.carrier}</p>
              <p className="text-[11px] text-muted-foreground">{carrier.mode}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] uppercase text-muted-foreground font-600 tracking-wider">ETA</p>
              <p className="text-sm font-600 text-foreground mt-1">{order.estimatedDelivery || '14 May 2026'}</p>
              <p className="text-[11px] text-muted-foreground">Estimated</p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/30 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-600 tracking-wider">Tracking Number</p>
              <p className="text-sm font-tabular font-600 text-foreground mt-1">{carrier.trackingNo}</p>
            </div>
            <button onClick={copyTracking} className="flex items-center gap-1.5 text-xs font-600 text-[#4A3B52] px-3 py-2 rounded-lg hover:bg-[#4A3B52]/10">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div>
            <button onClick={() => setShowCheckpoints(v => !v)} className="flex items-center justify-between w-full text-sm font-600 text-foreground py-2">
              View checkpoints
              {showCheckpoints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showCheckpoints && (
              <div className="mt-2 space-y-2.5 fade-in">
                {checkpoints.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-5">{c.done ? '✅' : c.current ? '🔄' : '⏳'}</span>
                    <div className="flex-1">
                      <p className={`font-500 ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.text}</p>
                      <p className="text-[10px] text-muted-foreground font-tabular">{c.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Last updated: 11 May 2026, 08:30 IST</p>
        </div>
      </div>
    </div>
  );
}
