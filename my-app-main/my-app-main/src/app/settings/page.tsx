'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { Bell, Globe2, Lock, AlertOctagon } from 'lucide-react';

const tabs = [{ id: 'notif', label: 'Notifications', icon: Bell }, { id: 'pref', label: 'Preferences', icon: Globe2 }, { id: 'sec', label: 'Security', icon: Lock }, { id: 'danger', label: 'Danger Zone', icon: AlertOctagon }];

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (<label className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer"><span className="text-sm">{label}</span><button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-muted'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} /></button></label>);
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('notif');
  const [prefs, setPrefs] = useState({ email: true, whatsapp: true, status: true, quote: true, payment: true });
  const [confirm, setConfirm] = useState(false);

  return (
    <ClientShell>
      <h1 className="text-2xl font-700 mb-1">Account Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage your preferences and account</p>
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 whitespace-nowrap ${tab === t.id ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}><t.icon className="w-4 h-4" />{t.label}</button>))}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        {tab === 'notif' && (<div>
          <h3 className="font-700 mb-3">Notifications</h3>
          <Toggle on={prefs.email} onChange={() => setPrefs({...prefs, email: !prefs.email})} label="Email notifications" />
          <Toggle on={prefs.whatsapp} onChange={() => setPrefs({...prefs, whatsapp: !prefs.whatsapp})} label="WhatsApp updates" />
          <Toggle on={prefs.status} onChange={() => setPrefs({...prefs, status: !prefs.status})} label="Order status alerts" />
          <Toggle on={prefs.quote} onChange={() => setPrefs({...prefs, quote: !prefs.quote})} label="Quotation ready alerts" />
          <Toggle on={prefs.payment} onChange={() => setPrefs({...prefs, payment: !prefs.payment})} label="Payment reminders" />
        </div>)}
        {tab === 'pref' && (<div className="space-y-3">
          <h3 className="font-700 mb-3">Preferences</h3>
          <div><label className="text-xs font-600 text-muted-foreground">Default currency</label><select className="input-field mt-1"><option>INR (₹)</option><option>CNY (¥)</option><option>Both</option></select></div>
          <div><label className="text-xs font-600 text-muted-foreground">Language</label><select className="input-field mt-1"><option>English</option></select></div>
          <div><label className="text-xs font-600 text-muted-foreground">Timezone</label><select className="input-field mt-1"><option>IST (UTC+5:30)</option></select></div>
        </div>)}
        {tab === 'sec' && (<div className="space-y-4">
          <div><h3 className="font-700 mb-3">Change Password</h3><div className="space-y-2 max-w-md"><input type="password" className="input-field" placeholder="Current" /><input type="password" className="input-field" placeholder="New" /><input type="password" className="input-field" placeholder="Confirm" /><button className="btn-primary px-4 py-2 text-sm" onClick={() => addToast({ type: 'success', title: 'Password updated' })}>Update</button></div></div>
          <div><h3 className="font-700 mb-2">Active Sessions</h3>{[{d:'Chrome on MacBook',l:'Mumbai • Current'},{d:'Safari on iPhone',l:'Mumbai • 1 day ago'}].map(s => <div key={s.d} className="flex items-center justify-between py-2 border-b border-border last:border-0"><div><p className="text-sm font-500">{s.d}</p><p className="text-xs text-muted-foreground">{s.l}</p></div></div>)}<button className="btn-secondary mt-3 px-4 py-2 text-sm">Sign out all devices</button></div>
        </div>)}
        {tab === 'danger' && (<div><h3 className="font-700 text-red-600 mb-2">Danger Zone</h3><p className="text-sm text-muted-foreground mb-3">Deleting your account is permanent.</p><button onClick={() => setConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-600 hover:bg-red-600">Delete Account</button>{confirm && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirm(false)}><div onClick={e => e.stopPropagation()} className="bg-card p-6 rounded-2xl max-w-sm"><h4 className="font-700 mb-2">Are you sure?</h4><p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p><div className="flex gap-2"><button onClick={() => setConfirm(false)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button><button onClick={() => { setConfirm(false); addToast({ type: 'info', title: 'Demo only', description: 'Account deletion is disabled.' }); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-600">Delete</button></div></div></div>}</div>)}
      </div>
    </ClientShell>
  );
}
