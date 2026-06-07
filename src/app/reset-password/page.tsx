'use client';
import React, { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/lib/api/auth.api';
import { eliosWholesale } from '@/lib/brandAssets';

function ResetForm() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function validate(): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      addToast({ type: 'error', title: 'Validation error', description: validationError });
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to reset password. The link may be expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-700 mb-2">Invalid link</h1>
          <p className="text-sm text-muted-foreground mb-6">This password reset link is invalid. Please request a new one.</p>
          <Link href="/forgot-password" className="btn-primary px-6 py-2.5 text-sm">Request new link</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-700 mb-2">Password reset!</h1>
          <p className="text-sm text-muted-foreground mb-6">Your password has been updated successfully.</p>
          <Link href="/login" className="btn-primary px-6 py-2.5 text-sm">Sign in with new password</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background w-full overflow-x-hidden">
      <div className="hidden md:flex md:w-5/12 lg:w-5/12 xl:w-1/2 flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <div className="flex items-center">
            <div className="rounded-xl bg-white/95 p-2 shadow-sm ring-1 ring-white/25">
              <Image src={eliosWholesale} alt="Elios Wholesale" width={220} height={88}
                className="h-12 w-auto max-w-[min(220px,85vw)] object-contain object-left" priority />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2 className="text-3xl md:text-4xl font-700 text-white leading-tight mb-4">Set a new password</h2>
            <p className="text-white/70 text-base leading-relaxed">Choose a strong password for your account.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            ← Back to login
          </Link>
          <h1 className="text-2xl font-700 mb-1">New password</h1>
          <p className="text-sm text-muted-foreground mb-6">Must be at least 8 characters with uppercase, number &amp; special character.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-500 text-foreground mb-1.5">New password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="Enter new password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-500 text-foreground mb-1.5">Confirm password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" required
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input-field" placeholder="Re-enter new password" />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
