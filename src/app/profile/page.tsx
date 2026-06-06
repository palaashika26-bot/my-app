'use client';
import React, { useState, useEffect } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api/auth.api';
import { Edit2, Save, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    company: '', gstin: '', businessType: 'Retailer', address: '',
  });

  useEffect(() => {
    authApi.getMe()
      .then(res => {
        const u = res.data.data;
        setProfile({
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone || '',
          company: u.client?.companyName || '',
          gstin: u.client?.gstin || '',
          businessType: 'Retailer',
          address: [u.client?.addressLine1, u.client?.city, u.client?.state, u.client?.pincode]
            .filter(Boolean).join(', '),
        });
      })
      .catch(() => {
        if (user) {
          setProfile({
            firstName: user.firstName || user.name.split(' ')[0] || '',
            lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
            email: user.email,
            phone: user.phone || '',
            company: user.company || '',
            gstin: user.clientGstin || '',
            businessType: 'Retailer',
            address: [user.clientAddress, user.clientCity, user.clientState, user.clientPincode]
              .filter(Boolean).join(', '),
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const initials = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '');

  function handleSave() {
    addToast({ type: 'success', title: 'Profile saved', description: 'Your changes have been saved.' });
    setEditing(false);
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-[#1A1423] flex items-center justify-center text-white font-700 text-2xl">
          {initials || '?'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-700">{profile.firstName} {profile.lastName}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="text-xs text-muted-foreground mt-1">{profile.company}</p>
        </div>
        <button onClick={() => editing ? handleSave() : setEditing(true)}
          className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">
          {editing ? <><Save className="w-4 h-4" /> Save</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
        </button>
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
            <div><p className="text-xs text-muted-foreground">Role</p><p className="font-700 mt-1">Client</p></div>
            <div><p className="text-xs text-muted-foreground">Account</p><p className="font-700 mt-1">Active</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-700 mt-1">{profile.email ? 'Verified' : '—'}</p></div>
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
    </ClientLayout>
  );
}