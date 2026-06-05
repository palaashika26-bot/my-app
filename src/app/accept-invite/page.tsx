'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 font-600 mb-2">Invalid invite link</p>
        <p className="text-sm text-muted-foreground">This link is missing a token. Please ask your administrator to resend the invite.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.acceptInvite({ token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong. The link may have expired.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-700 text-foreground">Account activated!</h2>
        <p className="text-sm text-muted-foreground">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-700 text-foreground">Set your password</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Choose a strong password to activate your Elios staff account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-600 text-muted-foreground mb-1 block">New Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-600 text-muted-foreground mb-1 block">Confirm Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            className="input-field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 text-sm font-600 disabled:opacity-60"
        >
          {submitting ? 'Activating…' : 'Activate Account'}
        </button>
      </form>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-8">
        <div className="text-center mb-2">
          <span className="text-lg font-700 text-primary">Elios Wholesale</span>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-8">Loading…</div>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
