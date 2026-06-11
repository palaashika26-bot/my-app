# Request Submission Flow - Comprehensive Analysis

## Overview
The request submission system follows a multi-stage flow where clients create sourcing requests with product specifications and reference images, staff members provide quotations, and clients respond with approvals/counters. The system uses direct-to-storage image uploads via Supabase for efficiency.

---

## 1. REQUEST SUBMISSION PAGES/ROUTES

### Frontend Routes (Client-Side Pages)

#### A. **New Request Form** - Create from Scratch
- **File**: [src/app/client-dashboard/requests/new/page.tsx](src/app/client-dashboard/requests/new/page.tsx)
- **Purpose**: Multi-step form for creating custom sourcing requests
- **Features**:
  - Step 1: Add products (up to 5 items)
  - Step 2: Add budget, deadline, special requirements
  - Step 3: Review and submit
  - Reference image uploads (5 per product)
  - Budget min/max per unit
  - China delivery address field
  - Reference notes field
- **Key Validations**:
  - At least 1 product required
  - Image: JPG, PNG, WebP only
  - Max 10MB per image
  - Product name max 200 characters
  - Quantity: min 1, max 20 items
- **Error Handling**: Toast notifications for validation errors, upload failures

---

#### B. **Catalog Quote Form**
- **File**: [src/app/catalog/[id]/quote/page.tsx](src/app/catalog/[id]/quote/page.tsx)
- **Purpose**: Submit quotation request for a specific catalog product
- **Features**:
  - Quantity input (defaults to MOQ)
  - Budget input
  - Notes field
  - Converts catalog product to request
- **Submit Action**: Creates request with type `QUOTATION`

---

#### C. **Photo Request Form** (Experimental/Demo)
- **File**: [src/app/client-dashboard/requests/photo/page.tsx](src/app/client-dashboard/requests/photo/page.tsx)
- **Purpose**: Upload product photo with AI analysis (UI/UX feature, not fully integrated)
- **Features**:
  - File/camera upload
  - Mock analysis pipeline
  - Form pre-fill simulation
  - **Note**: Currently mock submission (no real API call)

---

#### D. **Catalog Product Request**
- **File**: [src/app/catalog/page.tsx](src/app/catalog/page.tsx) (lines ~373 & ~393)
- **Purpose**: Quick request submission from catalog browse
- **Features**:
  - Modal for product selection
  - Quick quote submission
  - Custom product request modal

---

#### E. **Request Detail View** (Client Dashboard)
- **File**: [src/app/client-dashboard/requests/[id]/page.tsx](src/app/client-dashboard/requests/[id]/page.tsx)
- **Purpose**: View submitted request and respond to quotations
- **Features**:
  - Display request items with reference images
  - Show quotations from staff
  - Accept/Reject/Counter response per item
  - Counter offer input (price + notes)
  - Submit responses (race timeout: 25s)
  - View logistics estimates
  - View payment status
  - Chat/messaging interface
- **Key States**: Request items, quotations, responses, logistics, payments

---

#### F. **Staff Request Detail** (Sourcing Dashboard)
- **File**: [src/app/staff/sourcing/requests/[id]/page.tsx](src/app/staff/sourcing/requests/[id]/page.tsx)
- **Purpose**: Staff view for managing submitted requests
- **Features**:
  - View request items and client details
  - Send quotations
  - Update logistics estimates
  - Approve/Reject requests
  - Respond to counter-offers
  - Messaging interface

---

### Backend Routes (Express API)

#### **POST /api/v1/requests** - Create Request
- **File**: [server/src/api/v1/requests/requests.controller.ts](server/src/api/v1/requests/requests.controller.ts#L6)
- **Auth**: `authenticate` + `authorize(["CLIENT", "ADMIN"])`
- **Validation**: `validate(createRequestSchemaV2)`
- **Handler**: `asyncHandler(createRequest)`
- **Response**: 201 Created with new request object
- **Payload**:
  ```typescript
  {
    notes?: string;
    referenceNote?: string;
    totalBudgetINR?: number;
    requestType?: 'SOURCING' | 'QUOTATION' | 'SAMPLE';
    items: {
      type: 'CATALOG' | 'CUSTOM';
      productId?: string; // required if CATALOG
      productName: string;
      productDescription?: string;
      quantity: number;
      unit: 'PCS' | 'KG' | 'BOX' | 'SET';
      targetPriceINR?: number;
      notes?: string;
      referenceImageUrls?: string[]; // storage paths
      referenceThumbUrls?: string[]; // thumbnail storage paths
    }[]
  }
  ```

---

#### **GET /api/v1/requests** - List Requests
- **Auth**: `authenticate` + `authorize(["CLIENT", "ADMIN", "STAFF"])`
- **Query Params**: `page`, `limit`, `status`
- **Response**: 200 OK with paginated requests array

---

#### **GET /api/v1/requests/:id** - Get Request Details
- **Auth**: `authenticate` + `authorize(["CLIENT", "ADMIN", "STAFF"])`
- **Response**: 200 OK with full request object (items, messages, payments)

---

#### **POST /api/v1/requests/:id/quotation** - Send Quotation (Staff)
- **Auth**: `authenticate` + `authorize(["ADMIN", "STAFF"])`
- **Validation**: `validate(sendQuotationSchema)`
- **Payload**:
  ```typescript
  {
    items: [{ id: string; quotedRMB: number }];
    staffNotes?: string;
    advanceAmountINR?: number;
  }
  ```

---

#### **POST /api/v1/requests/:id/respond** - Client Response to Quotation
- **Auth**: `authenticate` + `authorize(["CLIENT"])`
- **Validation**: `validate(respondToQuotationSchema)`
- **Payload**:
  ```typescript
  {
    items: {
      id: string;
      response: 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
      counterPriceINR?: number; // if COUNTERED
      counterNote?: string; // if COUNTERED
    }[]
  }
  ```

---

#### **PATCH /api/v1/requests/:id/logistics** - Update Logistics
- **Auth**: `authenticate` + `authorize(["ADMIN", "STAFF"])`
- **Validation**: `validate(logisticsSchema)`
- **Payload**:
  ```typescript
  {
    weight?: string | null;
    mode?: string | null;
    pricePerKg?: string | null;
    note?: string | null;
  }
  ```

---

#### **POST /api/v1/requests/:id/messages** - Send Message
- **Auth**: `authenticate`
- **Validation**: `validate(sendMessageSchema)`
- **Payload**: `{ text: string }`

---

#### **GET /api/v1/requests/:id/messages** - Get Messages
- **Auth**: `authenticate`
- **Query**: `since?: string` (ISO timestamp for delta sync)

---

## 2. IMAGE UPLOAD FUNCTIONALITY

### Two-Stage Image Upload Process

#### Stage 1: Request Signed Upload URLs
- **Endpoint**: `POST /api/v1/uploads/sign`
- **File**: [server/src/api/v1/uploads/uploads.controller.ts](server/src/api/v1/uploads/uploads.controller.ts)
- **Auth**: Required (`authenticate`)
- **Payload**:
  ```typescript
  {
    scope: 'request-item' | 'payment-proof' | 'dispute' | 'support' | 'catalog' | 'warehouse' | 'logistics-packing' | 'logistics-slip';
    contentTypes: string[]; // e.g., ['image/webp', 'image/webp'] for thumbnails
  }
  ```
- **Response**: 201 Created
  ```typescript
  {
    success: true;
    data: {
      bucket: string;
      uploads: [
        { path: string; token: string; signedUrl: string },
        // ... one per content type
      ]
    }
  }
  ```

---

#### Stage 2: Browser Direct Upload to Supabase Storage
- **File**: [src/lib/upload.ts](src/lib/upload.ts)
- **Flow**:
  1. Get signed URLs from `/api/v1/uploads/sign`
  2. Client compresses image to WebP (canvas re-encoding, max 1920px width)
  3. Client generates thumbnail (320x320px WebP)
  4. Client uploads both to Supabase Storage using `uploadToSignedUrl(path, token, blob)`
  5. Server returns storage paths (not URLs)
  6. Paths are persisted in database
  7. Backend converts paths to signed read URLs on GET requests
- **Image Compression**:
  - Input: Raw file (up to 10MB)
  - Processing: Re-encode to WebP, downscale to 1920px max width (quality 0.85)
  - Typical: 3-5MB JPEG → 300-600KB WebP
- **Thumbnail Creation**:
  - 320x320px WebP (quality 0.7)
  - Best-effort; falls back to full image if failed

---

### Upload Configuration
- **File**: [server/src/config/storage.ts](server/src/config/storage.ts)
- **Max batch per request**: 12 files
- **Max file size**: 10MB (raw bytes before compression)
- **Allowed MIME types**: image/jpeg, image/png, image/webp, image/gif (client enforced)
- **Storage provider**: Supabase Storage (S3-compatible)
- **Bucket naming**: Dynamically selected per scope

---

### Upload Scopes & Namespacing
- **Scope Prefixes** (in storage):
  - `request-item/`: Client request reference images
  - `payment-proof/`: Payment verification uploads
  - `dispute/`: Dispute evidence
  - `support/`: Support ticket attachments
  - `catalog/`: Product catalog images (admin)
  - `warehouse/`: Internal warehouse photos
  - `logistics-packing/`: Logistics documentation
  - `logistics-slip/`: Shipping slips

---

### Client-Side Upload Handler
- **File**: [src/lib/upload.ts](src/lib/upload.ts)
- **Key Functions**:
  - `uploadFile(file, scope)`: Compress, thumbnail, and upload one file
  - `uploadFiles(files, scope)`: Batch upload (async Promise.all)
  - `compressToWebP(file, maxDim, quality)`: Canvas re-encoding
  - `makeThumbnail(file, maxDim, quality)`: Generate small thumbnail
  - `putToSignedUrl(bucket, upload, body, contentType)`: Supabase storage upload
- **Error Handling**: Console logging with frontend host details for debugging

---

### Integration in Request Forms
- **In New Request Page** ([src/app/client-dashboard/requests/new/page.tsx](src/app/client-dashboard/requests/new/page.tsx#L45)):
  ```typescript
  const uploaded = await uploadFiles(toAdd, 'request-item');
  // Returns: { url: storage_path, thumbUrl?: thumb_path }[]
  // Stored in items[].refImages[]
  ```
- **Validation before upload**:
  - File type check (JPEG, PNG, WebP only)
  - Size check (10MB max)
  - Max 5 images per product
  - Max 5 products total

---

## 3. API CLIENT & REQUEST WRAPPER

### Request API Library
- **File**: [src/lib/api/requests.api.ts](src/lib/api/requests.api.ts)
- **Base HTTP Client**: Axios with 30s timeout (since images now uploaded directly to storage)
- **Methods**:
  ```typescript
  createRequest(data: CreateRequestPayload)
  getRequests(params?: { page?, limit?, status? }, signal?: AbortSignal)
  getRequestById(id: string, signal?: AbortSignal)
  sendQuotation(id: string, data: SendQuotationPayload)
  approveRequest(id: string)
  rejectRequest(id: string, reason?: string)
  respondToQuotation(id: string, items: RespondItemPayload[])
  respondToCounter(id: string, items: RespondToCounterItemPayload[])
  sendMessage(id: string, text: string)
  getMessages(id: string, since?: string)
  ```

---

## 4. ERROR HANDLING & LOGGING

### Backend Error Handler Middleware
- **File**: [server/src/middleware/errorHandler.ts](server/src/middleware/errorHandler.ts)
- **Location in Pipeline**: Final middleware (catches all thrown errors)
- **Error Types Handled**:

#### ApiError (Intentional Errors)
- **Class**: [server/src/utils/ApiError.ts](server/src/utils/ApiError.ts)
- **Properties**: `statusCode`, `message`, `errors`
- **Helper Methods**:
  - `ApiError.notFound(msg)` → 404
  - `ApiError.unauthorized(msg)` → 401
  - `ApiError.forbidden(msg)` → 403
  - `ApiError.badRequest(msg)` → 400
- **Response Format**:
  ```json
  {
    "success": false,
    "message": "Error message",
    "errors": [] // optional, if err.errors provided
  }
  ```

#### Prisma Errors (Database)
- **Mapping** (safe messages returned to client):
  - `P2002`: 409 "A record with this value already exists"
  - `P2025`: 404 "Record not found"
  - `P2003`: 400 "Invalid reference: related record not found"
- **Logging Strategy**:
  - **Dev**: Full stack trace to console
  - **Prod**: Structured JSON log (no DB details exposed)
    ```json
    {
      "level": "error",
      "method": "POST",
      "path": "/api/v1/requests",
      "message": "Error message",
      "code": "P2002",
      "timestamp": "2026-06-11T..."
    }
    ```

#### Unknown Errors
- **Response**: 500 Internal Server Error
- **Message**: Generic "An error occurred"

---

### Frontend Error Handling

#### Request Creation Errors ([src/app/client-dashboard/requests/new/page.tsx](src/app/client-dashboard/requests/new/page.tsx#L144))
```typescript
try {
  const response = await requestsApi.createRequest(payload);
  // Success handling
} catch {
  addToast({
    type: 'error',
    title: 'Failed to submit request',
    description: 'Please try again.'
  });
}
```

#### Image Upload Errors ([src/app/client-dashboard/requests/new/page.tsx](src/app/client-dashboard/requests/new/page.tsx#L42))
- File type validation
- Size validation (before upload)
- Network/storage errors caught with toast message
- Console logging for debugging

#### Response Submission with Timeout ([src/app/client-dashboard/requests/[id]/page.tsx](src/app/client-dashboard/requests/[id]/page.tsx#L349))
```typescript
await Promise.race([
  requestsApi.respondToQuotation(id, items),
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
]);
```
- 25s timeout to catch slow backend responses
- Prevents stuck UI during payment processing

---

### Request Service Error Checks
- **File**: [server/src/api/v1/requests/requests.service.ts](server/src/api/v1/requests/requests.service.ts)
- **Validation Points**:
  - Client profile exists: `throw new ApiError(403, "Client profile not found")`
  - Product validity (CATALOG type): `throw ApiError.badRequest("Product not found or no longer active")`
  - Request creation success: `throw new ApiError(500, "Failed to fetch created request")`

---

## 5. VALIDATION SCHEMAS

### Request Creation Schema
- **File**: [server/src/api/v1/requests/requests.schema.ts](server/src/api/v1/requests/requests.schema.ts)
- **Library**: Zod
- **Validations**:
  ```typescript
  - notes: max 1000 chars
  - totalBudgetINR: positive number
  - requestType: enum ['SOURCING', 'QUOTATION', 'SAMPLE']
  - items: 1-20 items
    - type: 'CATALOG' | 'CUSTOM'
    - productName: 1-200 chars (required)
    - productDescription: max 1000 chars
    - quantity: integer >= 1
    - unit: enum ['PCS', 'KG', 'BOX', 'SET']
    - targetPriceINR: positive
    - notes: max 500 chars
    - referenceImageUrls: base64 strings, max 5, max 7MB each
  - CATALOG items must have productId (UUID)
  ```

---

## 6. REQUEST LIFECYCLE STAGES

```
[1] CLIENT SUBMITS REQUEST (POST /api/v1/requests)
    ├─ Form validation (client)
    ├─ Image uploads to Supabase (client)
    ├─ Request creation (API)
    ├─ Notify ADMIN/STAFF (email)
    └─ Response: request object with ID & requestNumber

[2] STAFF REVIEWS & SENDS QUOTATION (POST /api/v1/requests/:id/quotation)
    ├─ Staff enters price per item (RMB)
    ├─ Optional: logistics estimate (weight, mode, price/kg)
    ├─ Update request status: QUOTED
    └─ Notify CLIENT (email)

[3] CLIENT RESPONDS TO QUOTATION (POST /api/v1/requests/:id/respond)
    ├─ Per-item decision: ACCEPT | REJECT | COUNTER
    ├─ If COUNTER: provide price + notes
    ├─ Submit all responses at once (25s timeout)
    ├─ Update status: PARTIALLY_ACCEPTED | ACCEPTED | REJECTED
    └─ Notify ADMIN/STAFF

[4] COUNTER-RESPONSE (POST /api/v1/requests/:id/respond-counter)
    ├─ ADMIN/STAFF responds to client counter-offers
    └─ Negotiation cycle repeats

[5] APPROVAL & PAYMENT (POST /api/v1/requests/:id/approve)
    ├─ CLIENT confirms final decision
    ├─ Request status: CONVERTED (becomes order)
    ├─ Payment initiation
    └─ Auto-order creation

[6] MESSAGING (POST|GET /api/v1/requests/:id/messages)
    ├─ Real-time chat during negotiation
    └─ Thread per request
```

---

## 7. DATABASE INTEGRATION

### Request Model (Prisma)
- **Primary Entity**: `SourcingRequest`
- **Key Fields**:
  - `id`: UUID (primary key)
  - `requestNumber`: Human-readable (auto-generated)
  - `status`: enum (DRAFT, SUBMITTED, QUOTED, REVIEWING, ACCEPTED, PARTIALLY_ACCEPTED, REJECTED, CONVERTED, CANCELLED)
  - `clientId`: FK to Client
  - `notes`, `referenceNote`: text fields
  - `totalBudgetINR`: Decimal
  - `requestType`: enum (SOURCING, QUOTATION, SAMPLE)

### Request Items
- **Entity**: `RequestLineItem`
- **Fields**:
  - `id`, `requestId`: FK to SourcingRequest
  - `type`: enum (CATALOG, CUSTOM)
  - `productId`: FK to Product (if CATALOG)
  - `productName`, `productDescription`
  - `quantity`, `unit`
  - `targetPriceINR`: client budget
  - `notes`
  - `referenceImageUrls`, `referenceThumbUrls`: JSON array of storage paths

### Image Storage Path Format
- **Pattern**: `{scope}/{ownerId}/{uuid}/{filename.ext}`
- **Example**: `request-item/client-123/a1b2c3d4-e5f6.webp`
- **Storage**: Supabase Bucket (S3-compatible)

---

## 8. NOTIFICATIONS & MESSAGING

### Email Notifications
- **File**: [server/src/api/v1/requests/requests.service.ts](server/src/api/v1/requests/requests.service.ts#L84)
- **On Request Creation**:
  - Recipient: All ADMIN + STAFF (isActive=true)
  - Template: Request summary with dashboard link
  - Trigger: Fire-and-forget (catch errors silently)
- **Notifications Sent**:
  - To staff when CLIENT submits request
  - To client when STAFF sends quotation
  - To staff when CLIENT responds/counters

### In-App Messaging
- **Endpoint**: `POST /api/v1/requests/:id/messages`
- **Features**:
  - Thread per request
  - Accessible to client + all staff
  - Query: `GET /api/v1/requests/:id/messages?since=ISO_TIMESTAMP` (delta sync)

---

## 9. SECURITY & VALIDATION

### Authentication
- **Middleware**: `authenticate` (validates JWT token)
- **Extraction**: `req.user?.userId`, `req.user?.clientId`, `req.user?.role`

### Authorization
- **Middleware**: `authorize(roles: string[])`
- **Enforcement**:
  - **Create request**: CLIENT, ADMIN only
  - **Send quotation**: ADMIN, STAFF only
  - **Respond to quotation**: CLIENT only
  - **Send counter-response**: ADMIN, STAFF only
  - **Get request**: CLIENT (own) | ADMIN/STAFF (any)

### Input Sanitization
- **Middleware**: `sanitizeInput` (XSS prevention)
- **Validation**: Zod schemas (type + constraint validation)

### Rate Limiting
- **General**: `generalLimiter` (global rate limit)
- **Aggressive**: `speedLimiter` (for login/signup endpoints)

### CORS Policy
- **Allowed Origins**:
  - Static: FRONTEND_URL, CLIENT_URL, localhost:3000-5173
  - Pattern: Vercel preview deployments (hash-based)
  - Custom: CORS_ORIGINS env var (comma-separated)
- **Methods**: GET, POST, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

---

## 10. ASYNC & ERROR RECOVERY

### Async Handler Wrapper
- **File**: [server/src/utils/asyncHandler.ts](server/src/utils/asyncHandler.ts)
- **Purpose**: Wraps route handlers to catch Promise rejections
- **Usage**: All routes wrapped (`asyncHandler(handlerFn)`)

### Client-Side Race Conditions
- **Request submission**: 120s timeout for slow backends (images uploaded separately)
- **Response submission**: 25s timeout to catch stuck POST requests
- **Cache layer**: `requestsCache` stores request objects to avoid refetch on success

### Retry Strategy
- **Images**: Browser retry on network error (user can manually retry)
- **API calls**: Client decides retry strategy (toast + manual retry button)

---

## 11. FILE SUMMARY TABLE

| File | Purpose | Type |
|------|---------|------|
| [src/app/client-dashboard/requests/new/page.tsx](src/app/client-dashboard/requests/new/page.tsx) | Multi-step request form | Frontend Page |
| [src/app/catalog/[id]/quote/page.tsx](src/app/catalog/[id]/quote/page.tsx) | Catalog product quote form | Frontend Page |
| [src/app/client-dashboard/requests/[id]/page.tsx](src/app/client-dashboard/requests/[id]/page.tsx) | Request detail + response form | Frontend Page |
| [src/app/staff/sourcing/requests/[id]/page.tsx](src/app/staff/sourcing/requests/[id]/page.tsx) | Staff request management | Frontend Page |
| [src/lib/upload.ts](src/lib/upload.ts) | Image compression & upload | Frontend Util |
| [src/lib/api/requests.api.ts](src/lib/api/requests.api.ts) | Request API client wrapper | Frontend API |
| [server/src/api/v1/requests/requests.controller.ts](server/src/api/v1/requests/requests.controller.ts) | Request route handlers | Backend Controller |
| [server/src/api/v1/requests/requests.service.ts](server/src/api/v1/requests/requests.service.ts) | Request business logic | Backend Service |
| [server/src/api/v1/requests/requests.repository.ts](server/src/api/v1/requests/requests.repository.ts) | Request data access | Backend Repository |
| [server/src/api/v1/requests/requests.schema.ts](server/src/api/v1/requests/requests.schema.ts) | Request validation (Zod) | Backend Schema |
| [server/src/api/v1/requests/requests.routes.ts](server/src/api/v1/requests/requests.routes.ts) | Request route definitions | Backend Routes |
| [server/src/api/v1/uploads/uploads.controller.ts](server/src/api/v1/uploads/uploads.controller.ts) | Upload signing endpoint | Backend Controller |
| [server/src/config/storage.ts](server/src/config/storage.ts) | Supabase storage config | Backend Config |
| [server/src/middleware/errorHandler.ts](server/src/middleware/errorHandler.ts) | Global error handler | Backend Middleware |
| [server/src/utils/ApiError.ts](server/src/utils/ApiError.ts) | Custom error class | Backend Util |
| [server/src/utils/ApiResponse.ts](server/src/utils/ApiResponse.ts) | Standardized API responses | Backend Util |
| [server/src/utils/asyncHandler.ts](server/src/utils/asyncHandler.ts) | Async error wrapper | Backend Util |

---

## 12. KEY INTEGRATION POINTS

### Frontend → Backend Data Flow
1. **User fills form** → validation (client)
2. **Upload images** → POST `/api/v1/uploads/sign` → Supabase Storage
3. **Submit request** → POST `/api/v1/requests` with storage paths
4. **Backend validates** → Zod schema + service checks
5. **Database persisted** → SourcingRequest + RequestLineItem records
6. **Notifications sent** → Email to admin/staff
7. **Response cached** → `requestsCache` + local state

### Error Flow
1. **Client validation fails** → Toast immediately
2. **API error (4xx/5xx)** → Caught in axios interceptor → Toast with message
3. **Backend throws ApiError** → errorHandler catches → Structured response
4. **Network timeout** → Race condition timeout → User sees "failed" state

---

## 13. CONFIGURATION & ENVIRONMENT

### Required Environment Variables
- **Frontend**: `NEXT_PUBLIC_SUPABASE_URL` (for signed uploads)
- **Backend**: `SUPABASE_URL`, `SUPABASE_KEY`, `EXPRESS_BASE`
- **Email**: SMTP config for notifications
- **CORS**: `FRONTEND_URL`, `CLIENT_URL`, `CORS_ORIGINS`

---

## 14. PERFORMANCE NOTES

- **Image uploads**: Direct to Supabase (bypasses API server)
- **Compression**: WebP re-encoding on client (300-600KB from 3-5MB JPEG)
- **Timeouts**:
  - Request creation: 120s (slow backend tolerance)
  - Response submission: 25s (payment processing)
  - Standard API: 30s (axios default)
- **Caching**: `requestsCache` reduces refetch after creation
- **Delta sync**: Messages endpoint supports `since` query for incremental loads
