'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { MessageSquare, Package, Edit3, Building2, CheckCircle2 } from 'lucide-react';
import {
  logisticsApi,
  LOGISTICS_STATUS_COLORS,
  LOGISTICS_STATUS_LABELS,
} from '@/lib/api/logistics.api';

const DEFAULT_WAREHOUSE_ADDRESS = {
  companyName: 'Elios Wholesale — China Warehouse',
  contactPerson: 'Mr. Zhang Wei',
  phone: '+86 139 0000 1234',
  address: 'Building 3, Yiwu International Trade City',
  area: 'Chouzhou North Road, Yiwu',
  city: 'Yiwu',
  province: 'Zhejiang Province',
  country: 'China',
  pincode: '322000',
};

export default function SourcingLogisticsPage() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouseAddress, setWarehouseAddress] = useState<any>(DEFAULT_WAREHOUSE_ADDRESS);
  const [warehouseAddressUpdatedAt, setWarehouseAddressUpdatedAt] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({ ...DEFAULT_WAREHOUSE_ADDRESS });
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const fetchRequests = useCallback((signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    logisticsApi.getList({ limit: 100 }, signal)
      .then(r => setRequests(r.data?.data ?? []))
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') setError('Failed to load logistics requests.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchRequests(ac.signal);
    try {
      const raw = localStorage.getItem('elios-warehouse-address');
      const addr = raw ? JSON.parse(raw) : DEFAULT_WAREHOUSE_ADDRESS;
      setWarehouseAddress(addr);
      if (addr.updatedAt) setWarehouseAddressUpdatedAt(addr.updatedAt);
      const { updatedAt: _u, ...formFields } = addr;
      setAddressForm(formFields);
    } catch {}
    return () => ac.abort();
  }, [fetchRequests]);

  async function handleSaveAddress() {
    setAddressLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const saved = { ...addressForm, updatedAt: new Date().toISOString() };
    localStorage.setItem('elios-warehouse-address', JSON.stringify(saved));
    setWarehouseAddress(saved);
    if (saved.updatedAt) setWarehouseAddressUpdatedAt(saved.updatedAt);
    setEditingAddress(false);
    setAddressSuccess(true);
    setAddressLoading(false);
    setTimeout(() => setAddressSuccess(false), 4000);
    addToast({ type: 'success', title: 'Address updated' });
  }

  function handleCancelAddress() {
    const { updatedAt: _u, ...formFields } = warehouseAddress;
    setAddressForm(formFields);
    setEditingAddress(false);
  }

  const pendingCount = requests.filter(r => r.status === 'SUBMITTED').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-700">Logistics & Shipments</h1>
          <p className="text-sm text-muted-foreground mt-1">{requests.length} logistics requests</p>
        </div>
      </div>

      {/* Warehouse Address */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 className="w-4 h-4 text-[#4A3B52]" />
              <h3 className="font-700">China Warehouse Address</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shown to clients after logistics quote approval</p>
          </div>
          {!editingAddress && (
            <button onClick={() => setEditingAddress(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-600 hover:bg-muted transition-colors flex-shrink-0">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        {addressSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Address updated successfully.
          </div>
        )}
        {editingAddress ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Company Name', key: 'companyName' }, { label: 'Contact Person', key: 'contactPerson' },
                { label: 'Phone', key: 'phone' }, { label: 'Address Line 1', key: 'address' },
                { label: 'Address Line 2', key: 'area' }, { label: 'City', key: 'city' },
                { label: 'Province', key: 'province' }, { label: 'Country', key: 'country' },
                { label: 'Pincode', key: 'pincode' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">{label}</label>
                  <input className="input-field w-full text-sm" value={addressForm[key] ?? ''} onChange={e => setAddressForm((f: any) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveAddress} disabled={addressLoading} className="px-4 py-2 rounded-lg bg-[#4A3B52] text-white text-sm font-600 hover:bg-[#1A1423] transition-colors disabled:opacity-60">
                {addressLoading ? 'Saving…' : 'Save Address'}
              </button>
              <button onClick={handleCancelAddress} className="px-4 py-2 rounded-lg border border-border text-sm font-600 hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="bg-[#faf9f7] border border-[#e8e4f0] rounded-xl p-4">
            <p className="font-700 text-sm mb-2">{warehouseAddress.companyName}</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-600 text-foreground">Contact:</span> {warehouseAddress.contactPerson}</p>
              <p><span className="font-600 text-foreground">Phone:</span> {warehouseAddress.phone}</p>
              <div className="border-t border-[#e8e4f0] my-2" />
              <p>{warehouseAddress.address}</p>
              <p>{warehouseAddress.area}</p>
              <p>{warehouseAddress.city}{warehouseAddress.province ? `, ${warehouseAddress.province}` : ''}</p>
              <p className="font-600 text-foreground">{warehouseAddress.country} — {warehouseAddress.pincode}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              {warehouseAddressUpdatedAt
                ? `Last updated: ${new Date(warehouseAddressUpdatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Default address'}
            </p>
          </div>
        )}
      </div>

      {/* Logistics Requests */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-[#4A3B52]" />
          <h3 className="font-700">Logistics Requests</h3>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-600 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>

        {error ? (
          <div className="px-5 py-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button onClick={() => fetchRequests()} className="text-xs font-600 text-red-700 hover:underline">Retry</button>
            </div>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No logistics requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-[11px] uppercase text-muted-foreground">
                  <th className="px-3 py-3 text-left font-600">Client</th>
                  <th className="px-3 py-3 text-left font-600">Request #</th>
                  <th className="px-3 py-3 text-left font-600">Weight</th>
                  <th className="px-3 py-3 text-left font-600">CBM</th>
                  <th className="px-3 py-3 text-left font-600">Method</th>
                  <th className="px-3 py-3 text-left font-600">Submitted</th>
                  <th className="px-3 py-3 text-left font-600">Status</th>
                  <th className="px-3 py-3 text-right font-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => (
                  <tr key={req.id} className="table-row-hover">
                    <td className="px-3 py-3">
                      <p className="font-600 text-sm">{req.client?.companyName || req.client?.user?.email || '—'}</p>
                      <p className="text-xs text-muted-foreground">{req.client?.user?.email || ''}</p>
                    </td>
                    <td className="px-3 py-3 font-tabular text-xs">{req.requestNumber || req.id}</td>
                    <td className="px-3 py-3 text-sm">{req.weightKg ? `${Number(req.weightKg)} KG` : '— KG'}</td>
                    <td className="px-3 py-3 text-sm">{req.volumeCbm ? `${Number(req.volumeCbm)} CBM` : '— CBM'}</td>
                    <td className="px-3 py-3 text-sm">{req.shippingMethod}</td>
                    <td className="px-3 py-3 text-xs font-tabular">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${LOGISTICS_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
                        {LOGISTICS_STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/staff/sourcing/logistics/${req.id}`} className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#4A3B52]/90 transition-colors w-fit">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {req.status === 'QUOTED' ? 'Edit Quote' : req.status === 'SUBMITTED' ? 'Reply / Quote' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
