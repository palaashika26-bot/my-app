# Elios B2B Platform — Backend Report

> Generated: 2026-06-01  
> Stack: Express + TypeScript + Prisma + PostgreSQL (Supabase)  
> Port: `4000`  
> Health check: `GET /api/v1/health`

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Directory Structure](#2-directory-structure)
3. [App Entrypoint & Middleware Pipeline](#3-app-entrypoint--middleware-pipeline)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Schema](#5-database-schema)
6. [API Route Map](#6-api-route-map)
7. [Middleware Layer](#7-middleware-layer)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Business Logic Flows](#9-business-logic-flows)
10. [Utility & Helper Layer](#10-utility--helper-layer)
11. [Email System](#11-email-system)
12. [Security Hardening](#12-security-hardening)
13. [Health & Observability](#13-health--observability)
14. [Known Risks & Issues](#14-known-risks--issues)

---

## 1. Technology Stack

| Concern | Library | Version |
|---|---|---|
| Runtime | Node.js / TypeScript | TS 5.3 |
| Framework | Express | 4.18 |
| ORM | Prisma | 5.7 |
| Database | PostgreSQL (Supabase) | — |
| Auth | jsonwebtoken + bcryptjs | jwt 9, bcrypt 2.4 |
| Validation | Zod | 3.22 |
| Rate limiting | express-rate-limit + express-slow-down | rateLimit 8.5, slowDown 3.1 |
| Security headers | helmet + hpp | helmet 8.2, hpp 0.2 |
| Email | nodemailer (Gmail SMTP) | 8.0 |
| Cookies | cookie-parser | 1.4 |
| CORS | cors | 2.8 |

**Scripts**

```bash
yarn dev      # nodemon --exec ts-node src/server.ts  (hot reload)
yarn build    # tsc  →  dist/
yarn start    # node dist/server.js  (production)
npx prisma db seed  # ts-node prisma/seed.ts
```

---

## 2. Directory Structure

```
server/
├── src/
│   ├── app.ts                        # Express app factory
│   ├── server.ts                     # Entry point — calls app.listen()
│   ├── @types/express/index.d.ts     # Augment Request with req.user
│   ├── api/v1/
│   │   ├── index.ts                  # Mount all routers under /api/v1
│   │   ├── admin/          (controller · service · repository · routes)
│   │   ├── auth/           (controller · schema · service · repository · routes)
│   │   ├── categories/     (controller · service · repository · routes)
│   │   ├── inquiries/      (controller · schema · service · repository · routes)
│   │   ├── notifications/  (controller · service · routes)
│   │   ├── orders/         (controller · service · repository · routes)
│   │   ├── payments/       (controller · schema · service · repository · routes)
│   │   ├── products/       (controller · service · repository · routes)
│   │   ├── requests/       (controller · schema · service · repository · routes)
│   │   └── suppliers/      (controller · service · repository · routes)
│   ├── config/
│   │   ├── env.ts          # Validated environment config (throws on missing required vars)
│   │   ├── prisma.ts       # Prisma client singleton
│   │   └── email.ts        # Nodemailer transporter + sendEmail()
│   ├── middleware/
│   │   ├── authenticate.ts # JWT verification + CLIENT approval check
│   │   ├── authorize.ts    # Role-based guard (must follow authenticate)
│   │   ├── errorHandler.ts # Global error handler (Prisma error mapping)
│   │   ├── notFound.ts     # 404 catch-all
│   │   ├── rateLimiter.ts  # general / auth / search / speed limiters
│   │   ├── sanitize.ts     # Strip $-keys and dot-path keys (NoSQL injection)
│   │   ├── security.ts     # Helmet + HPP + disable X-Powered-By
│   │   └── validate.ts     # Zod body validation + query param validation
│   ├── templates/
│   │   ├── verificationEmail.ts
│   │   ├── newInquiryEmail.ts
│   │   └── quotationEmail.ts
│   ├── types/
│   │   └── express.d.ts
│   └── utils/
│       ├── ApiError.ts            # Custom error class with static constructors
│       ├── ApiResponse.ts         # Standard JSON response wrapper
│       ├── asyncHandler.ts        # Catches async errors and forwards to next()
│       ├── generateRequestNumber.ts # BK-REQ-YYYY-NNNN sequential ID generator
│       └── pagination.ts          # getPagination + buildPaginationMeta
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 3. App Entrypoint & Middleware Pipeline

`src/app.ts` — middleware is applied **in order**:

```
1.  applySecurityMiddleware()   → Helmet CSP/HSTS headers + HPP + remove X-Powered-By
2.  cors()                      → Whitelist: CLIENT_URL + localhost:3000  (credentials: true)
3.  generalLimiter              → 500 req / 15 min / IP  (all routes)
4.  speedLimiter                → +100 ms delay per hit after 50 req in 15 min window
5.  express.json({ limit:'50mb' }) → Body parsing (50 MB cap for base64 photo uploads)
6.  express.urlencoded()        → Form body parsing
7.  cookieParser()              → Cookie access
8.  sanitizeInput               → Strip $-prefixed and dot-notation keys from body + query
9.  GET /api/v1/health          → Public health probe (no auth)
10. /api/v1  →  v1Router        → All business routes (see §6)
11. notFound                    → 404 for any unmatched route
12. errorHandler                → Global error handler (last middleware)
```

CORS allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`  
CORS allowed headers: `Content-Type, Authorization`

---

## 4. Environment Configuration

All config is centralized in `src/config/env.ts`. Required vars throw at startup if absent.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | Server listen port |
| `NODE_ENV` | No | `development` | Controls log verbosity and error detail |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Legacy secret (backwards compat) |
| `JWT_ACCESS_SECRET` | **Yes** | — | Signs 24 h access tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `24h` | Access token TTL |
| `JWT_REFRESH_SECRET` | **Yes** | — | Signs 7 d refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `CLIENT_URL` | No | `http://localhost:3000` | CORS origin + default FRONTEND_URL |
| `FRONTEND_URL` | No | falls back to CLIENT_URL | Used in email verification links |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USER` | No | `""` | SMTP username |
| `EMAIL_PASS` | No | `""` | SMTP password / app password |
| `EMAIL_FROM` | No | `Elios <noreply@elioswholesale.in>` | From address |

> **Startup guard:** `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are validated via the `required()` function — the process throws immediately if any are missing.

---

## 5. Database Schema

**Provider:** PostgreSQL via Prisma ORM  
**Connection:** single `DATABASE_URL` env var (Supabase connection pooling recommended for production)

### Enums

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `STAFF`, `CLIENT` |
| `OrderStatus` | `CONFIRMED`, `PAYMENT_PENDING`, `ADVANCE_PAID`, `FULLY_PAID`, `SOURCING`, `QC_PENDING`, `QC_PASSED`, `QC_FAILED`, `REPACKING`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `PaymentType` | `ADVANCE`, `BALANCE`, `FULL` |
| `PaymentStatus` | `PENDING`, `SUBMITTED`, `VERIFIED`, `REJECTED` |
| `InquiryStatus` | `PENDING`, `REVIEWING`, `QUOTED`, `PARTIALLY_ACCEPTED`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `CONVERTED` |
| `RequestStatus` | `SUBMITTED`, `REVIEWING`, `QUOTED`, `PARTIALLY_ACCEPTED`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `CONVERTED` |
| `RequestItemStatus` | `PENDING`, `QUOTED`, `ACCEPTED`, `REJECTED`, `COUNTERED` |
| `RequestItemType` | `CATALOG`, `CUSTOM` |
| `QCStatus` | `PENDING`, `PASSED`, `FAILED` |
| `ShipmentStatus` | `PREPARING`, `DISPATCHED`, `IN_TRANSIT`, `CUSTOMS`, `DELIVERED` |

### Models & Key Fields

#### `users` (User)
```
id              UUID PK
email           UNIQUE, indexed
passwordHash    String  (never returned to client)
firstName / lastName / phone
role            Role  (default CLIENT)
staffRole       String?  (freeform staff role label)
isActive        Boolean  (default true)
isEmailVerified Boolean  (default false)
isApproved      Boolean  (default false)  — admin must approve CLIENTs
deletedAt       DateTime?  (soft delete)
```
Relations: `client` (1-1), `refreshTokens` (1-many), `qcChecks`, `emailVerifications`, `requestActivities`, `requestMessages`, `verifiedPayments`, `verifiedRequestPayments`

#### `email_verifications` (EmailVerification)
```
token     UNIQUE, indexed
expiresAt DateTime  (24 h TTL)
usedAt    DateTime?  (one-time use)
→ cascades delete with user
```

#### `refresh_tokens` (RefreshToken)
```
token     UNIQUE
expiresAt DateTime  (7 d TTL)
revokedAt DateTime?  (explicit logout)
→ cascades delete with user
```

#### `clients` (Client)
```
userId       UNIQUE FK → users
companyName  String
gstin        String? UNIQUE
addressLine1 / city / state / pincode
isActive     Boolean
```

#### `suppliers` (Supplier)
```
companyName / country / city / contactName / contactEmail / contactPhone / notes
isVerified   Boolean
→ has products[] and orderItems[]
```

#### `product_categories` (ProductCategory)
Self-referencing tree: `parentId → id` for hierarchical categories. Indexed on `slug`.

#### `products` (Product)
```
slug         UNIQUE, indexed
basePrice    Decimal(12,2)  in CNY
currency     default "CNY"
moq          Int  (minimum order qty)
images       String[]
supplierId   FK → suppliers
categoryId   FK → product_categories
deletedAt    DateTime?  (soft delete)
```

#### `orders` (Order)
```
orderNumber      UNIQUE, indexed
clientId         FK → clients, indexed
status           OrderStatus  (default CONFIRMED)
subtotalINR / shippingCostINR / taxINR / totalINR  Decimal(12,2)
advanceAmountINR Decimal(12,2)?
gstInvoice       Json?
completedStages  String[]  (11-step pipeline)
deliveryPreference / deliveryAddress  String?
deletedAt        DateTime?
→ items[], shipment, payments[], warehouseReport
```

#### `warehouse_reports` (WarehouseReport)
```
orderId          UNIQUE FK → orders
itemReports      Json?
repackPhotos     String[]  (base64, max 30)
warehouseNote    String?
finalWeightKg    Float?
finalVolumeCbm   Float?
repackNotes      String?
repackSaved      Boolean
outboundTrackingId / packingListUrl / deliverySlipUrl  String?
adminReplies     Json?
isReadByAdmin / isReadByStaff  Boolean
clientApproved   Boolean?
clientConcern    String?
clientReviewedAt DateTime?
```

#### `payments` (Payment)
```
orderId          FK → orders (Restrict delete)
type             PaymentType
amountINR        Decimal(12,2)
status           PaymentStatus  (default PENDING)
proofImageBase64 String?  (large — base64 encoded)
proofFileName    String?
submittedAt / verifiedAt / rejectedAt  DateTime?
verifiedByUserId FK → users (nullable)
rejectionReason  String?
```

#### `order_items` (OrderItem)
```
orderId / productId? / supplierId?
quantity         Int
unitPriceCNY / unitPriceINR / totalINR  Decimal(12,2)
imageUrl         String?
→ qcCheck (1-1)
```

#### `shipments` (Shipment)
```
orderId          UNIQUE FK → orders
trackingNumber / carrier  String?
status           ShipmentStatus
dispatchedAt / estimatedDelivery / deliveredAt  DateTime?
```

#### `quality_checks` (QualityCheck)
```
orderItemId      UNIQUE FK → order_items
checkedByUserId  FK → users
status           QCStatus
images           String[]
checkedAt        DateTime?
```

#### `inquiries` (Inquiry)
```
inquiryNumber    UNIQUE
clientId         FK → clients, indexed
status           InquiryStatus
staffNotes       String?
→ items[]
```

#### `inquiry_items` (InquiryItem)
```
type             String  (CUSTOM / CATALOG)
productId?       FK → products
quantity / unit
targetPricePerUnit / quotedPrice  Decimal(12,2)?
status           InquiryStatus
```

#### `sourcing_requests` (SourcingRequest)
```
requestNumber    UNIQUE BK-REQ-YYYY-NNNN, indexed
clientId         FK → clients, indexed
status           RequestStatus
totalBudgetINR / advanceAmountINR  Decimal(12,2)?
convertedOrderId String?  (set when CONVERTED)
→ items[], activities[], messages[], payments[]
```

#### `request_items` (RequestItem)
```
type             RequestItemType  (CATALOG | CUSTOM)
quotedRMB / quotedINR  Decimal(12,2)?
status           RequestItemStatus
clientResponse   String?
counterPriceINR  Decimal(12,2)?
counterNote      String?
referenceImageUrls  String[]
```
Currency conversion: RMB → INR at **×11.5 rate** (hardcoded in service layer).

#### `request_messages` (RequestMessage)
```
requestId / senderId FK → sourcing_requests / users
senderRole   String
text         String
→ indexed on (requestId, createdAt)
```

#### `request_payments` (RequestPayment)
```
requestId        FK → sourcing_requests (Restrict delete)
type / amountINR / status / proofImageBase64
verifiedByUserId FK → users
→ on VERIFIED triggers order creation
```

#### `request_activities` (RequestActivity)
```
requestId / userId / action  (audit log)
```

### Indexes Summary
| Table | Indexed Columns |
|---|---|
| users | email |
| email_verifications | token, userId |
| refresh_tokens | userId |
| product_categories | slug |
| products | slug, supplierId |
| orders | clientId, orderNumber |
| payments | orderId |
| inquiries | clientId |
| sourcing_requests | clientId, requestNumber |
| request_items | requestId |
| request_messages | (requestId, createdAt) |
| request_payments | requestId |

---

## 6. API Route Map

Base prefix: `/api/v1`

### Auth — `/auth`
```
POST   /login                    Public + authLimiter — issues access + refresh token
POST   /register                 Public + authLimiter — legacy admin-created account
POST   /register/client          Public + authLimiter — self-registration with email verification
GET    /verify-email?token=...   Public — marks email verified + approved
POST   /logout                   Public — revokes refresh token from DB
GET    /me                       authenticate — returns current user
POST   /refresh                  Public — exchanges refresh token for new access token
```

### Products — `/products`
```
GET    /                         Public — paginated list (filter: category, supplier, search)
GET    /:id                      Public — single product detail
```

### Categories — `/categories`
```
GET    /                         Public — full tree with children
GET    /:slug                    Public — single category by slug
```

### Orders — `/orders`
```
GET    /                         authenticate + validateQueryParams — paginated; CLIENT sees own only
GET    /:id                      authenticate — CLIENT ownership enforced
GET    /:id/gst                  authenticate — fetch saved GST invoice JSON
POST   /:id/gst                  authenticate — save GST invoice (admin/staff)
PATCH  /:id/stages               authenticate — update completedStages array (admin/staff)
PATCH  /:id/status               authenticate — update OrderStatus (admin/staff)
PATCH  /:id/delivery-preference  authenticate — set delivery preference (client/admin/staff)
GET    /:id/warehouse-report     authenticate — fetch WarehouseReport
PATCH  /:id/warehouse-report     authenticate — upsert WarehouseReport (warehouse/admin/staff)
POST   /:id/warehouse-photos     authenticate — upload base64 photos (warehouse)
DELETE /:id/warehouse-photos     authenticate — remove photo by index (warehouse/admin/staff)
PATCH  /:id/repack-approval      authenticate — client approves or flags repacking
POST   /:id/warehouse-reply      authenticate — admin/staff adds reply to warehouse note
```

### Suppliers — `/suppliers`
```
GET    /                         authenticate — paginated (admin/staff only)
GET    /:id                      authenticate — single supplier (admin/staff only)
```

### Admin — `/admin`
```
GET    /stats                    authenticate — platform aggregate stats
GET    /clients                  authenticate — paginated client list
GET    /clients/:id              authenticate — single client detail
```

### Inquiries — `/inquiries`
```
POST   /                         authenticate — CLIENT creates inquiry
GET    /                         authenticate — paginated; CLIENT sees own
GET    /:id                      authenticate — single inquiry
```

### Sourcing Requests — `/requests`
```
POST   /                         authenticate — CLIENT creates request
GET    /                         authenticate — paginated
GET    /:id                      authenticate — single request with items, messages, payments
POST   /:id/quotation            authenticate — admin/staff submits quotation
POST   /:id/approve              authenticate — CLIENT approves all items
POST   /:id/reject               authenticate — admin/staff rejects request
POST   /:id/respond              authenticate — CLIENT responds to individual items
POST   /:id/respond-counter      authenticate — admin/staff counters client offer
POST   /:id/messages             authenticate — send a chat message
GET    /:id/messages             authenticate — fetch all messages
```

### Payments — `/payments`
```
POST   /                         authenticate — CLIENT submits order payment proof
GET    /order/:orderId           authenticate — list payments for an order
PATCH  /:id/verify               authenticate — admin/staff verifies or rejects payment
POST   /request                  authenticate — CLIENT submits request payment proof
GET    /request/:requestId       authenticate — list payments for a request
PATCH  /request/:id/verify       authenticate — admin/staff verifies request payment (triggers order creation)
```

### Notifications — `/notifications`
```
GET    /                         authenticate — virtual notifications derived from orders/inquiries/requests
PATCH  /read-all                 authenticate — mark all read
PATCH  /:id/read                 authenticate — mark single notification read
```

---

## 7. Middleware Layer

### `security.ts` — Helmet + HPP
```typescript
helmet({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc:   ["'self'", "'unsafe-inline'"],
    scriptSrc:  ["'self'"],
    imgSrc:     ["'self'", "data:", "https:"],
  },
  crossOriginEmbedderPolicy: false,  // disabled — API responses must be embeddable
})
hpp()                // HTTP Parameter Pollution protection
app.disable("x-powered-by")
```

### `rateLimiter.ts`
| Limiter | Window | Max | Scope |
|---|---|---|---|
| `generalLimiter` | 15 min | 500 req/IP | All routes |
| `authLimiter` | 15 min | 200 req/IP | Auth routes only; skips successful requests |
| `speedLimiter` | 15 min | delay after 50 hits | All routes; +100 ms per extra hit |
| `searchLimiter` | 1 min | 30 req/IP | Search-heavy endpoints |

### `sanitize.ts`
Recursively traverses `req.body` and `req.query`. Drops keys that:
- Start with `$` (MongoDB operator injection)
- Contain `.` (dot-path traversal)

String values are trimmed. Arrays are mapped. Base64 image fields are **not** truncated (only trimmed).

### `validate.ts`
- `validate(schema)` — Zod `safeParse` on `req.body`. Returns `422` with field-level errors on failure. Replaces `req.body` with coerced Zod output on success.
- `validateQueryParams` — Rejects `page` outside `[1, 10000]` or `limit` outside `[1, 100]`.

### `authenticate.ts`
1. Extracts `Bearer <token>` from `Authorization` header.
2. Verifies against `JWT_ACCESS_SECRET`.
3. For `CLIENT` role: hits DB to check `isEmailVerified` and `isApproved` on **every request**.
4. Sets `req.user = { userId, role }`.
5. Returns `401` on expired, invalid, or unverified tokens.

### `authorize.ts`
```typescript
authorize(["ADMIN", "STAFF"])  // usage pattern
```
Must be placed after `authenticate`. Returns `403` if `req.user.role` not in allowed list.

### `errorHandler.ts`
Global error handler (must be last middleware). Handles:
| Error type | Response |
|---|---|
| `ApiError` | `err.statusCode` + `err.message` (+ `err.errors[]` if present) |
| Prisma `P2002` | `409` — duplicate value |
| Prisma `P2025` | `404` — record not found |
| Prisma `P2003` | `400` — invalid foreign key |
| Any other Prisma `P*` | `500` — generic message |
| CORS error | `403` — "Origin not allowed" |
| Unknown | `500` — message hidden in production, exposed in dev |

Stack traces only included in `development` mode. Production logs structured JSON to stdout.

---

## 8. Authentication & Authorization

### Token Architecture
- **Access token:** JWT, 24 h TTL, signed with `JWT_ACCESS_SECRET`. Payload: `{ userId, role }`.
- **Refresh token:** JWT, 7 d TTL, signed with `JWT_REFRESH_SECRET`. Payload: `{ userId }`. Stored in `refresh_tokens` table for revocation.
- Tokens delivered in response body (not cookies by default).

### Login Flow
```
1. Find user by email
2. Check isActive + deletedAt (soft-delete guard)
3. bcrypt.compare(password, passwordHash)  → 401 on mismatch
4. For CLIENT: block if !isEmailVerified or !isApproved
5. Sign access + refresh tokens
6. Persist refresh token to DB (7 d expiry)
7. Return { user (no passwordHash), accessToken, refreshToken }
```

### Self-Registration Flow (CLIENT)
```
1. Check email uniqueness
2. bcrypt.hash(password, 10)
3. Create user (isEmailVerified=false, isApproved=false)
4. Create Client profile with company details
5. Generate UUID email verification token (24 h expiry, stored in email_verifications)
6. Send verification email (failure logged, never crashes)
7. Return 200 — user cannot login yet
```

### Email Verification Flow
```
GET /verify-email?token=<uuid>
1. Find token in email_verifications
2. Check not already used (usedAt)
3. Check not expired (expiresAt)
4. Mark token usedAt = now()
5. Mark user isEmailVerified=true, isApproved=true, emailVerifiedAt=now()
```

### Refresh Flow
```
POST /refresh  { refreshToken }
1. Find token in DB
2. Check not revoked (revokedAt)
3. Check not DB-expired (expiresAt)
4. jwt.verify() cryptographic check
5. Return new accessToken (refresh token unchanged)
```

### Logout
```
POST /logout  { refreshToken }
→ Sets revokedAt = now() on the DB record
```

### Role-Based Guards
| Route area | Roles allowed |
|---|---|
| Products, Categories | Public |
| Auth | Public (rate-limited) |
| Orders (read) | authenticate (CLIENT sees own, ADMIN/STAFF sees all) |
| Orders (write) | authenticate (status/stages: ADMIN/STAFF; delivery: CLIENT/ADMIN/STAFF) |
| Suppliers | authenticate, ADMIN/STAFF |
| Admin stats/clients | authenticate, ADMIN/STAFF |
| Inquiries (create) | authenticate, CLIENT |
| Requests (create/respond) | authenticate, CLIENT |
| Requests (quotation/reject) | authenticate, ADMIN/STAFF |
| Payments (submit) | authenticate, CLIENT |
| Payments (verify) | authenticate, ADMIN/STAFF |
| Warehouse photos/report | authenticate (warehouse role via staffRole field) |

---

## 9. Business Logic Flows

### Inquiry Flow
```
CLIENT submits inquiry (items: catalog or custom)
  → Staff notified by email (newInquiryEmail template)
  → Staff reviews → sends quotation (quotedPrice per item)
  → Client notified by email (quotationEmail template)
  → Client accepts/rejects individual items
    → PARTIALLY_ACCEPTED / ACCEPTED / REJECTED
  → On acceptance: manual conversion to Order by admin
```

### Sourcing Request Flow
```
CLIENT creates SourcingRequest with items (CATALOG or CUSTOM, with referenceImageUrls)
  → requestNumber generated: BK-REQ-YYYY-NNNN
  → status = SUBMITTED → REVIEWING
  → Staff sends quotation: quotedRMB per item
    → quotedINR = quotedRMB × 11.5  (hardcoded conversion rate)
    → request status → QUOTED
  → CLIENT responds to each item:
    → ACCEPTED: item accepted
    → REJECTED: item rejected
    → COUNTERED: client proposes counterPriceINR
  → Staff can respond-counter: new quotedINR per item
  → All items ACCEPTED → request status → ACCEPTED
  → CLIENT submits RequestPayment (advance/full)
  → Staff verifies payment
    → On VERIFIED: SourcingRequest → CONVERTED, Order auto-created
```

### Order Lifecycle
```
CONFIRMED → PAYMENT_PENDING → ADVANCE_PAID / FULLY_PAID
  → SOURCING → QC_PENDING → QC_PASSED / QC_FAILED
  → REPACKING → SHIPPED → DELIVERED
  (CANCELLED at any point)

completedStages[] tracks up to 11 named pipeline steps for the UI timeline.
```

### Warehouse Report Flow
```
Warehouse staff upserts WarehouseReport per order
  → Uploads repackPhotos (base64, max 30 images per order)
  → Sets finalWeightKg, finalVolumeCbm, repackNotes
  → Admin/staff can add adminReplies (JSON array)
  → isReadByAdmin / isReadByStaff flags for notifications
CLIENT reviews photos:
  → PATCH /:id/repack-approval { approved: true/false, concern?: string }
  → Sets clientApproved, clientConcern, clientReviewedAt
```

### Payment Flow
```
Order payment:
  CLIENT: POST /payments { orderId, type, amountINR, proofImageBase64 }
  → status = SUBMITTED
  Staff: PATCH /payments/:id/verify { action: "VERIFY" | "REJECT", rejectionReason? }
  → VERIFIED: order status transitions (ADVANCE_PAID / FULLY_PAID)
  → REJECTED: payment status = REJECTED, rejectionReason stored

Request payment:
  Same flow but PATCH /payments/request/:id/verify
  → On VERIFIED: SourcingRequest.status = CONVERTED, new Order created automatically
```

### CNY → INR Conversion
The RMB to INR conversion rate is **hardcoded at 11.5** in the requests service layer. This is applied when staff enters `quotedRMB` for request items: `quotedINR = quotedRMB * 11.5`.

> **Risk:** This rate is not configurable via env var or DB. A change requires a code deploy.

---

## 10. Utility & Helper Layer

### `ApiError` (`src/utils/ApiError.ts`)
Custom `Error` subclass with `statusCode` and optional `errors[]`.

```typescript
ApiError.notFound("Order not found")   // 404
ApiError.unauthorized("No token")      // 401
ApiError.forbidden("Admin only")       // 403
ApiError.badRequest("Invalid data")    // 400
new ApiError(409, "Duplicate", [...])  // custom
```
`Object.setPrototypeOf(this, new.target.prototype)` ensures `instanceof` works correctly after TypeScript compilation.

### `ApiResponse` (`src/utils/ApiResponse.ts`)
Standard envelope for all success responses:
```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
}
```

### `asyncHandler` (`src/utils/asyncHandler.ts`)
```typescript
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```
Wraps every async route handler. Prevents unhandled promise rejections from crashing the server.

### `pagination` (`src/utils/pagination.ts`)
```typescript
getPagination({ page, limit })   // → { page, limit, skip, take }
buildPaginationMeta(total, page, limit) // → PaginationMeta
```
- Default `limit`: 10
- Max `limit`: 100 (capped by `Math.min`)
- Max `page`: 10000 (validated in `validateQueryParams`)

### `generateRequestNumber` (`src/utils/generateRequestNumber.ts`)
Generates `BK-REQ-YYYY-NNNN` format IDs for `SourcingRequest`. Sequential within the year.

---

## 11. Email System

**Transport:** Gmail SMTP (`smtp.gmail.com:587`, STARTTLS)  
**From:** Configurable via `EMAIL_FROM` env var

### `sendEmail()`
Wraps `nodemailer.sendMail()`. Failure is logged and swallowed — email errors never crash a request.

### Templates

| Template | Trigger | Recipient |
|---|---|---|
| `verificationEmail.ts` | Client self-registration | Client |
| `newInquiryEmail.ts` | New inquiry submitted | Staff/Admin |
| `quotationEmail.ts` | Staff sends quotation | Client |
| Payment submitted (inline HTML) | Client submits payment proof | Staff/Admin |
| Payment verified (inline HTML) | Staff verifies payment | Client |
| Payment rejected (inline HTML) | Staff rejects payment | Client |
| Request payment submitted (inline HTML) | Client submits request payment | Staff/Admin |
| Request payment verified (inline HTML) | Staff verifies request payment | Client |

---

## 12. Security Hardening

| Layer | Mechanism | Notes |
|---|---|---|
| Transport | HTTPS | Enforced by hosting (not Express) |
| Headers | Helmet (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, etc.) | COEP disabled for embeddable responses |
| CORS | Strict origin whitelist | Credentials allowed |
| Auth | JWT HS256 | Separate access + refresh secrets |
| Password | bcrypt, cost factor 10 | Never returned in API responses |
| Token storage | Refresh tokens persisted in DB | Can be individually revoked on logout |
| Rate limiting | 3-tier (general / auth / search) + speed limiter | Standard headers returned |
| Input sanitization | Strip `$` keys + `.` keys | Prevents NoSQL operator injection |
| Body parsing | 50 MB JSON limit | Allows base64 photo uploads |
| Parameter pollution | HPP middleware | Last duplicate value wins |
| SQL injection | Prisma parameterized queries | No raw SQL in use |
| Error leakage | Stack traces only in `development` | Production returns generic messages |
| Sensitive fields | `passwordHash` stripped from all responses | `sanitizeUser()` in auth service |
| Soft deletes | `deletedAt` on users and products | Hard delete not used |
| DB errors | Prisma error codes mapped to safe HTTP responses | Raw DB messages never sent |

---

## 13. Health & Observability

### Health Endpoint
```
GET /api/v1/health
→ 200 { success: true, message: "Elios API is running", timestamp: "..." }
```
No auth required. Suitable for load balancer / uptime monitor probes.

### Logging
| Environment | Log format |
|---|---|
| `development` | `console.error("[ERROR] METHOD /path", err)` with full stack |
| `production` | Structured JSON to stdout: `{ level, method, path, message, code, timestamp }` |

> **Gap:** There is no request access log (no morgan or equivalent). All request traffic is invisible unless an error occurs.

### Pagination Metadata
All list endpoints return `pagination` envelope so clients can detect total record counts and page counts without extra requests.

### Rate Limit Headers
`RateLimit-*` standard headers returned (v7 spec). `X-RateLimit-*` legacy headers disabled.

---

## 14. Known Risks & Issues

| # | Risk | Severity | Detail |
|---|---|---|---|
| 1 | **Hardcoded CNY→INR rate** | Medium | `quotedINR = quotedRMB × 11.5` is hardcoded in the requests service. Rate changes require a code deploy. |
| 2 | **Base64 photo storage in DB** | Medium | `repackPhotos`, `proofImageBase64`, `referenceImageUrls` — all stored as base64 strings in Postgres. No size enforcement beyond the 50 MB body limit. Will degrade DB performance at scale. Should migrate to object storage (S3 / Supabase Storage). |
| 3 | **No access log** | Low | No request logger (morgan etc.) in the middleware stack. API traffic is invisible unless it errors. |
| 4 | **CLIENT auth check on every request** | Low-Medium | `authenticate` middleware issues a DB query (`prisma.user.findUnique`) on every authenticated CLIENT request to verify `isEmailVerified` + `isApproved`. This is safe but adds latency. Could be encoded into the JWT payload and re-verified only on token refresh. |
| 5 | **No Prisma connection pool tuning** | Low | Prisma client uses default connection pool settings. For Supabase, connection pooling (PgBouncer) is strongly recommended and should be set in `DATABASE_URL` (`?pgbouncer=true&connection_limit=1`). |
| 6 | **Email failures are silent** | Low | `sendEmail()` catches and logs errors but never notifies the caller. A failed verification email means the user receives no link and has no recourse except re-registering. |
| 7 | **No refresh token rotation** | Low | Refresh tokens are never rotated on use. If a refresh token is stolen, it remains valid until logout or 7 d expiry. Consider implementing rotation (issue new refresh token + revoke old on each use). |
| 8 | **`staffRole` is a freeform string** | Low | Warehouse, QC, and other staff roles are distinguished by comparing `req.user.staffRole` (a freeform string) rather than a typed enum. Typos in the DB can silently bypass role checks. |
| 9 | **No request ID / trace ID** | Low | Errors logged without a request correlation ID. Hard to trace a specific client error to a server log line in production. |
| 10 | **Photo cap enforcement is soft** | Low | The 30-photo cap on `repackPhotos` is enforced in application code, not at the DB layer. A direct DB write bypasses it. |

---

*End of report.*
