'use client';
import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { Settings as SettingsIcon, Percent, Bell, Users as UsersIcon, Plus, X, Save } from 'lucide-react';

const tabs = [
  { id: 'general',  label: 'General',       icon: SettingsIcon },
  { id: 'gst',      label: 'GST',           icon: Percent },
  { id: 'notif',    label: 'Notifications', icon: Bell },
  { id: 'admins',   label: 'Admin Users',   icon: UsersIcon },
];

export default function AdminSettingsPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('general');
  const [general, setGeneral] = useState({ platform: 'EliosWholesale', supportEmail: 'support@elioswholesale.in', supportPhone: '+91 22 4567 8900', exchangeRate: '12.00', invoicePrefix: 'BK-ORD-', requestPrefix: 'BK-REQ-' });
  const [gstRates, setGstRates] = useState([
    { category: 'Electronics', rate: 18 },
    { category: 'Mobile Accessories', rate: 18 },
    { category: 'Kitchenware', rate: 12 },
    { category: 'Lighting', rate: 18 },
    { category: 'Office', rate: 18 },
    { category: 'Fashion', rate: 5 },
    { category: 'Sports', rate: 12 },
  ]);
  const [templates] = useState([
    { name: 'Order Confirmation', subject: 'Your order {orderId} is confirmed', preview: 'Hi {clientName}, your order...' },
    { name: 'Shipment Update',    subject: 'Shipment update for {orderId}',     preview: 'Your shipment is now at {location}...' },
    { name: 'Quotation Ready',    subject: 'Quotation ready for {requestId}',   preview: 'Your quotation is ready for review...' },
    { name: 'Exception Alert',    subject: 'Important: Issue with {orderId}',   preview: 'We have flagged an exception...' },
  ]);
  const [admins, setAdmins] = useState([
    { id: 'a1', name: 'Arjun Sharma',    email: 'admin@elioswholesale.in',   role: 'Super Admin'    },
    { id: 'a2', name: 'Neha Iyer',       email: 'neha@elioswholesale.in',    role: 'Order Manager'  },
    { id: 'a3', name: 'Vikram Singh',    email: 'vikram@elioswholesale.in',  role: 'Support'        },
  ]);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Order Manager' });

  function save(section: string) { addToast({ type: 'success', title: 'Settings saved', description: `${section} settings updated.` }); }
  function addAdmin() { if (!invite.email) return; setAdmins(a => [...a, { id: `a${Date.now()}`, ...invite }]); setShowInvite(false); setInvite({ name: '', email: '', role: 'Order Manager' }); addToast({ type: 'success', title: 'Admin invited' }); }
  function removeAdmin(id: string) { setAdmins(a => a.filter(x => x.id !== id)); addToast({ type: 'success', title: 'Admin removed' }); }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-700 mb-1">Admin Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">Platform-wide configuration</p>
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${tab === t.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}><t.icon className="w-4 h-4" />{t.label}</button>))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        {tab === 'general' && (
          <div className="space-y-3 max-w-2xl">
            <h3 className="font-700 mb-2">General Settings</h3>
            {([
              ['Platform Name','platform'],['Support Email','supportEmail'],['Support Phone','supportPhone'],['Exchange Rate (1 CNY = INR)','exchangeRate'],['Invoice Prefix','invoicePrefix'],['Request Prefix','requestPrefix']
            ] as const).map(([lbl, k]) => (
              <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <label className="text-xs font-600 text-muted-foreground sm:col-span-1">{lbl}</label>
                <input value={(general as any)[k]} onChange={e => setGeneral({...general, [k]: e.target.value})} className="input-field sm:col-span-2 font-tabular" />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Last updated: 11 May 2026, 09:14 IST</p>
            <button onClick={() => save('General')} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save Settings</button>
          </div>
        )}
        {tab === 'gst' && (
          <div className="max-w-2xl">
            <h3 className="font-700 mb-3">GST Rates by Category</h3>
            <div className="divide-y divide-border">{gstRates.map((g, i) => (
              <div key={g.category} className="flex items-center justify-between py-2">
                <p className="text-sm font-500">{g.category}</p>
                <div className="flex items-center gap-2"><input value={g.rate} onChange={e => setGstRates(prev => prev.map((x, idx) => idx === i ? { ...x, rate: +e.target.value || 0 } : x))} type="number" className="input-field w-20 font-tabular text-right" /><span className="text-sm">%</span></div>
              </div>
            ))}</div>
            <button onClick={() => save('GST')} className="btn-primary mt-4 px-4 py-2 text-sm inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        )}
        {tab === 'notif' && (
          <div className="max-w-3xl">
            <h3 className="font-700 mb-3">Notification Templates</h3>
            <div className="space-y-3">{templates.map(t => (
              <div key={t.name} className="border border-border rounded-lg p-3"><div className="flex items-center justify-between"><p className="font-600 text-sm">{t.name}</p><button onClick={() => addToast({ type: 'info', title: 'Template editor opened' })} className="text-xs text-accent font-600 hover:underline">Edit</button></div><p className="text-xs text-muted-foreground mt-1">Subject: <span className="font-tabular">{t.subject}</span></p><p className="text-xs text-muted-foreground mt-0.5">{t.preview}</p></div>
            ))}</div>
          </div>
        )}
        {tab === 'admins' && (
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="font-700">Admin Users</h3><button onClick={() => setShowInvite(true)} className="btn-primary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Invite Admin</button></div>
            <div className="bg-muted/30 rounded-xl overflow-hidden"><table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase text-muted-foreground border-b border-border"><th className="px-3 py-2 text-left font-600">Name</th><th className="px-3 py-2 text-left font-600">Email</th><th className="px-3 py-2 text-left font-600">Role</th><th className="px-3 py-2 text-right font-600">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">{admins.map(a => <tr key={a.id} className="bg-card"><td className="px-3 py-2 font-500">{a.name}</td><td className="px-3 py-2 text-xs">{a.email}</td><td className="px-3 py-2"><span className="badge bg-accent/10 text-accent">{a.role}</span></td><td className="px-3 py-2 text-right">{a.role !== 'Super Admin' && <button onClick={() => removeAdmin(a.id)} className="text-xs text-red-500 hover:underline">Remove</button>}</td></tr>)}</tbody>
            </table></div>
            {showInvite && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}><div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-3"><h3 className="font-700">Invite Admin</h3><button onClick={() => setShowInvite(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                <div className="space-y-2">
                  <input value={invite.name} onChange={e => setInvite({...invite, name: e.target.value})} className="input-field" placeholder="Name" />
                  <input value={invite.email} onChange={e => setInvite({...invite, email: e.target.value})} className="input-field" placeholder="Email" />
                  <select value={invite.role} onChange={e => setInvite({...invite, role: e.target.value})} className="input-field"><option>Super Admin</option><option>Order Manager</option><option>Support</option></select>
                </div>
                <div className="flex gap-2 mt-4"><button onClick={() => setShowInvite(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={addAdmin} className="btn-primary flex-1 py-2 text-sm">Send Invite</button></div>
              </div></div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
