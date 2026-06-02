'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

export default function RegisterSuccessPage() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('reg_email');
    if (stored) setEmail(stored);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#1D9E75]" />
          </div>
        </div>

        <h1 className="text-2xl font-700 text-foreground mb-2">Registration Successful!</h1>

        <p className="text-muted-foreground text-base mb-1">
          We&apos;ve sent a verification email to
        </p>
        {email && (
          <p className="font-600 text-foreground mb-6 break-all">{email}</p>
        )}

        <div className="bg-muted rounded-xl p-5 text-left mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#1D9E75] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-600 text-foreground">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                Click the verification link in the email to activate your Elios account.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600 text-[10px] font-700">!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your <strong>spam or junk</strong> folder. The link expires in 24 hours.
            </p>
          </div>
        </div>

        <a
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-600 text-[#1D9E75] hover:underline"
        >
          Go to Login
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
