# Quick Reference: Domain Migration Checklist

## 🔴 CRITICAL - Code Changes Required

### 1. Update Backend CORS Configuration
**File:** `server/src/app.ts` (Line 29)

**Change:**
```diff
- "https://elioswholesale.vercel.app",
+ "https://elioswholesale.in",
+ "https://www.elioswholesale.in",
```

**Why:** Without this, the frontend will be blocked by CORS on login, API calls, etc.

---

### 2. Update Environment Variable Template
**File:** `server/.env.example` (Lines 19-20)

**Change:**
```diff
- CLIENT_URL=https://your-frontend.vercel.app
- FRONTEND_URL=https://your-frontend.vercel.app
+ CLIENT_URL=https://elioswholesale.in
+ FRONTEND_URL=https://elioswholesale.in
```

---

## 🟡 CRITICAL - Deployment Configuration (No Code Changes)

### Render Dashboard - Backend Environment Variables
Set these in Render → Environment Variables:

```
CLIENT_URL=https://elioswholesale.in
FRONTEND_URL=https://elioswholesale.in
CORS_ORIGINS=https://elioswholesale.in,https://www.elioswholesale.in
```

**Why:** Email verification/password reset links use `FRONTEND_URL`. CORS checks use `CLIENT_URL` and `CORS_ORIGINS`.

---

### Vercel Dashboard - Frontend Environment Variables
Verify these are set for Production:

```
NEXT_PUBLIC_API_URL=<Render API URL>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your ID>
```

**Why:** Frontend needs to know where to call the API and which OAuth client to use.

---

## ✅ Already Configured (No Changes Needed)

- ✅ Email verification links - uses env var `FRONTEND_URL`
- ✅ Password reset links - uses env var `FRONTEND_URL`
- ✅ Cookie settings - dynamic based on HTTPS
- ✅ API client - uses env var `NEXT_PUBLIC_API_URL`
- ✅ Google OAuth - uses env var `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- ✅ Next.js config - all env-based
- ✅ Test files - use localhost (no changes needed)

---

## Deployment Order

1. **Update backend code** → `git push` to Render
2. **Wait for build** on Render
3. **Update Render env vars** and redeploy
4. **Verify backend is live** at `https://elios-server.onrender.com/api/v1/health`
5. **Update Vercel env vars** for frontend
6. **Redeploy frontend** on Vercel
7. **Test:** Login, email verification, password reset, API calls

---

## Test After Migration

```bash
# Test CORS - should not see CORS error
curl -H "Origin: https://elioswholesale.in" \
     -H "Access-Control-Request-Method: POST" \
     https://elios-server.onrender.com/api/v1/health

# Test Email - create test account and check email
# Should contain: https://elioswholesale.in/verify-email?token=...

# Test API - verify frontend can call backend
# Open browser console → verify no 401/403 errors
```

---

## If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| CORS error on login | Update `server/src/app.ts` line 29 |
| Email links wrong domain | Set `FRONTEND_URL` in Render env vars |
| API calls fail | Check `NEXT_PUBLIC_API_URL` on Vercel |
| Still seeing old domain | Check DNS/caching, clear browser cache |

