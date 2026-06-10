# Domain Migration Report: Vercel → Production Domain

**Migration Date:** 2026-06-10  
**Old Domain:** `https://elioswholesale.vercel.app`  
**New Domain:** `https://elioswholesale.in` (primary) and `https://www.elioswholesale.in` (secondary)

---

## Executive Summary

This report documents all locations in the codebase that reference the old Vercel domain or require configuration updates for the domain migration. The codebase has been thoroughly audited for:

- Hardcoded production URLs
- CORS configuration
- Email verification/password reset links
- OAuth callback URLs
- Environment variable references
- Cookie configuration
- Authentication flows

**Key Finding:** Most of the application uses environment variables for configuration, making this a primarily deployment-configuration change rather than a code change. However, **2 files contain hardcoded references** that need updating.

---

## Files Requiring Code Changes

### 1. **Backend CORS Configuration** 
**File:** `server/src/app.ts` (Lines 25-42)

**Current Status:**
```typescript
const staticAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  "https://elioswholesale.vercel.app",  // ← HARDCODED - MUST UPDATE
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
]
  .map((o) => o?.trim().replace(/\/$/, ""))
  .filter((o): o is string => Boolean(o));

// Pattern-match origins: Vercel preview deployments
const allowedOriginPatterns = [
  /^https:\/\/elioswholesale-[a-z0-9-]+-palaashika26-3692s-projects\.vercel\.app$/,
];
```

**Changes Needed:**
- Replace hardcoded `"https://elioswholesale.vercel.app"` with new domain
- Update Vercel preview pattern OR remove if no longer deploying to Vercel for previews
- Add new domain(s) to static allowed origins

**Recommended Update:**
```typescript
const staticAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(",") ?? []),
  "https://elioswholesale.in",
  "https://www.elioswholesale.in",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
]
  .map((o) => o?.trim().replace(/\/$/, ""))
  .filter((o): o is string => Boolean(o));

// Pattern-match origins: Vercel preview deployments (optional - keep if still using Vercel previews)
const allowedOriginPatterns = [
  /^https:\/\/elioswholesale-[a-z0-9-]+-palaashika26-3692s-projects\.vercel\.app$/,
];
```

**Impact:** Browser requests from the new domain will be rejected by CORS without this change.

---

### 2. **Environment Variable Example File**
**File:** `server/.env.example` (Lines 19-20)

**Current Status:**
```
CLIENT_URL=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
```

**Changes Needed:**
- Update example values to show new domain pattern

**Recommended Update:**
```
CLIENT_URL=https://elioswholesale.in
FRONTEND_URL=https://elioswholesale.in
```

**Impact:** Documentation only; doesn't affect runtime. However, this is a critical template for deployment.

---

## Environment Variables: Deployment Configuration Only

These variables **DO NOT** require code changes but **MUST** be updated in the deployment platforms:

### Backend (Render) Environment Variables

| Variable | Current Value | New Value | Purpose |
|----------|---------------|-----------|---------|
| `CLIENT_URL` | `https://your-frontend.vercel.app` (example) | `https://elioswholesale.in` or `https://www.elioswholesale.in` | Frontend URL for CORS + email links |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (example) | `https://elioswholesale.in` or `https://www.elioswholesale.in` | Frontend URL for email verification/password reset links |
| `CORS_ORIGINS` | (not set - optional) | `https://elioswholesale.in,https://www.elioswholesale.in` | Additional CORS origins (comma-separated) |

**Update Location:** Render Dashboard → Environment Variables

**Priority:** 🔴 CRITICAL - Email links and CORS will fail without these

---

### Frontend (Vercel) Environment Variables

| Variable | Current Status | New Value | Purpose |
|----------|-----------------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | May reference Vercel backend | Should reference Render API URL | Backend API endpoint (used by frontend) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (Already set) | Verify callback URL is updated in Google OAuth console | Google Sign-In |

**Update Location:** Vercel Dashboard → Environment Variables → Production

**Notes:**
- If `NEXT_PUBLIC_API_URL` points to old Vercel backend, update to Render API URL
- Check Google OAuth console for correct callback URLs

---

## Dynamic Configuration (Environment Variable Based - ✅ OK)

These features are **already configured to use environment variables** and will work correctly once env vars are updated:

### Email Flows
- ✅ **Email Verification Link:** Generated using `config.FRONTEND_URL`
  - File: `server/src/api/v1/auth/auth.service.ts` (Line 212)
  - Pattern: `${config.FRONTEND_URL}/verify-email?token=${token}`
  - No code changes needed

- ✅ **Password Reset Link:** Generated using `config.FRONTEND_URL`
  - File: `server/src/api/v1/auth/auth.service.ts` (Line 393)
  - Pattern: `${config.FRONTEND_URL}/reset-password?token=${token}`
  - No code changes needed

### CORS
- ✅ **Dynamic CORS Origins:** Configurable via `process.env.CORS_ORIGINS`
  - File: `server/src/app.ts` (Line 28)
  - Allows adding domains at runtime without redeployment
  - Can add via Render environment variables

### Cookie Configuration
- ✅ **Frontend Cookie:** Uses `samesite=lax` with secure flag for HTTPS
  - File: `src/lib/api/axiosClient.ts` (Line 17)
  - Automatically adjusts based on protocol

- ✅ **Backend Refresh Cookie:** Uses `sameSite: "none"` in production
  - File: `server/src/api/v1/auth/auth.controller.ts` (Line 12)
  - Set conditionally based on `NODE_ENV`

---

## Authentication Flows

### Google OAuth
**Status:** ✅ Uses environment variables  
**Files:**
- Frontend: `src/app/login/page.tsx` - uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Backend: `server/src/api/v1/auth/auth.service.ts` - verifies tokens

**Manual Configuration Needed:**
- Update Google Console redirect URI if it includes domain
- Typical redirect URI: `https://elioswholesale.in/api/v1/auth/google-callback` (if applicable)

### Email Verification
**Status:** ✅ Uses environment variables  
**Flow:**
1. User registers → Backend generates token
2. Backend constructs link: `{FRONTEND_URL}/verify-email?token={token}`
3. Backend sends email
4. User clicks link → Frontend verifies with backend

**No code changes needed** - will use new domain once `FRONTEND_URL` is updated.

### Password Reset
**Status:** ✅ Uses environment variables  
**Flow:**
1. User clicks "Forgot Password"
2. Backend generates reset token
3. Backend constructs link: `{FRONTEND_URL}/reset-password?token={token}`
4. Backend sends email
5. User clicks link → Frontend processes reset

**No code changes needed** - will use new domain once `FRONTEND_URL` is updated.

---

## Configuration Files Summary

| File | Change Needed | Impact |
|------|---------------|--------|
| `server/src/app.ts` | ✏️ Update hardcoded domain | 🔴 CRITICAL - CORS will reject new domain |
| `server/.env.example` | ✏️ Update example values | 📝 Documentation; helps deploy correctly |
| `next.config.mjs` | ✅ None (uses env vars) | Already configured correctly |
| `vercel.json` | ✅ None (no domains) | Already configured correctly |
| `server/railway.json` | ✅ None (no domains) | Already configured correctly |
| `server/Procfile` | ✅ None (no domains) | Already configured correctly |

---

## Test Files (No Changes Needed)

All test files use `localhost` URLs and don't require updates:
- `tests/task2.spec.js` - `http://localhost:4000/api/v1`
- `tests/task3.spec.js` - `http://localhost:4000/api/v1`
- `tests/task4.quotation.spec.js` - `http://localhost:4000/api/v1`
- `playwright.config.js` - `http://localhost:3000`

---

## Summary of Actions Required

### Phase 1: Code Changes (Backend)
```
1. Edit: server/src/app.ts
   - Update hardcoded "https://elioswholesale.vercel.app" → "https://elioswholesale.in"
   - Optionally remove or update Vercel preview pattern if no longer needed
   - Commit and deploy

2. Edit: server/.env.example
   - Update example URLs to new domain
   - Commit (documentation change)
```

### Phase 2: Deployment Configuration (No Code)
```
1. Render Dashboard → Backend Environment Variables
   - Set CLIENT_URL = https://elioswholesale.in
   - Set FRONTEND_URL = https://elioswholesale.in
   - Optionally set CORS_ORIGINS = https://elioswholesale.in,https://www.elioswholesale.in
   - Redeploy backend

2. Vercel Dashboard → Frontend Environment Variables (Production)
   - Verify NEXT_PUBLIC_API_URL points to correct Render backend
   - Verify NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
   - Redeploy frontend

3. Google Cloud Console (if applicable)
   - Update OAuth redirect URIs if domain is hardcoded
```

### Phase 3: DNS & SSL
```
1. Update DNS records to point new domain to Vercel/hosting provider
2. Ensure SSL certificate is valid for both:
   - https://elioswholesale.in
   - https://www.elioswholesale.in
3. Update any CDN/cache configuration if applicable
```

---

## Potential Issues & Mitigations

| Issue | Likelihood | Mitigation |
|-------|------------|-----------|
| CORS rejection from new domain | 🔴 HIGH | Update `server/src/app.ts` hardcoded origin |
| Email links still point to old domain | 🔴 HIGH | Set `FRONTEND_URL` in Render environment |
| API calls fail with wrong backend URL | 🟡 MEDIUM | Verify `NEXT_PUBLIC_API_URL` on Vercel |
| Cookies rejected across domains | 🟢 LOW | Already using dynamic sameSite + secure |
| Google OAuth fails | 🟡 MEDIUM | Update redirect URI in Google Console |
| Old domain still receives traffic | 🟢 LOW | Set up redirect from old → new domain |

---

## Verification Checklist

After migration, verify:

- [ ] Backend deployed with CORS changes
- [ ] Render environment variables set correctly
- [ ] Vercel environment variables set correctly
- [ ] Frontend can make API calls to new backend
- [ ] User registration and email verification works
- [ ] Password reset emails contain new domain links
- [ ] Google login works (if enabled)
- [ ] Cookies are set and transmitted correctly
- [ ] No CORS errors in browser console
- [ ] SSL certificate is valid for both domain variations

---

## Files Analyzed

### Backend Files
- `server/src/app.ts` - CORS configuration
- `server/src/config/env.ts` - Environment variable configuration
- `server/src/api/v1/auth/auth.service.ts` - Email generation
- `server/src/api/v1/auth/auth.controller.ts` - Cookie configuration
- `server/src/templates/verificationEmail.ts` - Email template
- `server/src/templates/resetPasswordEmail.ts` - Email template
- `server/.env.example` - Example environment variables
- `server/Procfile` - Deployment command
- `server/railway.json` - Railway config (no URLs)

### Frontend Files
- `src/lib/apiBase.ts` - API base URL resolution
- `src/lib/api/axiosClient.ts` - HTTP client with cookies
- `src/app/login/page.tsx` - Google OAuth integration
- `src/middleware.ts` - Authentication middleware
- `next.config.mjs` - Next.js configuration
- `playwright.config.js` - E2E test configuration

### Configuration Files
- `vercel.json` - Vercel configuration
- `image-hosts.config.mjs` - Image host whitelist
- `.env.example` - Frontend environment example (not found - may not exist)

---

## Document Version

- **Version:** 1.0
- **Date:** 2026-06-10
- **Status:** Complete Audit
- **Audited By:** Automated Codebase Analysis

