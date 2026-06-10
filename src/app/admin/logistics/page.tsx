'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { MapPin, RefreshCw, MessageSquare, Package, Edit3, Building2, CheckCircle2, Search } from 'lucide-react';
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

async function getWarehouseAddress() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('elios-warehouse-address') : null;
  return raw ? JSON.parse(raw) : DEFAULT_WAREHOUSE_ADDRESS;
}

async function saveWarehouseAddress(data: any) {
  localStorage.setItem('elios-warehouse-address', JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

function getStatusSortWeight(status: string): number {
  const order = ['SUBMITTED', 'QUOTED', 'COUNTERED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'];
  const idx = order.indexOf(status);
  return idx >= 0 ? idx : 99;
}

export default function AdminLogisticsPage() {
  const { addToast } = useToast();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [requestQuery, setRequestQuery] = useState('');

  // Warehouse address state
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
      .then(r => {
        const items = r.data?.data ?? [];
        setRequests(items);
      })
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') setError('Failed to load logistics requests.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchRequests(ac.signal);
    getWarehouseAddress().then(addr => {
      setWarehouseAddress(addr);
      if (addr.updatedAt) setWarehouseAddressUpdatedAt(addr.updatedAt);
      const { updatedAt: _u, ...formFields } = addr;
      setAddressForm(formFields);
    });
    return () => ac.abort();
  }, [fetchRequests]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => {
    if (tab !== 'All' && r.status !== tab) return false;
    if (!q) return true;
    return [r.requestNumber, r.clientName, r.companyName, r.shippingMethod].join(' ').toLowerCase().includes(q.toLowerCase());
  }), [rows, q, tab]);

  const statusFilters = ['All', 'SUBMITTED', 'QUOTED', 'COUNTERED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'REJECTED'];

  const requestSearch = requestQuery.trim().toLowerCase();
  const filteredRequests = requests
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r => !requestSearch || [r.requestNumber, r.client?.companyName, r.client?.user?.email, r.shippingMethod, r.status]
      .some(v => (v ?? '').toLowerCase().includes(requestSearch)))
    .sort((a, b) => {
      const wa = getStatusSortWeight(a.status);
      const wb = getStatusSortWeight(b.status);
      if (wa !== wb) return wa - wb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pendingCount = requests.filter(r => r.status === 'SUBMITTED').length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-700">Logistics & Shipments</h1><p className="text-sm text-muted-foreground mt-1">{requests.length} total requests</p></div>
        <div className="flex gap-1 flex-wrap">
          {['All', 'SUBMITTED', 'QUOTED', 'CONFIRMED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-600 ${filter === f ? 'bg-[#4A3B52] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
              {f === 'All' ? 'All' : LOGISTICS_STATUS_LABELS[f] || f}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-1.5 text-sm py-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Warehouse Address Card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 className="w-4 h-4 text-[#4A3B52]" />
              <h3 className="font-700">China Warehouse Address</h3>
            </div>
            <p className="text-xs text-muted-foreground">This address is shown to clients after they approve a logistics quote</p>
          </div>
          {!editingAddress && (
            <button onClick={() => setEditingAddress(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-600 hover:bg-muted transition-colors flex-shrink-0">
              <Edit3 className="w-3.5 h-3.5" /> Edit Address
            </button>
          ))}
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
                { label: 'Company Name', key: 'companyName', placeholder: 'e.g. Elios Wholesale — China Warehouse' },
                { label: 'Contact Person', key: 'contactPerson', placeholder: 'e.g. Mr. Zhang Wei' },
                { label: 'Phone', key: 'phone', placeholder: 'e.g. +86 139 0000 1234' },
                { label: 'Address Line 1', key: 'address', placeholder: 'e.g. Building 3, Yiwu International Trade City' },
                { label: 'Address Line 2 / Area', key: 'area', placeholder: 'e.g. Chouzhou North Road, Yiwu' },
                { label: 'City', key: 'city', placeholder: 'e.g. Yiwu' },
                { label: 'Province', key: 'province', placeholder: 'e.g. Zhejiang Province' },
                { label: 'Country', key: 'country', placeholder: 'e.g. China' },
                { label: 'Pincode', key: 'pincode', placeholder: 'e.g. 322000' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">{label}</label>
                  <input className="input-field w-full text-sm" value={addressForm[key] ?? ''} onChange={e => setAddressForm((f: any) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveAddress} disabled={addressLoading} className="px-4 py-2 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60">
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

      {/* Logistics Requests Section */}
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
          <>
            <div className="px-5 py-3 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <input value={requestQuery} onChange={e => setRequestQuery(e.target.value)} placeholder="Search request #, client, method..." className="input-field !pl-10 w-full text-sm" />
              </div>
            </div>
            {filteredRequests.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No requests match your filters.</div>
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
                    {filteredRequests.map(req => (
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
                          <Link href={`/admin/logistics/${req.id}`} className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#4A3B52]/90 transition-colors w-fit">
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
          </>
        )}
      </div>
    </AdminLayout>
  );
}
