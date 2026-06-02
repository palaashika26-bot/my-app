import { Router } from "express";
import {
  getOrders,
  getOrderById,
  getOrderGST,
  saveOrderGST,
  updateOrderStages,
  updateOrderStatus,
  updateDeliveryPreference,
  getWarehouseReport,
  upsertWarehouseReport,
  uploadWarehousePhotos,
  deleteWarehousePhoto,
  updateRepackApproval,
  addWarehouseReply,
} from "./orders.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

// GET /api/v1/orders — requires auth; CLIENTs see only their orders
router.get("/", authenticate, validateQueryParams, asyncHandler(getOrders));

// GET /api/v1/orders/:id — requires auth; ownership enforced for CLIENTs
router.get("/:id", authenticate, asyncHandler(getOrderById));

// GET /api/v1/orders/:id/gst — fetch saved GST invoice data
router.get("/:id/gst", authenticate, asyncHandler(getOrderGST));

// POST /api/v1/orders/:id/gst — save GST invoice data (admin/staff only)
router.post("/:id/gst", authenticate, asyncHandler(saveOrderGST));

// PATCH /api/v1/orders/:id/stages — update completedStages (admin/staff only)
router.patch("/:id/stages", authenticate, asyncHandler(updateOrderStages));

// PATCH /api/v1/orders/:id/status — update order status (admin/staff only)
router.patch("/:id/status", authenticate, asyncHandler(updateOrderStatus));

// PATCH /api/v1/orders/:id/delivery-preference — client/admin/staff
router.patch("/:id/delivery-preference", authenticate, asyncHandler(updateDeliveryPreference));

// GET /api/v1/orders/:id/warehouse-report — admin/staff/warehouse
router.get("/:id/warehouse-report", authenticate, asyncHandler(getWarehouseReport));

// PATCH /api/v1/orders/:id/warehouse-report — warehouse/admin/staff
router.patch("/:id/warehouse-report", authenticate, asyncHandler(upsertWarehouseReport));

// POST /api/v1/orders/:id/warehouse-photos — warehouse only
router.post("/:id/warehouse-photos", authenticate, asyncHandler(uploadWarehousePhotos));

// DELETE /api/v1/orders/:id/warehouse-photos — remove one photo by index (warehouse/admin/staff)
router.delete("/:id/warehouse-photos", authenticate, asyncHandler(deleteWarehousePhoto));

// PATCH /api/v1/orders/:id/repack-approval — client only
router.patch("/:id/repack-approval", authenticate, asyncHandler(updateRepackApproval));

// POST /api/v1/orders/:id/warehouse-reply — admin/staff only
router.post("/:id/warehouse-reply", authenticate, asyncHandler(addWarehouseReply));

export default router;
