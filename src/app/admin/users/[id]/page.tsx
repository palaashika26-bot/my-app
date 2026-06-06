'use client';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { adminApi, type AdminClientDetail } from '@/lib/api/admin.api';
import { ArrowLeft, Save, Key, Ban, Trash2, Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    adminApi.getClientById(id)
      .then(res => setClient(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) return notFound();

  const fullName = `${client.user.firstName} ${client.user.lastName}`;
  const initials = fullName.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const totalSpend = client.orders.reduce((s, o) => s + parseFloat(o.totalINR || '0'), 0);
  const avgOrderValue = client._count.orders > 0 ? Math.round(totalSpend / client._count.orders) : 0;

  return (
    <AdminLayout>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-[#1A1423] text-white font-700 text-2xl flex items-center justify-center">{initials}</div>
        <div className="flex-1"><h1 className="text-xl font-700">{fullName}</h1><p className="text-sm text-muted-foreground">{client.user.email}</p><p className="text-xs text-muted-foreground mt-1">{client.companyName} • Member since {new Date(client.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
        <button onClick={() => { setEditing(!editing); if (editing) addToast({ type: 'success', title: 'Profile saved' }); }} className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-1.5"><Save className="w-4 h-4" /> {editing ? 'Save' : 'Edit'}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[{l:'Total Orders', v: client._count.orders}, {l:'Total Spent', v: `₹${totalSpend.toLocaleString('en-IN')}`}, {l:'Avg Order Value', v: `₹${avgOrderValue.toLocaleString('en-IN')}`}, {l:'Status', v: client.isActive ? 'Active' : 'Inactive'}].map(s => <div key={s.l} className="bg-card rounded-xl border border-border p-4"><p className="text-[10px] uppercase text-muted-foreground font-600">{s.l}</p><p className="text-xl font-700 font-tabular mt-1">{s.v}</p></div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Client Info</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[{k:'First Name', v: client.user.firstName}, {k:'Last Name', v: client.user.lastName}, {k:'Email', v: client.user.email}, {k:'Phone', v: client.user.phone || '—'}, {k:'Company', v: client.companyName}, {k:'GSTIN', v: client.gstin || '—'}].map(item => (
              <div key={item.k}><label className="text-[10px] uppercase text-muted-foreground">{item.k}</label><p className="font-500 mt-1 font-tabular">{item.v}</p></div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Recent Orders</h3>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {client.orders.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No orders.</p> : client.orders.map(o => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <span className="flex-1 font-tabular font-600">{o.orderNumber}</span>
                <span className="font-tabular text-sm">₹{parseFloat(o.totalINR).toLocaleString('en-IN')}</span>
                <StatusBadge status={o.status as any} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mt-5">
        <h3 className="font-700 mb-3">Admin Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => addToast({ type: 'success', title: 'Password reset link sent' })} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2"><Key className="w-4 h-4" /> Reset Password</button>
          <button onClick={() => { addToast({ type: 'warning', title: client.isActive ? 'Account suspended' : 'Account reactivated' }); }} className="px-4 py-2 rounded-lg text-sm font-600 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 inline-flex items-center gap-2"><Ban className="w-4 h-4" /> {client.isActive ? 'Suspend' : 'Reactivate'} Account</button>
          <button onClick={() => setConfirmDel(true)} className="px-4 py-2 rounded-lg text-sm font-600 bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account</button>
        </div>
      </div>
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto pt-4 md:pt-8" onClick={() => setConfirmDel(false)}><div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-sm p-5 mb-4 mx-4"><h4 className="font-700 mb-2">Delete this client?</h4><p className="text-sm text-muted-foreground mb-4">This cannot be undone. All orders and requests will be archived.</p><div className="flex gap-2"><button onClick={() => setConfirmDel(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={() => { setConfirmDel(false); addToast({ type: 'success', title: 'Account archived' }); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-600">Delete</button></div></div></div>
      )}
    </AdminLayout>
  );
}