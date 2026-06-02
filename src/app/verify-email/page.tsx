'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';

type Status = 'loading' | 'success' | 'expired' | 'used' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMsg('No verification token found in the URL.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      })
      .catch((err: unknown) => {
        const msg: string =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Verification failed. Please try again.';
        setErrorMsg(msg);

        const lower = msg.toLowerCase();
        if (lower.includes('expired')) {
          setStatus('expired');
        } else if (lower.includes('already been used')) {
          setStatus('used');
        } else {
          setStatus('invalid');
        }
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1D9E75] mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#1D9E75]" />
            </div>
          </div>
          <h1 className="text-2xl font-700 text-foreground mb-2">Email Verified Successfully!</h1>
          <p className="text-muted-foreground mb-6">
            Your account is now active. Redirecting you to login...
          </p>
          <a
            href="/login"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-sm"
          >
            Login to Elios
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            Redirecting automatically in 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-700 text-foreground mb-2">
          {status === 'expired'
            ? 'This link has expired'
            : status === 'used'
            ? 'Link already used'
            : 'Invalid verification link'}
        </h1>

        <p className="text-muted-foreground mb-8 text-sm">{errorMsg}</p>

        {status === 'expired' && (
          <a
            href="/register"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-sm"
          >
            Register again
            <ArrowRight className="w-4 h-4" />
          </a>
        )}

        {(status === 'used' || status === 'invalid') && (
          <a
            href="/login"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-sm"
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-[#1D9E75]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
