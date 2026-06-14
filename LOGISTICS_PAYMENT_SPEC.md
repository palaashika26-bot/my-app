# Implementation Spec — Logistics Accept/Reject → Pay (#4) & Payment Status Sync (#5)

> **Status:** Deferred to a database-enabled environment. These changes require a
> Prisma schema migration and touch live payment logic; they must be applied and
> **verified on staging before production**. This spec is code-complete enough to
> implement and review without re-deriving the data model.

---

## Background (verified in code)

- **Logistics** (`server/src/api/v1/logistics/*`, `LogisticsRequest` model) is a
  quote + chat flow only. Status enum: `PENDING → QUOTED → CONFIRMED → IN_TRANSIT → COMPLETED`.
  There is **no client accept/reject and no payment**. `updateQuote` sets the price;
  `updateStatus` is staff-only and free-form.
- **Sourcing payment** (`payments.service.ts`): `submitRequestPayment` creates a
  `RequestPayment` (status `SUBMITTED`) but **does not change `SourcingRequest.status`**.
  `verifyRequestPayment` (staff) marks the payment `VERIFIED` then calls
  `requestsRepository.approveRequest()` which creates the Order. So between *submit*
  and *verify*, list views that read only `request.status` show no payment state.
- **Order payment** (`submitPayment`): sets `order.status = PAYMENT_PENDING`, then
  verify sets `ADVANCE_PAID`/`FULLY_PAID`. This path already propagates to the order.

---

## #4 — Logistics accept/reject → payment gating

### 4.1 Prisma schema (`server/prisma/schema.prisma`)

Add to `model LogisticsRequest`:

```prisma
  clientDecision   LogisticsDecision?          // null until the client decides
  decisionAt       DateTime?
  paymentStatus    LogisticsPaymentStatus @default(UNPAID)
  paymentAmountINR Decimal?               @db.Decimal(12, 2)
  paymentProofUrl  String?
  paymentProofThumbUrl String?
  paidAt           DateTime?
```

Add enums:

```prisma
enum LogisticsDecision {
  ACCEPTED
  REJECTED
}

enum LogisticsPaymentStatus {
  UNPAID
  SUBMITTED
  VERIFIED
  REJECTED
}
```

### 4.2 Migration

```bash
cd server
npx prisma migrate dev --name logistics_decision_payment
npx prisma generate
```

Equivalent SQL (for review / manual apply):

```sql
CREATE TYPE "LogisticsDecision" AS ENUM ('ACCEPTED', 'REJECTED');
CREATE TYPE "LogisticsPaymentStatus" AS ENUM ('UNPAID', 'SUBMITTED', 'VERIFIED', 'REJECTED');

ALTER TABLE "logistics_requests"
  ADD COLUMN "clientDecision"       "LogisticsDecision",
  ADD COLUMN "decisionAt"           TIMESTAMP(3),
  ADD COLUMN "paymentStatus"        "LogisticsPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paymentAmountINR"     DECIMAL(12,2),
  ADD COLUMN "paymentProofUrl"      TEXT,
  ADD COLUMN "paymentProofThumbUrl" TEXT,
  ADD COLUMN "paidAt"               TIMESTAMP(3);
```

### 4.3 State machine (enforce in the service, not the controller)

```
PENDING ──(staff quote)──▶ QUOTED
QUOTED  ──(client ACCEPT)──▶ QUOTED + clientDecision=ACCEPTED      // payment now allowed
QUOTED  ──(client REJECT)──▶ clientDecision=REJECTED (terminal)
clientDecision=ACCEPTED ──(client submit payment)──▶ paymentStatus=SUBMITTED
paymentStatus=SUBMITTED ──(staff verify)──▶ paymentStatus=VERIFIED, status=CONFIRMED, paidAt=now
                        ──(staff reject)──▶ paymentStatus=REJECTED (client may resubmit)
CONFIRMED ──(staff)──▶ IN_TRANSIT ──▶ COMPLETED   // unchanged
```

Gating rules:
- `decide()` only allowed when `status === 'QUOTED'` and `clientDecision == null`.
- `submitLogisticsPayment()` only allowed when `clientDecision === 'ACCEPTED'` and
  `paymentStatus ∈ {UNPAID, REJECTED}` — mirror `submitRequestPayment`'s guard
  (`payments.service.ts:175`).
- `verifyLogisticsPayment()` only when `paymentStatus === 'SUBMITTED'`.

### 4.4 Backend service (`logistics.service.ts`)

Add three methods (mirroring the notify + ownership patterns already in the file):

```ts
async decide(id, userId, role, clientId, decision: 'ACCEPTED' | 'REJECTED') {
  const req = await logisticsRepository.findById(id);
  if (!req) throw ApiError.notFound("Logistics request not found");
  if (req.clientId !== clientId) throw ApiError.forbidden(...);     // client-only
  if (req.status !== 'QUOTED' || req.clientDecision)
    throw ApiError.badRequest("This quote can no longer be accepted or rejected");
  const updated = await logisticsRepository.setDecision(id, decision);
  await notifyAdminsAndStaff({ type:'logistics', title:`Logistics quote ${decision} — ${req.requestNumber}`, ... });
  return baseFields(updated);
}

async submitPayment(id, userId, clientId, data) {     // data: amountINR, proofUrl, proofThumbUrl
  const req = await logisticsRepository.findById(id);
  if (!req || req.clientId !== clientId) throw ApiError.forbidden(...);
  if (req.clientDecision !== 'ACCEPTED')
    throw ApiError.badRequest("Accept the quote before paying");
  if (!['UNPAID','REJECTED'].includes(req.paymentStatus))
    throw ApiError.badRequest("Payment already submitted");
  const updated = await logisticsRepository.setPayment(id, { paymentStatus:'SUBMITTED', ...data });
  await notifyAdminsAndStaff({ ... 'Logistics payment proof submitted' });
  return baseFields(updated);
}

async verifyPayment(id, role, action: 'VERIFY'|'REJECT', reason?) {
  if (!isStaff(role)) throw ApiError.forbidden("Only staff can verify");
  const req = await logisticsRepository.findById(id);
  if (!req || req.paymentStatus !== 'SUBMITTED') throw ApiError.badRequest(...);
  if (action === 'VERIFY') {
    const updated = await logisticsRepository.setPayment(id, { paymentStatus:'VERIFIED', paidAt:new Date(), status:'CONFIRMED' });
    if (req.client?.user?.id) await notifyUser(req.client.user.id, { ... 'Logistics payment confirmed' });
    return baseFields(updated);
  }
  // REJECT
  const updated = await logisticsRepository.setPayment(id, { paymentStatus:'REJECTED' });
  if (req.client?.user?.id) await notifyUser(req.client.user.id, { ... reason });
  return baseFields(updated);
}
```

Extend `baseFields()` to also serialise `clientDecision`, `paymentStatus`,
`paymentAmountINR`, `paidAt`, and sign `paymentProofUrl`/`paymentProofThumbUrl`
via `signImageFields` (see `payments.service.ts:155`).

### 4.5 Repository (`logistics.repository.ts`)

```ts
setDecision: (id, decision) => prisma.logisticsRequest.update({ where:{id}, data:{ clientDecision: decision, decisionAt: new Date() }, include: ... }),
setPayment:  (id, data)     => prisma.logisticsRequest.update({ where:{id}, data, include: ... }),
```

### 4.6 Controller + routes

`logistics.controller.ts`: add `decide`, `submitPayment`, `verifyPayment` thin handlers.
`logistics.routes.ts`:

```ts
router.patch("/:id/decision",        authenticate, asyncHandler(decide));         // CLIENT
router.post ("/:id/payment",         authenticate, asyncHandler(submitPayment));  // CLIENT
router.patch("/:id/payment/verify",  authenticate, requireRole(["ADMIN","STAFF"]), asyncHandler(verifyPayment));
```

Validate request bodies with a zod schema (`logistics.schema.ts`): `decision ∈ {ACCEPTED,REJECTED}`;
payment `{ amountINR:number, proofUrl:string, proofThumbUrl?:string }`.

### 4.7 Frontend — client logistics detail (`src/app/client-dashboard/logistics/[id]/page.tsx`)

The screen already shows the quote block (`req.quotePricePerKg`). Add:

- When `status === 'QUOTED' && !clientDecision`: render **Accept Quote** / **Reject** buttons
  → `logisticsApi.decide(id, 'ACCEPTED'|'REJECTED')`, then `load()`.
- When `clientDecision === 'ACCEPTED' && paymentStatus ∈ {UNPAID,REJECTED}`: render a **Pay Now**
  action. **Reuse the existing payment proof upload** — the same Supabase signed-URL flow used
  by `src/app/payment/[requestId]/page.tsx` (`uploadFile(file,'payment-proof')` from
  `src/lib/upload.ts`) — then `logisticsApi.submitPayment(id, { amountINR, proofUrl, proofThumbUrl })`.
- When `paymentStatus === 'SUBMITTED'`: show "Payment under review".
- When `paymentStatus === 'VERIFIED'` / `status === 'CONFIRMED'`: show "Confirmed".

Add the methods to `src/lib/api/logistics.api.ts`:

```ts
decide: (id, decision) => axiosClient.patch(`/logistics/${id}/decision`, { decision }),
submitPayment: (id, data) => axiosClient.post(`/logistics/${id}/payment`, data),
verifyPayment: (id, action, reason?) => axiosClient.patch(`/logistics/${id}/payment/verify`, { action, reason }),
```

### 4.8 Frontend — admin logistics detail (`src/app/admin/logistics/[id]/page.tsx`)

When `paymentStatus === 'SUBMITTED'`: show the submitted proof + **Verify** / **Reject** buttons
→ `logisticsApi.verifyPayment(id, 'VERIFY'|'REJECT', reason)`, then reload. Surface
`clientDecision` and `paymentStatus` badges in the header (extend `statusStyle`/`statusLabel`).

---

## #5 — Payment status sync across logistics / request / order

Two layers: (a) make the backend the single source of truth, (b) make views refetch.

### 5.1 Backend propagation (single source of truth)

- **Logistics** (after #4): `verifyPayment` already sets `paymentStatus=VERIFIED` +
  `status=CONFIRMED`. If a logistics request references an order (`orderRef`), optionally
  stamp a note/notification on that order so the order view reflects "logistics paid".
- **Sourcing request payment** (`payments.service.ts`):
  - In `submitRequestPayment`, after creating the payment, set a lightweight, reversible
    marker so **list** views can show "Payment Submitted" without a new column — either:
    (i) add `SourcingRequestStatus` value `PAYMENT_SUBMITTED` (migration), **or**
    (ii) (no migration) have list views derive payment state from the latest
    `RequestPayment.status` (preferred — see 5.2). Recommended: **(ii)**, to avoid a migration.
  - `verifyRequestPayment` already converts to an order via `approveRequest`. Confirm
    `approveRequest` sets `request.status = CONVERTED` (it creates the order) so the request
    list shows the converted state. (Verify on staging.)

### 5.2 Frontend propagation (no schema change — recommended)

The data already exists; the gap is that **list** views read only `request.status`/`order.status`
and don't refetch after a payment elsewhere.

- **Admin requests list** (`src/app/admin/requests/page.tsx`) and **all-orders**
  (already refetches on tab focus — `all-orders/page.tsx:104`): add the same
  `visibilitychange`/focus refetch to the requests list, the admin logistics list, and the
  client dashboard so a payment made in one tab is reflected when returning to another.
- **Client dashboard** (`useDashboardData.ts`) and request/order detail: after a successful
  payment submit, clear the relevant cache entry (`requestsCache`/`paymentStore`) and refetch,
  so the client immediately sees "Payment submitted / under review".
- **Surface payment state in lists:** where a request is `ACCEPTED`/`PARTIALLY_ACCEPTED`,
  fetch its latest `RequestPayment` (or include payment summary in the list API) and show a
  "Payment Submitted" / "Verified" chip. Cheapest: extend the requests list API to include
  `latestPaymentStatus` (a computed field, no new column).

### 5.3 Verification (staging)

1. Client accepts a logistics quote → admin sees `ACCEPTED`; client cannot pay before accepting.
2. Client pays (logistics) → admin logistics shows `SUBMITTED` + proof; verify → `CONFIRMED`,
   client sees confirmed, and the order view (if `orderRef`) reflects it.
3. Sourcing: client submits request payment → admin requests **list** + detail show
   "Payment Submitted" (not just on the detail page); verify → order created, request shows
   `CONVERTED` everywhere after refetch.
4. Open two tabs (admin list + detail); act in one, return to the other → state refreshes on focus.

---

## Risk notes
- Migration is additive (new nullable columns + enums) — safe to apply, but deploy
  `server/` and frontend together so the new fields are read/written consistently.
- Payment verification is irreversible-ish (creates orders / confirms shipments) — test the
  reject/resubmit path and the "cannot pay before accept" guard explicitly on staging.
- Keep proof uploads on the existing Supabase signed-URL path (`uploadFile`,
  `src/lib/upload.ts`) — do **not** store full base64 proofs in the DB.
