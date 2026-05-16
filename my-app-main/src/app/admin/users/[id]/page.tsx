'use client';
import React, { useState, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockClients, mockAdminOrders, mockRequests } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Key, Ban, Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const initial = mockClients.find(c => c.id === id);
  if (!initial) return notFound();
  const [c, setC] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const orders = mockAdminOrders.filter(o => o.client === c.name).slice(0, 5);
  const requests = mockRequests.filter(r => r.client === c.name).slice(0, 5);
  const avgOrderValue = orders.length > 0 ? Math.round(parseInt(c.totalSpend.replace(/[^0-9]/g, '') || '0') / Math.max(1, c.totalOrders)) : 0;
  const activity = [
    { t: 'Today 09:14', e: 'Logged in from Mumbai (Chrome)' },
    { t: 'Yesterday 17:33', e: `Placed order BK-ORD-2024-0287` },
    { t: '2 days ago', e: 'Submitted photo-scan request' },
    { t: '3 days ago', e: 'Updated company GSTIN' },
    { t: '5 days ago', e: 'Logged in from Mumbai (Safari iPhone)' },
  ];

  return (
    <AdminLayout>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-orange-600 text-white font-700 text-2xl flex items-center justify-center">{c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div className="flex-1"><h1 className="text-xl font-700">{c.name}</h1><p className="text-sm text-muted-foreground">{c.email}</p><p className="text-xs text-muted-foreground mt-1">{c.company} • Member since {c.joinedDate}</p></div>
        <button onClick={() => { setEditing(!editing); if (editing) addToast({ type: 'success', title: 'Profile saved' }); }} className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-1.5"><Save className="w-4 h-4" /> {editing ? 'Save' : 'Edit'}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[{l:'Total Orders', v: c.totalOrders}, {l:'Total Spent', v: c.totalSpend}, {l:'Avg Order Value', v: `₹${avgOrderValue.toLocaleString()}`}, {l:'Status', v: c.status}].map(s => <div key={s.l} className="bg-card rounded-xl border border-border p-4"><p className="text-[10px] uppercase text-muted-foreground font-600">{s.l}</p><p className="text-xl font-700 font-tabular mt-1">{s.v}</p></div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Client Info</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {(['name','email','phone','company','gstin'] as const).map(k => (
              <div key={k}><label className="text-[10px] uppercase text-muted-foreground">{k}</label>{editing ? <input value={c[k]} onChange={e => setC({...c, [k]: e.target.value})} className="input-field mt-1" /> : <p className="font-500 mt-1 font-tabular">{c[k]}</p>}</div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Activity Log</h3>
          <ol className="space-y-2.5 max-h-80 overflow-y-auto">{activity.map((a, i) => <li key={i} className="text-sm"><p>{a.e}</p><p className="text-[11px] text-muted-foreground">{a.t}</p></li>)}</ol>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="font-700">Recent Orders</h3></div>
          <div className="divide-y divide-border">
            {orders.length === 0 ? <p className="p-4 text-sm text-muted-foreground text-center">No orders.</p> : orders.map(o => <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40"><span className="flex-1 font-tabular font-600">{o.orderId}</span><span className="font-tabular text-sm">{o.amount}</span><StatusBadge status={o.status as any} /></Link>)}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="font-700">Recent Requests</h3></div>
          <div className="divide-y divide-border">
            {requests.length === 0 ? <p className="p-4 text-sm text-muted-foreground text-center">No requests.</p> : requests.map(r => <Link key={r.id} href={`/admin/requests/${r.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40"><span className="flex-1 font-tabular font-600">{r.requestId}</span><span className="font-tabular text-sm">{r.totalBudget}</span><StatusBadge status={r.status as any} /></Link>)}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mt-5">
        <h3 className="font-700 mb-3">Admin Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => addToast({ type: 'success', title: 'Password reset link sent' })} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"><Key className="w-4 h-4" /> Reset Password</button>
          <button onClick={() => { setC({...c, status: c.status === 'Active' ? 'Inactive' : 'Active'}); addToast({ type: 'warning', title: c.status === 'Active' ? 'Account suspended' : 'Account reactivated' }); }} className="px-4 py-2 rounded-lg text-sm font-600 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 inline-flex items-center gap-2"><Ban className="w-4 h-4" /> {c.status === 'Active' ? 'Suspend' : 'Reactivate'} Account</button>
          <button onClick={() => addToast({ type: 'info', title: 'Impersonating user', description: 'Open as client view.' })} className="btn-secondary px-4 py-2 text-sm">Impersonate Login</button>
          <button onClick={() => setConfirmDel(true)} className="px-4 py-2 rounded-lg text-sm font-600 bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account</button>
        </div>
      </div>
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDel(false)}><div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl max-w-sm p-5"><h4 className="font-700 mb-2">Delete this client?</h4><p className="text-sm text-muted-foreground mb-4">This cannot be undone. All orders and requests will be archived.</p><div className="flex gap-2"><button onClick={() => setConfirmDel(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={() => { setConfirmDel(false); addToast({ type: 'success', title: 'Demo only — account archived' }); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-600">Delete</button></div></div></div>
      )}
    </AdminLayout>
  );
}
