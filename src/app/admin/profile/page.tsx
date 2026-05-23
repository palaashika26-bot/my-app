'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { STAFF_ROLE_LABELS } from '@/lib/staffRoles';
import { User, Mail, Phone, Shield, Lock, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function AdminProfilePage() {
  const { user, role, login } = useAuth();
  const { addToast } = useToast();

  const [editingInfo, setEditingInfo] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'staff' && user?.staffRoleId
        ? STAFF_ROLE_LABELS[user.staffRoleId]
        : 'Staff';

  function saveInfo() {
    if (!name.trim()) {
      addToast({ type: 'error', title: 'Name is required' });
      return;
    }
    if (!user || !role || role === null) return;
    const updated = { ...user, name: name.trim(), phone: phone.trim() };
    login(role as 'admin' | 'staff' | 'client', updated);
    setEditingInfo(false);
    addToast({ type: 'success', title: 'Profile updated', description: 'Your details have been saved.' });
  }

  function cancelInfo() {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setEditingInfo(false);
  }

  function savePassword() {
    if (!currentPw) {
      addToast({ type: 'error', title: 'Enter current password' });
      return;
    }
    if (newPw.length < 6) {
      addToast({ type: 'error', title: 'New password must be at least 6 characters' });
      return;
    }
    if (newPw !== confirmPw) {
      addToast({ type: 'error', title: 'Passwords do not match' });
      return;
    }
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    addToast({ type: 'success', title: 'Password updated', description: 'Your password has been changed.' });
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-700 mb-1">My Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your personal details and security settings</p>

        {/* Avatar + name header */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#5c5470] text-white flex items-center justify-center text-2xl font-700 flex-shrink-0">
            {initialsFromName(displayName)}
          </div>
          <div>
            <p className="text-lg font-700 text-foreground">{displayName}</p>
            <p className="text-sm text-muted-foreground">{displayEmail}</p>
            <span className="inline-block mt-1 text-[11px] font-600 px-2.5 py-0.5 rounded-full bg-[#5c5470]/10 text-[#5c5470]">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-700 text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-[#5c5470]" /> Personal Information
            </h2>
            {!editingInfo ? (
              <button
                onClick={() => setEditingInfo(true)}
                className="inline-flex items-center gap-1.5 text-xs font-600 text-[#5c5470] hover:text-[#4a4358] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelInfo}
                  className="inline-flex items-center gap-1.5 text-xs font-600 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={saveInfo}
                  className="inline-flex items-center gap-1.5 text-xs font-600 text-white bg-[#5c5470] hover:bg-[#4a4358] px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Full Name
              </label>
              {editingInfo ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your full name"
                />
              ) : (
                <p className="text-sm font-500 text-foreground py-2">{displayName}</p>
              )}
            </div>
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Email Address
              </label>
              <div className="flex items-center gap-2 py-2">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-foreground">{displayEmail}</p>
                <span className="text-[10px] text-muted-foreground">(cannot be changed)</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Phone
              </label>
              {editingInfo ? (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="+91 XXXXX XXXXX"
                />
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-foreground">{phone || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-4">
          <h2 className="font-700 text-foreground flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#5c5470]" /> Account
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Username / Login Email
              </label>
              <div className="flex items-center gap-2 py-2">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-500 text-foreground font-mono">{displayEmail}</p>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Role
              </label>
              <div className="py-2">
                <span className="inline-block text-[11px] font-600 px-2.5 py-0.5 rounded-full bg-[#5c5470]/10 text-[#5c5470]">
                  {roleLabel}
                </span>
              </div>
            </div>
            {user?.staffId && (
              <div>
                <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                  Staff ID
                </label>
                <p className="text-sm font-500 text-foreground py-2 font-mono">{user.staffId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h2 className="font-700 text-foreground flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#5c5470]" /> Change Password
          </h2>
          <div className="space-y-3 max-w-sm">
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-600 text-muted-foreground tracking-wide block mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={savePassword}
              className="btn-primary px-5 py-2 text-sm mt-2"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
