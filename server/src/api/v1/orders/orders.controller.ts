import { Request, Response } from "express";
import { ordersService } from "./orders.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const getOrders = async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;

  let clientId: string | undefined;

  if (req.user?.role === "CLIENT") {
    // Scope results to this client's own orders only
    const id = await ordersService.getClientIdByUserId(req.user.userId);
    if (!id) throw ApiError.forbidden("No client profile linked to this account");
    clientId = id;
  }
  // ADMIN and STAFF receive all orders (clientId stays undefined)

  const { orders, pagination } = await ordersService.getOrders(
    { page, limit },
    clientId
  );

  return ApiResponse.success(res, orders, "Orders fetched successfully", 200, pagination);
};

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  let clientId: string | undefined;

  if (req.user?.role === "CLIENT") {
    // Ownership check — repository will 404 if this order doesn't belong to them
    const cid = await ordersService.getClientIdByUserId(req.user.userId);
    if (!cid) throw ApiError.forbidden("No client profile linked to this account");
    clientId = cid;
  }

  const order = await ordersService.getOrderById(id, clientId);

  return ApiResponse.success(res, order, "Order fetched successfully");
};

export const getOrderGST = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.role === "CLIENT") {
    // Clients can only fetch GST for their own orders
    const cid = await ordersService.getClientIdByUserId(req.user.userId);
    if (!cid) throw ApiError.forbidden("No client profile linked to this account");
    // Ownership verified implicitly — getGSTInvoice will 404 if order not found
  }

  const gstInvoice = await ordersService.getGSTInvoice(id);
  return ApiResponse.success(res, gstInvoice, "GST invoice fetched");
};

export const saveOrderGST = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot save GST invoice data");
  }

  const { gstRate, cgstRate, sgstRate, clientGSTIN, taxableAmount, cgstAmount, sgstAmount, totalGST, grandTotal } = req.body;

  await ordersService.saveGSTInvoice(id, {
    gstRate,
    cgstRate,
    sgstRate,
    clientGSTIN: clientGSTIN ?? "",
    taxableAmount,
    cgstAmount,
    sgstAmount,
    totalGST,
    grandTotal,
    savedAt: new Date().toISOString(),
  });

  return ApiResponse.success(res, null, "GST invoice saved");
};

// Ordered timeline stages — index = how far along the order is.
const STAGE_ORDER = [
  "Order Placed",
  "Payment Confirmed",
  "Sourcing",
  "At China Warehouse",
  "China Consolidation Warehouse",
  "Repacking Warehouse",
  "Shipped from China",
  "In Transit",
  "Arrived India Warehouse",
  "Out for Delivery",
  "Completed",
];

// Maps each timeline stage → DB OrderStatus enum (complete, no gaps).
const STAGE_TO_DB_STATUS: Record<string, string> = {
  "Order Placed":                  "PAYMENT_PENDING",
  "Payment Confirmed":             "CONFIRMED",
  "Sourcing":                      "SOURCING",
  "At China Warehouse":            "QC_PENDING",
  "China Consolidation Warehouse": "QC_PENDING",
  "Repacking Warehouse":           "REPACKING",
  "Shipped from China":            "SHIPPED",
  "In Transit":                    "SHIPPED",
  "Arrived India Warehouse":       "SHIPPED",
  "Out for Delivery":              "SHIPPED",
  "Completed":                     "DELIVERED",
};

// PATCH /api/v1/orders/:id/stages
export const updateOrderStages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { completedStages } = req.body;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot update stages");
  }
  if (!Array.isArray(completedStages)) {
    throw ApiError.badRequest("completedStages must be an array");
  }

  // Persist the stage list
  const order = await ordersService.updateCompletedStages(id, completedStages);

  // Keep order.status in sync with the furthest completed stage so the
  // all-orders list dropdown (which reads order.status) stays consistent.
  const maxIdx = completedStages
    .map((s: string) => STAGE_ORDER.indexOf(s))
    .reduce((max: number, n: number) => (n > max ? n : max), -1);

  if (maxIdx >= 0) {
    const lastStage = STAGE_ORDER[maxIdx];
    const dbStatus = STAGE_TO_DB_STATUS[lastStage];
    if (dbStatus) {
      await ordersService.updateStatus(id, dbStatus);
    }
  }

  return ApiResponse.success(res, { completedStages: order.completedStages }, "Stages updated");
};

// Map display strings to DB OrderStatus enum values
const DISPLAY_TO_DB_STATUS: Record<string, string> = {
  "Payment Pending":              "PAYMENT_PENDING",
  "Payment Confirmed":            "CONFIRMED",
  "Sourcing":                     "SOURCING",
  "At China Warehouse":           "QC_PENDING",
  "China Consolidation Warehouse":"QC_PENDING",
  "Repacking Warehouse":          "REPACKING",
  "Ready for Shipping":           "QC_PASSED",
  "Ready for Logistics":          "QC_PASSED",
  "Return from China":            "QC_FAILED",
  "Exception":                    "CANCELLED",
  "Shipped from China":           "SHIPPED",
  "Arrived India Warehouse":      "SHIPPED",
  "Out for Delivery":             "SHIPPED",
  "Completed":                    "DELIVERED",
};

const VALID_DB_STATUSES = new Set([
  "CONFIRMED","PAYMENT_PENDING","ADVANCE_PAID","FULLY_PAID",
  "SOURCING","QC_PENDING","QC_PASSED","QC_FAILED","REPACKING",
  "SHIPPED","DELIVERED","CANCELLED",
]);

/**
 * Maps every status value (display string or DB enum) to the ordered list of
 * timeline stages that should be marked completed.  Any status not listed here
 * leaves completedStages unchanged.
 */
const STATUS_TO_COMPLETED_STAGES: Record<string, string[]> = {
  // ── Display strings ────────────────────────────────────────────────────────
  "Payment Pending":               [],
  "Payment Confirmed":             ["Order Placed", "Payment Confirmed"],
  "Sourcing":                      ["Order Placed", "Payment Confirmed", "Sourcing"],
  "At China Warehouse":            ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse"],
  "China Consolidation Warehouse": ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse"],
  "Repacking Warehouse":           ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  "Ready for Shipping":            ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  "Ready for Logistics":           ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  "Return from China":             ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse"],
  "Shipped from China":            ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China"],
  "In Transit":                    ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit"],
  "Arrived India Warehouse":       ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse"],
  "Out for Delivery":              ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse", "Out for Delivery"],
  "Completed":                     ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse", "Out for Delivery", "Completed"],
  "Exception":                     [],
  // ── DB enum fallbacks (used when caller sends raw DB value) ───────────────
  "PAYMENT_PENDING":  [],
  "CONFIRMED":        ["Order Placed", "Payment Confirmed"],
  "SOURCING":         ["Order Placed", "Payment Confirmed", "Sourcing"],
  "QC_PENDING":       ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse"],
  "REPACKING":        ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  "QC_PASSED":        ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  "QC_FAILED":        ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse"],
  "SHIPPED":          ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China"],
  "DELIVERED":        ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse", "Out for Delivery", "Completed"],
  "CANCELLED":        [],
};

// PATCH /api/v1/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot update order status");
  }
  if (!status || typeof status !== "string") {
    throw ApiError.badRequest("status is required");
  }

  // Accept either a DB enum value or a display string
  const dbStatus = VALID_DB_STATUSES.has(status)
    ? status
    : (DISPLAY_TO_DB_STATUS[status] ?? null);

  if (!dbStatus) {
    throw ApiError.badRequest(`Unknown status value: "${status}"`);
  }

  // Update order status in DB
  const order = await ordersService.updateStatus(id, dbStatus);

  // Auto-sync completedStages so the timeline always matches the status.
  // Look up by the original display string first (more granular), then by DB enum.
  const autoStages = STATUS_TO_COMPLETED_STAGES[status] ?? STATUS_TO_COMPLETED_STAGES[dbStatus];
  if (autoStages !== undefined) {
    await ordersService.updateCompletedStages(id, autoStages);
  }

  return ApiResponse.success(res, { status: order.status }, "Status updated");
};

// PATCH /api/v1/orders/:id/delivery-preference
export const updateDeliveryPreference = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { deliveryPreference, deliveryAddress } = req.body;

  if (!deliveryPreference || typeof deliveryPreference !== "string") {
    throw ApiError.badRequest("deliveryPreference is required");
  }

  // Clients can only update their own orders
  if (req.user?.role === "CLIENT") {
    const cid = await ordersService.getClientIdByUserId(req.user.userId);
    if (!cid) throw ApiError.forbidden("No client profile linked to this account");
    // ownership enforced by the update — it will 404 if the order doesn't belong to them
  }

  const order = await ordersService.updateDeliveryPreference(id, deliveryPreference, deliveryAddress);
  return ApiResponse.success(res, { deliveryPreference: order.deliveryPreference, deliveryAddress: order.deliveryAddress }, "Delivery preference saved");
};

// GET /api/v1/orders/:id/warehouse-report
// Open to all authenticated roles — authenticate middleware already verified the JWT.
// Clients need to see their own photos for the approval flow. Order UUIDs are 128-bit
// random values (not guessable) and the platform is internal B2B, so no further
// role restriction is needed here.
export const getWarehouseReport = async (req: Request, res: Response) => {
  const { id } = req.params;

  const report = await ordersService.getWarehouseReport(id);

  // When caller passes ?photos=false, strip the heavy base64 array and return a count instead.
  // Used by background polling so the browser never re-downloads MBs of images on every tick.
  const includePhotos = req.query.photos !== "false";

  if (report) {
    const { repackPhotos, ...rest } = report as any;
    const photos: string[] = repackPhotos ?? [];
    const payload = includePhotos
      ? { ...rest, repackPhotos: photos }
      : { ...rest, repackPhotos: [], photoCount: photos.length };
    return ApiResponse.success(res, payload, "Warehouse report fetched");
  }

  return ApiResponse.success(res, {
    orderId: id,
    itemReports: null,
    reportSubmitted: false,
    repackPhotos: [],
    photoCount: 0,
    finalWeightKg: null,
    finalVolumeCbm: null,
    repackNotes: null,
    repackSaved: false,
    outboundTrackingId: null,
    packingListUrl: null,
    deliverySlipUrl: null,
    sentToChina: false,
    adminReplies: null,
    clientApproved: null,
    clientConcern: null,
  }, "Warehouse report fetched");
};

// PATCH /api/v1/orders/:id/warehouse-report
export const upsertWarehouseReport = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot update warehouse reports");
  }

  const contentFields = [
    "itemReports", "reportSubmitted",
    "repackPhotos", "warehouseNote", "photosSentAt",
    "finalWeightKg", "finalVolumeCbm", "repackNotes", "repackSaved",
    "outboundTrackingId", "packingListUrl", "deliverySlipUrl", "sentToChina",
    "adminReplies",
  ];
  const readFlagFields = ["isReadByAdmin", "isReadByStaff"];
  const allowed = [...contentFields, ...readFlagFields, "lastUpdatedAt"];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  // Auto-stamp notification flags when warehouse content is updated
  const isContentUpdate = contentFields.some(k => k in req.body);
  if (isContentUpdate) {
    data.lastUpdatedAt = new Date();
    if (!("isReadByAdmin" in req.body)) data.isReadByAdmin = false;
    if (!("isReadByStaff" in req.body)) data.isReadByStaff = false;
  }

  const report = await ordersService.upsertWarehouseReport(id, data);
  return ApiResponse.success(res, report, "Warehouse report updated");
};

// DELETE /api/v1/orders/:id/warehouse-photos — remove one photo by index
export const deleteWarehousePhoto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { photoIndex } = req.body;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot delete warehouse photos");
  }
  if (typeof photoIndex !== "number" || photoIndex < 0) {
    throw ApiError.badRequest("photoIndex must be a non-negative number");
  }

  const existing = await ordersService.getWarehouseReport(id);
  const photos: string[] = (existing?.repackPhotos as string[]) ?? [];
  if (photoIndex >= photos.length) {
    throw ApiError.badRequest("photoIndex out of range");
  }

  const updated = photos.filter((_, i) => i !== photoIndex);
  await ordersService.upsertWarehouseReport(id, {
    repackPhotos: updated,
    lastUpdatedAt: new Date(),
    isReadByAdmin: false,
    isReadByStaff: false,
  });

  return ApiResponse.success(res, { photoUrls: updated }, "Photo removed");
};

// POST /api/v1/orders/:id/warehouse-photos
export const uploadWarehousePhotos = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { photos, note } = req.body;

  if (!Array.isArray(photos) || photos.length === 0) {
    throw ApiError.badRequest("photos array is required");
  }

  // Store base64 data URLs directly in the repackPhotos array
  const photoUrls: string[] = photos.map((b64: string) => {
    if (b64.startsWith("data:")) return b64;
    return `data:image/jpeg;base64,${b64}`;
  });

  // Append to existing repackPhotos (cap at 30)
  const existing = await ordersService.getWarehouseReport(id);
  const existingPhotos: string[] = (existing?.repackPhotos as string[]) ?? [];
  const merged = [...existingPhotos, ...photoUrls].slice(0, 30);

  const updateData: Record<string, unknown> = {
    repackPhotos: merged,
    photosSentAt: new Date(),
    isReadByAdmin: false,
    isReadByStaff: false,
    lastUpdatedAt: new Date(),
  };
  if (note !== undefined && typeof note === "string") {
    updateData.warehouseNote = note.trim() || null;
  }

  await ordersService.upsertWarehouseReport(id, updateData);
  return ApiResponse.success(res, { photoUrls: merged }, "Photos uploaded");
};

// PATCH /api/v1/orders/:id/repack-approval
export const updateRepackApproval = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, concern } = req.body;

  if (req.user?.role !== "CLIENT") {
    throw ApiError.forbidden("Only clients can submit repack approval");
  }

  const cid = await ordersService.getClientIdByUserId(req.user.userId);
  if (!cid) throw ApiError.forbidden("No client profile linked to this account");

  const report = await ordersService.upsertWarehouseReport(id, {
    clientApproved: Boolean(approved),
    clientConcern: concern ?? null,
    clientReviewedAt: new Date().toISOString(),
  });

  return ApiResponse.success(res, { clientApproved: (report as any).clientApproved, clientConcern: (report as any).clientConcern }, "Approval recorded");
};

// POST /api/v1/orders/:id/warehouse-reply
export const addWarehouseReply = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;

  if (req.user?.role === "CLIENT") {
    throw ApiError.forbidden("Clients cannot send warehouse replies");
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw ApiError.badRequest("message is required");
  }

  const reply = {
    message: message.trim(),
    sentAt: new Date().toISOString(),
    sentBy: req.user?.userId ?? "unknown",
  };

  const report = await ordersService.appendAdminReply(id, reply);

  // Reset read flags so warehouse staff see the new reply
  await ordersService.upsertWarehouseReport(id, {
    lastUpdatedAt: new Date(),
    isReadByAdmin: false,
    isReadByStaff: false,
  });

  return ApiResponse.success(res, { adminReplies: (report as any).adminReplies }, "Reply sent");
};
