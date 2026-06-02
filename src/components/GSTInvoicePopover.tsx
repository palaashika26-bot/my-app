'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

export interface GSTData {
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  clientGSTIN: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGST: number;
  grandTotal: number;
}

interface GSTInvoicePopoverProps {
  order: any;
  onClose: () => void;
  onSave: (gstData: GSTData) => void;
  onDownload: (gstData: GSTData) => void;
  existingGSTData?: GSTData | null;
}

function fmtINR(n: number): string {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function GSTInvoicePopover({
  order,
  onClose,
  onSave,
  onDownload,
  existingGSTData,
}: GSTInvoicePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [gstRate, setGstRate] = useState(existingGSTData?.gstRate ?? 18);
  const [clientGSTIN, setClientGSTIN] = useState(existingGSTData?.clientGSTIN ?? '');

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const taxableAmount = useMemo(() => {
    const rawItems: any[] = order?.lineItems || order?.items || order?.orderItems || [];
    return rawItems.reduce((sum: number, item: any) => {
      const qty   = Number(item.qty ?? item.quantity ?? 0);
      const rate  = Number(item.unitPriceInr ?? item.unitPriceINR ?? 0);
      const total = Number(item.totalInr ?? item.totalINR ?? qty * rate);
      return sum + total;
    }, 0);
  }, [order]);

  const cgstRate    = gstRate / 2;
  const sgstRate    = gstRate / 2;
  const cgstAmount  = Math.round(taxableAmount * cgstRate / 100);
  const sgstAmount  = Math.round(taxableAmount * sgstRate / 100);
  const totalGST    = cgstAmount + sgstAmount;
  const grandTotal  = taxableAmount + totalGST;

  function buildGSTData(): GSTData {
    return { gstRate, cgstRate, sgstRate, clientGSTIN, taxableAmount, cgstAmount, sgstAmount, totalGST, grandTotal };
  }

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full mt-1.5 z-[9999] w-80 bg-white rounded-xl border border-gray-200 shadow-xl"
      style={{ minWidth: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-700 text-gray-900">GST Invoice</span>
          {existingGSTData && (
            <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Previously generated
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* GST Rate */}
        <div>
          <label className="text-[10px] uppercase font-600 text-gray-500 block mb-1">GST Rate (%)</label>
          <input
            type="number"
            min={0}
            max={28}
            step={1}
            value={gstRate}
            onChange={e => setGstRate(Math.max(0, Number(e.target.value)))}
            className="input-field w-full text-sm"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">CGST {cgstRate}% + SGST {sgstRate}%</p>
        </div>

        {/* Client GSTIN */}
        <div>
          <label className="text-[10px] uppercase font-600 text-gray-500 block mb-1">Client GSTIN</label>
          <input
            type="text"
            value={clientGSTIN}
            onChange={e => setClientGSTIN(e.target.value.toUpperCase())}
            placeholder="Client's GSTIN (optional)"
            maxLength={15}
            className="input-field w-full text-sm font-mono"
          />
        </div>

        {/* Calculated summary */}
        <div className="rounded-lg bg-gray-50 border border-gray-100 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-3 py-2">
            <span className="text-gray-500">Taxable Amount</span>
            <span className="font-500 text-gray-900">{fmtINR(taxableAmount)}</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-gray-500">CGST ({cgstRate}%)</span>
            <span className="font-500 text-gray-900">{fmtINR(cgstAmount)}</span>
          </div>
          <div className="flex justify-between px-3 py-2">
            <span className="text-gray-500">SGST ({sgstRate}%)</span>
            <span className="font-500 text-gray-900">{fmtINR(sgstAmount)}</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-gray-100">
            <span className="font-600 text-gray-700">Total GST</span>
            <span className="font-600 text-gray-900">{fmtINR(totalGST)}</span>
          </div>
          <div className="flex justify-between px-3 py-2.5 bg-indigo-50 rounded-b-lg">
            <span className="font-700 text-indigo-900">Grand Total</span>
            <span className="font-700 text-indigo-900">{fmtINR(grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => { onSave(buildGSTData()); }}
          className="w-full py-2 text-sm font-600 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Save &amp; Notify Client
        </button>
        <button
          onClick={() => onDownload(buildGSTData())}
          className="w-full py-2 text-sm font-600 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
