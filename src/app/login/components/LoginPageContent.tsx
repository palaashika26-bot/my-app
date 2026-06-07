'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, Loader2, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { eliosWholesale } from '@/lib/brandAssets';
import { authApi } from '@/lib/api/auth.api';
import { setAccessToken } from '@/lib/api/axiosClient';
import { GoogleLogin } from '@react-oauth/google';
import type { StaffRoleId } from '@/lib/staffRoles';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

function getRedirectPath(role: string, staffRoleId?: StaffRoleId | null): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STAFF') {
    if (staffRoleId === 'sourcing-logistics') return '/staff/sourcing';
    return '/staff/warehouse';
  }
  return '/client-dashboard';
}

function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const { addToast } = useToast();
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // Wipe any stale staff localStorage keys so getStaffRegistry() re-seeds fresh
  useEffect(() => {
    localStorage.removeItem('bk_staff_registry');
    localStorage.removeItem('bk_staff_session');
    localStorage.removeItem('bk_staff_auth');
    localStorage.removeItem('staffSession');
    localStorage.removeItem('staff_session');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setNeedsVerification(false);
    try {
      // 1. Try real backend API
      const res = await authApi.login({ email: data.email, password: data.password });
      const { user: apiUser, accessToken } = res.data.data;

      setAccessToken(accessToken);

      const frontendRole =
        apiUser.role === 'ADMIN' ? 'admin' :
        apiUser.role === 'STAFF' ? 'staff' :
        'client';

      // Determine staffRoleId from backend staffRole field; fall back to warehouse-qc
      const staffRoleId: StaffRoleId | undefined =
        apiUser.role === 'STAFF'
          ? ((apiUser.staffRole as StaffRoleId | undefined) ?? 'warehouse-qc')
          : undefined;

      login(frontendRole, {
        userId: apiUser.id,
        name: `${apiUser.firstName} ${apiUser.lastName}`,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        email: apiUser.email,
        phone: apiUser.phone,
        company: apiUser.client?.companyName,
        clientCity: apiUser.client?.city,
        clientState: apiUser.client?.state,
        clientGstin: apiUser.client?.gstin,
        clientAddress: apiUser.client?.addressLine1,
        clientPincode: apiUser.client?.pincode,
        ...(staffRoleId && { staffRoleId }),
      });

      addToast({
        type: 'success',
        title: `Welcome back, ${apiUser.firstName}!`,
        description: 'Redirecting...',
      });

      window.location.href = redirectTo || getRedirectPath(apiUser.role, staffRoleId);
    } catch (apiErr: unknown) {
      const errMsg =
        (apiErr as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Invalid credentials. Please try again.';
      // Surface a "resend verification" affordance when the account is unverified
      if (errMsg.toLowerCase().includes('verif')) {
        setNeedsVerification(true);
        setUnverifiedEmail(data.email);
      }
      addToast({
        type: 'error',
        title: 'Login failed',
        description: errMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      const res = await authApi.resendVerification(unverifiedEmail);
      addToast({
        type: 'success',
        title: 'Verification email sent',
        description: res.data?.message || 'Check your inbox for the verification link.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Could not resend email',
        description: 'Something went wrong. Please try again in a moment.',
      });
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setIsGoogleLoading(true);
    try {
      const res = await authApi.googleLogin(credential);
      const { user: apiUser, accessToken } = res.data.data;

      setAccessToken(accessToken);

      const frontendRole =
        apiUser.role === 'ADMIN' ? 'admin' :
        apiUser.role === 'STAFF' ? 'staff' :
        'client';

      const staffRoleId: StaffRoleId | undefined =
        apiUser.role === 'STAFF'
          ? ((apiUser.staffRole as StaffRoleId | undefined) ?? 'warehouse-qc')
          : undefined;

      login(frontendRole, {
        userId: apiUser.id,
        name: `${apiUser.firstName} ${apiUser.lastName}`,
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        email: apiUser.email,
        phone: apiUser.phone,
        company: apiUser.client?.companyName,
        clientCity: apiUser.client?.city,
        clientState: apiUser.client?.state,
        clientGstin: apiUser.client?.gstin,
        clientAddress: apiUser.client?.addressLine1,
        clientPincode: apiUser.client?.pincode,
        ...(staffRoleId && { staffRoleId }),
      });

      addToast({
        type: 'success',
        title: `Welcome back, ${apiUser.firstName}!`,
        description: 'Redirecting...',
      });

      window.location.href = getRedirectPath(apiUser.role, staffRoleId);
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Google Sign-In failed. Please try again.';
      addToast({
        type: 'error',
        title: 'Google Sign-In failed',
        description: errMsg,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  function handleGoogleError() {
    addToast({
      type: 'error',
      title: 'Google Sign-In failed',
      description: 'Something went wrong. Please try again.',
    });
  }

  return (
    <div className="min-h-screen flex bg-background w-full overflow-x-hidden">
      {/* Left panel — brand */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-5/12 xl:w-1/2 flex-col relative overflow-hidden"
        style={{
          backgroundImage: `url('/background.svg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <div className="flex items-center">
            <div className="rounded-xl bg-white/95 p-2 shadow-sm ring-1 ring-white/25">
              <Image
                src={eliosWholesale}
                alt="Elios Wholesale"
                width={220}
                height={88}
                className="h-12 w-auto max-w-[min(220px,85vw)] object-contain object-left"
                priority
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-[#4A3B52]/20 text-[#4A3B52] px-3 py-1.5 rounded-full text-xs font-600 mb-6">
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                China → India Sourcing Platform
              </div>
              <h1 className="text-4xl font-700 text-white leading-tight mb-4">
                Source from China.<br />
                <span className="text-[#4A3B52]">Deliver to India.</span>
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                Your trusted bridge for end-to-end product sourcing, quality inspection, and
                logistics management.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { icon: '🔍', label: 'Product Sourcing from 1688 & Alibaba' },
                { icon: '✅', label: 'Quality Check & Repacking' },
                { icon: '🚢', label: 'China to India Logistics' },
                { icon: '📍', label: 'Real-time Shipment Tracking' },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base leading-none">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-slate-400 text-xs">
              "Your Bridge from China to India" — trusted by 500+ Indian businesses
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 min-w-0 w-full flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 xl:px-20 py-10 overflow-x-hidden">
        {/* Mobile logo */}
        <div className="md:hidden self-start mb-8">
          <div className="rounded-xl bg-muted p-2 ring-1 ring-border inline-block">
            <Image
              src={eliosWholesale}
              alt="Elios Wholesale"
              width={200}
              height={80}
              className="h-10 w-auto max-w-[min(200px,80vw)] object-contain object-left"
              priority
            />
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-700 text-foreground mb-1.5">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your EliosWholesale account</p>
          </div>

          {needsVerification && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-600 text-amber-800 mb-1">Email not verified</p>
              <p className="text-sm text-amber-700 mb-3">
                Please check your inbox and click the verification link to activate your account.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="inline-flex items-center gap-2 text-sm font-600 text-[#1D9E75] hover:underline disabled:opacity-60"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  'Resend verification email'
                )}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Google Sign In */}
            {googleEnabled && (
              <div className="w-full flex justify-center">
                {isGoogleLoading ? (
                  <div className="w-full flex items-center justify-center gap-3 border border-border bg-white rounded-xl shadow-sm py-2.5 text-sm font-600 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={(response) => handleGoogleSuccess(response.credential ?? '')}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    width="400"
                    shape="rectangular"
                  />
                )}
              </div>
            )}

            {/* OR divider */}
            <div className="relative flex items-center">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-[10px] font-600 uppercase tracking-wider text-muted-foreground">
                OR
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-500 text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.in"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-500 text-foreground">
                  Password
                </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#4A3B52] hover:text-[#4A3B52] font-500 transition-colors"
                aria-label="Forgot password"
              >
                Forgot password?
              </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="rememberMe"
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
              style={{ minHeight: '44px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to EliosWholesale</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to Elios?{' '}
            <a href="/register" className="text-[#1D9E75] hover:underline font-600 transition-colors">
              Register your business →
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}

export default function LoginPageContent({ googleEnabled }: { googleEnabled?: boolean }) {
  return <LoginForm googleEnabled={googleEnabled} />;
}
