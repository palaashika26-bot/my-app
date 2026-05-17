'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { Edit2, Save } from 'lucide-react';

export default function ProfilePage() {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh@techimports.in', phone: '+91 98765 43210', company: 'TechImports India', gstin: '27AABCT3518Q1Z9', businessType: 'Retailer', address: 'Andheri East, Mumbai 400069' });

  return (
    <ClientShell>
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center text-white font-700 text-2xl">RK</div>
        <div className="flex-1"><h1 className="text-xl font-700">{profile.firstName} {profile.lastName}</h1><p className="text-sm text-muted-foreground">{profile.email}</p><p className="text-xs text-muted-foreground mt-1">{profile.company}</p></div>
        <button onClick={() => setEditing(!editing)} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">{editing ? <><Save className="w-4 h-4" /> Save</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Personal Info</h3>
          <div className="space-y-3">
            {(['firstName', 'lastName', 'email', 'phone'] as const).map(k => (
              <div key={k}><label className="text-xs font-600 text-muted-foreground uppercase">{k}</label>
                {editing ? <input value={profile[k]} onChange={e => setProfile({ ...profile, [k]: e.target.value })} className="input-field mt-1" /> : <p className="text-sm font-500 mt-1">{profile[k]}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Company Info</h3>
          <div className="space-y-3">
            {(['company','gstin','businessType','address'] as const).map(k => (
              <div key={k}><label className="text-xs font-600 text-muted-foreground uppercase">{k}</label>
                {editing ? <input value={profile[k]} onChange={e => setProfile({ ...profile, [k]: e.target.value })} className="input-field mt-1" /> : <p className="text-sm font-500 mt-1">{profile[k]}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Account Info</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-muted-foreground">Member since</p><p className="font-700 mt-1">Jan 2024</p></div>
            <div><p className="text-xs text-muted-foreground">Account</p><p className="font-700 mt-1">Client</p></div>
            <div><p className="text-xs text-muted-foreground">Orders</p><p className="font-700 mt-1">47</p></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Change Password</h3>
          <div className="space-y-2">
            <input type="password" placeholder="Current password" className="input-field" />
            <input type="password" placeholder="New password" className="input-field" />
            <input type="password" placeholder="Confirm new password" className="input-field" />
            <button onClick={() => addToast({ type: 'success', title: 'Password updated', description: 'Your password has been changed.' })} className="btn-primary w-full py-2 text-sm">Update Password</button>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
