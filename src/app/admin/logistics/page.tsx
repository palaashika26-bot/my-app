'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockAdminOrders, statusToLocation, carrierForOrder } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { MapPin, RefreshCw, MessageSquare, Package, Edit3, Building2, CheckCircle2 } from 'lucide-react';

// ─── Backend-ready data functions ─────────────────────────────────────────────

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

interface LogisticsRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  orderId: string;
  weight: string;
  cbm: string;
  shippingMethod: string;
  packagingList: string[];
  status: 'Pending' | 'Quoted' | 'Approved' | 'Rejected' | 'SlipUploaded' | 'CargoReceived';
  submittedAt: string;
  adminQuote: null | Record<string, string>;
}

interface TrackingEntry {
  trackingId: string;
  orderId: string;
  clientName: string;
  carrier: string;
  shippingMode: string;
  currentLocation: string;
  eta: string;
  status: string;
  createdAt: string;
}

function loadRequests(): LogisticsRequest[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('logistics-requests') : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadTracking(): TrackingEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('logistics-tracking') : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const statusColor: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Quoted: 'bg-[#e4eeee] text-[#6b8f90]',
  Approved: 'bg-[#ece9f5] text-[#5c5470]',
  SlipUploaded: 'bg-orange-100 text-[#c17b5c]',
  CargoReceived: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function AdminLogisticsPage() {
  const { addToast } = useToast();
  const shipments = mockAdminOrders.filter(o => statusToLocation[o.status as string]);
  const [filter, setFilter] = useState('All');

  // Logistics requests state
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);

  // Warehouse address state
  const [warehouseAddress, setWarehouseAddress] = useState<any>(DEFAULT_WAREHOUSE_ADDRESS);
  const [warehouseAddressUpdatedAt, setWarehouseAddressUpdatedAt] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({ ...DEFAULT_WAREHOUSE_ADDRESS });
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    setRequests(loadRequests());
    setTrackingEntries(loadTracking());
    getWarehouseAddress().then(addr => {
      setWarehouseAddress(addr);
      if (addr.updatedAt) setWarehouseAddressUpdatedAt(addr.updatedAt);
      const { updatedAt: _u, ...formFields } = addr;
      setAddressForm(formFields);
    });
  }, []);

  async function handleSaveAddress() {
    const fields = ['companyName', 'contactPerson', 'phone', 'address', 'area', 'city', 'country', 'pincode'] as const;
    for (const field of fields) {
      if (!addressForm[field]?.trim()) {
        addToast({ type: 'warning', title: 'All fields required', description: 'Please fill in all address fields.' });
        return;
      }
    }
    setAddressLoading(true);
    await saveWarehouseAddress(addressForm);
    const saved = await getWarehouseAddress();
    setWarehouseAddress(saved);
    if (saved.updatedAt) setWarehouseAddressUpdatedAt(saved.updatedAt);
    setEditingAddress(false);
    setAddressSuccess(true);
    setAddressLoading(false);
    setTimeout(() => setAddressSuccess(false), 4000);
  }

  function handleCancelAddress() {
    const { updatedAt: _u, ...formFields } = warehouseAddress;
    setAddressForm(formFields);
    setEditingAddress(false);
  }

  // Combine mock shipments with localStorage tracking for the table
  const allTracking = trackingEntries;
  const mockFiltered = filter === 'All' ? shipments : shipments.filter(s => carrierForOrder(s.orderId).mode === filter);
  const localFiltered = filter === 'All' ? allTracking : allTracking.filter(t => t.shippingMode === filter);
  const active = shipments.length + trackingEntries.length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-700">Logistics & Shipments</h1><p className="text-sm text-muted-foreground mt-1">{active} active shipments in the pipeline</p></div>
        <div className="flex gap-1">
          {['All','Sea Freight','Air Freight','Express'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-600 ${filter === f ? 'bg-[#4A3B52] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{f}</button>)}
        </div>
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
            <button
              onClick={() => setEditingAddress(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-600 hover:bg-muted transition-colors flex-shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Address
            </button>
          )}
        </div>

        {addressSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Address updated successfully. All future client views will show the new address.
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
                  <input
                    className="input-field w-full text-sm"
                    value={addressForm[key] ?? ''}
                    onChange={e => setAddressForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveAddress}
                disabled={addressLoading}
                className="px-4 py-2 rounded-lg bg-[#c17b5c] text-white text-sm font-600 hover:bg-[#a66344] transition-colors disabled:opacity-60"
              >
                {addressLoading ? 'Saving…' : 'Save Address'}
              </button>
              <button
                onClick={handleCancelAddress}
                className="px-4 py-2 rounded-lg border border-border text-sm font-600 hover:bg-muted transition-colors"
              >
                Cancel
              </button>
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
          {requests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-600 px-2 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'Pending').length} pending
            </span>
          )}
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No logistics requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-[11px] uppercase text-muted-foreground">
                  <th className="px-3 py-3 text-left font-600">Client</th>
                  <th className="px-3 py-3 text-left font-600">Order ID</th>
                  <th className="px-3 py-3 text-left font-600">Weight</th>
                  <th className="px-3 py-3 text-left font-600">CBM</th>
                  <th className="px-3 py-3 text-left font-600">Method</th>
                  <th className="px-3 py-3 text-left font-600">Submitted</th>
                  <th className="px-3 py-3 text-left font-600">Status</th>
                  <th className="px-3 py-3 text-right font-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.slice().reverse().map(req => (
                  <tr key={req.id} className="table-row-hover">
                    <td className="px-3 py-3">
                      <p className="font-600 text-sm">{req.clientName}</p>
                      <p className="text-xs text-muted-foreground">{req.clientEmail}</p>
                    </td>
                    <td className="px-3 py-3 font-tabular text-xs">{req.orderId}</td>
                    <td className="px-3 py-3 text-sm">{req.weight || '—'} KG</td>
                    <td className="px-3 py-3 text-sm">{req.cbm || '—'} CBM</td>
                    <td className="px-3 py-3 text-sm">{req.shippingMethod}</td>
                    <td className="px-3 py-3 text-xs font-tabular">{new Date(req.submittedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${statusColor[req.status]}`}>{req.status}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/logistics/${req.id}`}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-[#4A3B52] text-white text-xs font-600 hover:bg-[#4A3B52]/90 transition-colors w-fit"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {req.status === 'Quoted' ? 'Edit Quote' : req.status === 'Pending' ? 'Reply / Quote' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <h3 className="font-700 mb-3">Network Map</h3>
        <div className="aspect-[16/6] rounded-xl bg-gradient-to-br from-[#E8E1F5] via-[#F3EDF9] to-[#E8E1F5] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #06B6D4 0%, transparent 12%), radial-gradient(circle at 70% 50%, #10B981 0%, transparent 12%)' }} />
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-2 text-5xl"><span>🇨🇳</span><span className="text-3xl">──▶──</span><span>🇮🇳</span></div>
            <p className="mt-2 text-sm font-600 text-foreground">{active} shipments • China → India</p>
            <p className="text-xs text-muted-foreground">Live map integration coming soon</p>
          </div>
        </div>
      </div>

      {/* Tracking Table — mock data + localStorage approved shipments */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/40 border-b border-border"><tr className="text-[11px] uppercase text-muted-foreground">
            <th className="px-3 py-3 text-left font-600">Tracking ID</th><th className="px-3 py-3 text-left font-600">Order ID</th><th className="px-3 py-3 text-left font-600">Client</th><th className="px-3 py-3 text-left font-600">Carrier</th><th className="px-3 py-3 text-left font-600">Current Location</th><th className="px-3 py-3 text-left font-600">ETA</th><th className="px-3 py-3 text-left font-600">Status</th><th className="px-3 py-3 text-right font-600">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {mockFiltered.map(s => {
              const c = carrierForOrder(s.orderId); const loc = statusToLocation[s.status as string];
              return (
                <tr key={s.id} className="table-row-hover">
                  <td className="px-3 py-3 font-tabular font-600">{c.trackingNo}</td>
                  <td className="px-3 py-3"><Link href={`/admin/orders/${s.id}`} className="font-tabular text-primary font-600 hover:text-[#4A3B52]">{s.orderId}</Link></td>
                  <td className="px-3 py-3 text-sm">{s.client}</td>
                  <td className="px-3 py-3"><p className="text-sm">{c.carrier}</p><p className="text-[11px] text-muted-foreground">{c.mode}</p></td>
                  <td className="px-3 py-3"><p className="text-sm">{loc.label}</p><div className="w-24 h-1 mt-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-[#1A1423]" style={{ width: `${loc.progress}%` }} /></div></td>
                  <td className="px-3 py-3 text-xs font-tabular">{s.estimatedDelivery}</td>
                  <td className="px-3 py-3"><StatusBadge status={s.status as any} /></td>
                  <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => addToast({ type: 'success', title: 'Location updated' })} className="p-1.5 rounded-md hover:bg-muted" title="Update Location"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <Link href={`/admin/shipments/tracking/${s.id}`} className="p-1.5 rounded-md hover:bg-muted text-[#4A3B52]" title="View Tracking"><MapPin className="w-3.5 h-3.5" /></Link>
                  </div></td>
                </tr>
              );
            })}
            {localFiltered.map(t => (
              <tr key={t.trackingId} className="table-row-hover">
                <td className="px-3 py-3 font-tabular font-600">{t.trackingId}</td>
                <td className="px-3 py-3 font-tabular text-primary font-600">{t.orderId}</td>
                <td className="px-3 py-3 text-sm">{t.clientName}</td>
                <td className="px-3 py-3"><p className="text-sm">{t.carrier}</p><p className="text-[11px] text-muted-foreground">{t.shippingMode}</p></td>
                <td className="px-3 py-3"><p className="text-sm">{t.currentLocation}</p><div className="w-24 h-1 mt-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-[#1A1423]" style={{ width: '10%' }} /></div></td>
                <td className="px-3 py-3 text-xs font-tabular">{t.eta}</td>
                <td className="px-3 py-3"><span className="text-xs font-600 px-2 py-0.5 rounded-full bg-[#e4eeee] text-[#6b8f90]">{t.status}</span></td>
                <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => addToast({ type: 'success', title: 'Location updated' })} className="p-1.5 rounded-md hover:bg-muted" title="Update Location"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

    </AdminLayout>
  );
}
