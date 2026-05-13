'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, Copy, Check, Loader2, Globe, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

// Mock credentials for demo — backend integration point
const DEMO_CREDENTIALS = [
  {
    role: 'Client',
    email: 'rajesh@techimports.in',
    password: 'client@2024',
    description: 'Access client dashboard, orders, and requests',
  },
  {
    role: 'Admin',
    email: 'admin@elioswholesale.in',
    password: 'admin@2024',
    description: 'Access admin panel, manage all orders and users',
  },
];

interface LoginFormValues {
  email: string;
  password: string;
  role: 'client' | 'admin';
  rememberMe: boolean;
}

function LoginForm() {
  const { addToast } = useToast();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      role: 'client',
      rememberMe: false,
    },
  });

  const selectedRole = watch('role');

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    // TODO: Backend integration — POST /api/auth/login with { email, password, role }
    await new Promise((r) => setTimeout(r, 1500));

    const validCredential = DEMO_CREDENTIALS.find(
      (c) => c.email === data.email && c.password === data.password
    );

    if (!validCredential) {
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Login failed',
        description: 'Invalid credentials — use the demo accounts below to sign in.',
      });
      return;
    }

    addToast({
      type: 'success',
      title: `Welcome back!`,
      description: `Redirecting to your ${validCredential.role.toLowerCase()} dashboard...`,
    });

    await new Promise((r) => setTimeout(r, 800));
    // Persist auth state in context + localStorage + cookie
    if (validCredential.role === 'Client') {
      login('client', { name: 'Rajesh Kumar', email: validCredential.email, company: 'TechImports India' });
      window.location.href = '/client-dashboard';
    } else {
      login('admin', { name: 'Arjun Sharma', email: validCredential.email });
      window.location.href = '/admin';
    }
  }

  function handleGoogleSignIn() {
    addToast({
      type: 'info',
      title: 'Google Sign-In coming soon',
      description: 'Use demo credentials below for the live demo.',
    });
  }

  async function copyToClipboard(text: string, fieldId: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function fillCredentials(email: string, password: string, role: 'client' | 'admin') {
    setValue('email', email);
    setValue('password', password);
    setValue('role', role);
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="hidden md:flex md:w-5/12 lg:w-5/12 xl:w-1/2 flex-col bg-primary relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(249,115,22,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(249,115,22,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M2 16 C2 16 6 8 11 8 C16 8 20 16 20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <rect x="3" y="14" width="3" height="5" rx="1" fill="white"/>
                <rect x="16" y="14" width="3" height="5" rx="1" fill="white"/>
                <path d="M3 16 L19 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">EliosWholesale</span>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1.5 rounded-full text-xs font-600 mb-6">
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                China → India Sourcing Platform
              </div>
              <h1 className="text-4xl font-700 text-white leading-tight mb-4">
                Source from China.<br />
                <span className="text-accent">Deliver to India.</span>
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                Your trusted bridge for end-to-end product sourcing, quality inspection, and logistics management.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-col gap-3">
              {[
                { icon: '🔍', label: 'Product Sourcing from 1688 & Alibaba' },
                { icon: '✅', label: 'Quality Check & Repacking' },
                { icon: '🚢', label: 'China to India Logistics' },
                { icon: '📍', label: 'Real-time Shipment Tracking' },
              ].map((feature) => (
                <div
                  key={`feature-${feature.label}`}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <span className="text-base leading-none">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-slate-400 text-xs">
              "Your Bridge from China to India" — trusted by 500+ Indian businesses
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 xl:px-20 py-10 overflow-y-auto">
        {/* Mobile logo */}
        <div className="md:hidden self-start flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M2 16 C2 16 6 8 11 8 C16 8 20 16 20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <rect x="3" y="14" width="3" height="5" rx="1" fill="white"/>
              <rect x="16" y="14" width="3" height="5" rx="1" fill="white"/>
              <path d="M3 16 L19 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg text-primary tracking-tight">EliosWholesale</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-700 text-foreground mb-1.5">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your EliosWholesale account</p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <label className="block text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">
              Sign in as
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              {(['client', 'admin'] as const).map((role) => (
                <button
                  key={`role-${role}`}
                  type="button"
                  onClick={() => setValue('role', role)}
                  className={`py-2.5 rounded-lg text-sm font-600 transition-all duration-200 ${
                    selectedRole === role
                      ? 'bg-card shadow-card text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={selectedRole === role}
                  suppressHydrationWarning
                >
                  {role === 'client' ? '👤 Client' : '🛡️ Admin'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-border bg-white rounded-xl shadow-sm py-2.5 text-sm font-600 text-foreground hover:bg-muted transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            {/* OR divider */}
            <div className="relative flex items-center">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-[10px] font-600 uppercase tracking-wider text-muted-foreground">OR</span>
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
                <button
                  type="button"
                  className="text-xs text-accent hover:text-orange-600 font-500 transition-colors"
                  aria-label="Forgot password"
                >
                  Forgot password?
                </button>
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
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
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

          {/* Contact link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a
              href="mailto:sales@elioswholesale.in"
              className="text-accent hover:text-orange-600 font-500 transition-colors"
            >
              Contact us to get started
            </a>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wider">
                Demo Credentials
              </span>
            </div>
            <div className="divide-y divide-border">
              {DEMO_CREDENTIALS.map((cred) => (
                <div key={`cred-${cred.role}`} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge text-[10px] px-2 py-0.5 ${
                          cred.role === 'Admin' ?'bg-primary text-primary-foreground' :'bg-accent/15 text-accent'
                        }`}
                      >
                        {cred.role}
                      </span>
                      <span className="text-xs text-muted-foreground">{cred.description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        fillCredentials(
                          cred.email,
                          cred.password,
                          cred.role.toLowerCase() as 'client' | 'admin'
                        )
                      }
                      className="text-xs text-accent hover:text-orange-600 font-600 transition-colors px-2 py-1 rounded hover:bg-accent/10"
                    >
                      Use
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Email', value: cred.email, id: `${cred.role}-email` },
                      { label: 'Password', value: cred.password, id: `${cred.role}-password` },
                    ].map((field) => (
                      <div
                        key={`field-${field.id}`}
                        className="flex items-center justify-between bg-secondary rounded-lg px-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-muted-foreground font-500 w-14 flex-shrink-0">
                            {field.label}
                          </span>
                          <span className="text-xs font-500 text-foreground font-tabular truncate">
                            {field.value}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(field.value, field.id)}
                          className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Copy ${field.label}`}
                        >
                          {copiedField === field.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPageContent() {
  return <LoginForm />;
}