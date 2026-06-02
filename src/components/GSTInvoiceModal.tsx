'use client';
import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

export interface GSTData {
  gstRate: number;
  clientGSTIN: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalGST: number;
  grandTotal: number;
}

interface GSTInvoiceModalProps {
  order: any;
  onClose: () => void;
  onGenerate: (gstData: GSTData) => void;
}

function fmtINR(n: number): string {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function GSTInvoiceModal({ order, onClose, onGenerate }: GSTInvoiceModalProps) {
  const [gstRate, setGstRate] = useState(18);
  const [clientGSTIN, setClientGSTIN] = useState('');

  const taxableAmount = useMemo(() => {
    const rawItems: any[] = order?.lineItems || order?.items || order?.orderItems || [];
    return rawItems.reduce((sum: number, item: any) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const rate = Number(item.unitPriceInr ?? item.unitPriceINR ?? 0);
      const total = Number(item.totalInr ?? item.totalINR ?? qty * rate);
      return sum + total;
    }, 0);
  }, [order]);

  const halfRate = gstRate / 2;
  const cgst = Math.round(taxableAmount * halfRate / 100);
  const sgst = Math.round(taxableAmount * halfRate / 100);
  const totalGST = cgst + sgst;
  const grandTotal = taxableAmount + totalGST;

  function handleGenerate() {
    onGenerate({ gstRate, clientGSTIN, taxableAmount, cgst, sgst, totalGST, grandTotal });
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-700 text-gray-900">GST Invoice Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editable fields */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-[11px] uppercase font-600 text-gray-500 block mb-1">
              GST Rate (%)
            </label>
            <input
              type="number"
              min={0}
              max={28}
              step={1}
              value={gstRate}
              onChange={e => setGstRate(Math.max(0, Number(e.target.value)))}
              className="input-field w-full text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              CGST {halfRate}% + SGST {halfRate}%
            </p>
          </div>

          <div>
            <label className="text-[11px] uppercase font-600 text-gray-500 block mb-1">
              Client GSTIN <span className="font-400 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={clientGSTIN}
              onChange={e => setClientGSTIN(e.target.value.toUpperCase())}
              placeholder="e.g. 27AAPFU0939F1ZV"
              maxLength={15}
              className="input-field w-full text-sm font-mono"
            />
          </div>
        </div>

        {/* Breakdown table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden mb-5">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-500">Taxable Amount</td>
                <td className="px-4 py-2.5 text-right font-500 text-gray-900">{fmtINR(taxableAmount)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 text-gray-500">CGST ({halfRate}%)</td>
                <td className="px-4 py-2.5 text-right font-500 text-gray-900">{fmtINR(cgst)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-4 py-2.5 text-gray-500">SGST ({halfRate}%)</td>
                <td className="px-4 py-2.5 text-right font-500 text-gray-900">{fmtINR(sgst)}</td>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600 font-600">Total GST</td>
                <td className="px-4 py-2.5 text-right font-600 text-gray-900">{fmtINR(totalGST)}</td>
              </tr>
              <tr className="bg-indigo-50">
                <td className="px-4 py-3 text-indigo-900 font-700">Grand Total</td>
                <td className="px-4 py-3 text-right font-700 text-indigo-900 text-base">{fmtINR(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-600 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 py-2.5 text-sm font-600 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Generate &amp; Download
          </button>
        </div>
      </div>
    </div>
  );
}
