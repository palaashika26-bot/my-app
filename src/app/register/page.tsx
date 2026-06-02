'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Globe, Check } from 'lucide-react';
import { eliosWholesale } from '@/lib/brandAssets';
import { authApi } from '@/lib/api/auth.api';
import type { RegisterClientPayload } from '@/lib/types/api.types';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

interface FormValues extends RegisterClientPayload {}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-1">
      {checks.map((c) => (
        <div
          key={c.label}
          className={`flex items-center gap-1.5 text-xs ${c.met ? 'text-emerald-600' : 'text-muted-foreground'}`}
        >
          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${c.met ? 'bg-emerald-100 text-emerald-600' : 'bg-muted'}`}>
            {c.met ? '✓' : '○'}
          </span>
          {c.label}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onTouched' });

  const password = watch('password', '');

  const step1Fields: (keyof FormValues)[] = [
    'firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword',
  ];

  async function goToStep2() {
    const valid = await trigger(step1Fields);
    if (valid) setStep(2);
  }

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setApiError('');
    try {
      await authApi.registerClient(data);
      // Store email for success page
      sessionStorage.setItem('reg_email', data.email);
      window.location.href = '/register/success';
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background w-full overflow-x-hidden">
      {/* Left panel */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-5/12 xl:w-1/2 flex-col relative overflow-hidden"
        style={{ backgroundImage: `url('/background.svg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
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
              <div className="inline-flex items-center gap-2 bg-[#1D9E75]/20 text-[#1D9E75] px-3 py-1.5 rounded-full text-xs font-600 mb-6">
                <Globe className="w-3.5 h-3.5" />
                China → India Sourcing Platform
              </div>
              <h1 className="text-4xl font-700 text-white leading-tight mb-4">
                Start sourcing<br />
                <span className="text-[#1D9E75]">from China today.</span>
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                Join 500+ Indian businesses that trust Elios Wholesale for end-to-end product sourcing and logistics.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: '🔍', label: 'Product Sourcing from 1688 & Alibaba' },
                { icon: '✅', label: 'Quality Check & Repacking' },
                { icon: '🚢', label: 'China to India Logistics' },
                { icon: '📍', label: 'Real-time Shipment Tracking' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base leading-none">{f.icon}</span>
                  <span>{f.label}</span>
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
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-700 text-foreground">Register your business</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Step {step} of 2 — {step === 1 ? 'Personal Details' : 'Company Details'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {([1, 2] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-700 transition-colors ${
                  step >= s ? 'bg-[#1D9E75] text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs font-500 ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Personal' : 'Company'}
                </span>
                {i < 1 && <div className={`flex-1 h-px ${step > s ? 'bg-[#1D9E75]' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* API error */}
          {apiError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── STEP 1 — Personal Details ────────────────────────────────── */}
            <div className={step === 1 ? 'block' : 'hidden'}>
              <div className="space-y-4">
                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-500 text-foreground mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Rahul"
                      className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                      {...register('firstName', { required: 'First name required', maxLength: { value: 50, message: 'Too long' } })}
                    />
                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-500 text-foreground mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Sharma"
                      className={`input-field ${errors.lastName ? 'input-error' : ''}`}
                      {...register('lastName', { required: 'Last name required', maxLength: { value: 50, message: 'Too long' } })}
                    />
                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-500 text-foreground mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="rahul@company.in"
                    className={`input-field ${errors.email ? 'input-error' : ''}`}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                    })}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-500 text-foreground mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="9876543210"
                    className={`input-field ${errors.phone ? 'input-error' : ''}`}
                    {...register('phone', {
                      required: 'Phone number is required',
                      minLength: { value: 10, message: 'Invalid phone number' },
                      maxLength: { value: 15, message: 'Invalid phone number' },
                      pattern: { value: /^[+]?[0-9]+$/, message: 'Invalid phone number' },
                    })}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-500 text-foreground mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Minimum 8 characters' },
                        validate: {
                          hasUpper: (v) => /[A-Z]/.test(v) || 'Must contain uppercase letter',
                          hasNumber: (v) => /[0-9]/.test(v) || 'Must contain a number',
                          hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || 'Must contain special character',
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
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-500 text-foreground mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className={`input-field pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (v) => v === password || 'Passwords do not match',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={goToStep2}
                className="btn-primary w-full py-3 mt-6 flex items-center justify-center gap-2 text-sm"
              >
                <span>Next — Company Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* ── STEP 2 — Company Details ─────────────────────────────────── */}
            <div className={step === 2 ? 'block' : 'hidden'}>
              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="block text-sm font-500 text-foreground mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Sharma Enterprises Pvt Ltd"
                    className={`input-field ${errors.companyName ? 'input-error' : ''}`}
                    {...register('companyName', {
                      required: 'Company name is required',
                      maxLength: { value: 100, message: 'Too long' },
                    })}
                  />
                  {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>}
                </div>

                {/* GSTIN */}
                <div>
                  <label htmlFor="gstin" className="block text-sm font-500 text-foreground mb-1.5">
                    GSTIN{' '}
                    <span className="text-muted-foreground font-400">(optional)</span>
                  </label>
                  <input
                    id="gstin"
                    type="text"
                    placeholder="27AAAAA0000A1Z5"
                    className={`input-field font-mono uppercase ${errors.gstin ? 'input-error' : ''}`}
                    {...register('gstin', {
                      validate: (v) =>
                        !v ||
                        v === '' ||
                        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) ||
                        'Invalid GSTIN format',
                    })}
                  />
                  {errors.gstin ? (
                    <p className="mt-1 text-xs text-red-500">{errors.gstin.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Don&apos;t have one? Leave blank.
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-500 text-foreground mb-1.5">
                    Address Line 1 <span className="text-muted-foreground font-400">(optional)</span>
                  </label>
                  <input
                    id="addressLine1"
                    type="text"
                    placeholder="Plot 12, Industrial Area"
                    className="input-field"
                    {...register('addressLine1', { maxLength: { value: 200, message: 'Too long' } })}
                  />
                </div>

                {/* City + State */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="city" className="block text-sm font-500 text-foreground mb-1.5">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      placeholder="Mumbai"
                      className="input-field"
                      {...register('city', { maxLength: { value: 100, message: 'Too long' } })}
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-500 text-foreground mb-1.5">
                      State
                    </label>
                    <select
                      id="state"
                      className="input-field bg-background"
                      {...register('state')}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pincode */}
                <div>
                  <label htmlFor="pincode" className="block text-sm font-500 text-foreground mb-1.5">
                    Pincode <span className="text-muted-foreground font-400">(optional)</span>
                  </label>
                  <input
                    id="pincode"
                    type="text"
                    placeholder="400001"
                    maxLength={6}
                    className={`input-field ${errors.pincode ? 'input-error' : ''}`}
                    {...register('pincode', {
                      validate: (v) =>
                        !v || v === '' || /^[0-9]{6}$/.test(v) || 'Invalid pincode (6 digits)',
                    })}
                  />
                  {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-600 text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="text-[#1D9E75] hover:underline font-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
