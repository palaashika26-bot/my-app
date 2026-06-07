'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/lib/api/auth.api';
import { eliosWholesale } from '@/lib/brandAssets';

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast({ type: 'error', title: 'Error', description: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-3xl md:text-4xl font-700 text-white leading-tight mb-4">
              Forgot your password?
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              No worries. Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-700 mb-2">Check your email</h1>
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a password reset link.
              </p>
              <Link href="/login" className="text-sm text-[#4A3B52] font-600 hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
                <h1 className="text-2xl font-700">Reset password</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter the email address linked to your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-500 text-foreground mb-1.5">Email address</label>
                  <input
                    id="email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.in"
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-[#4A3B52] font-600 hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
