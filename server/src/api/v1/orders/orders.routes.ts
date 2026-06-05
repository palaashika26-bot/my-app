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
  cancelOrder,
  createDispute,
  getOrderDisputes,
  uploadDisputeVideo,
  getOrderContact,
  assignStaffContact,
} from "./orders.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

// GET /api/v1/orders — requires auth; CLIENTs see only their orders
router.get("/", authenticate, validateQueryParams, asyncHandler(getOrders));

// GET /api/v1/orders/:id — requires auth; ownership enforced for CLIENTs
router.get("/:id", authenticate, asyncHandler(getOrderById));

// GET /api/v1/orders/:id/contact — returns admin/staff contact details
router.get("/:id/contact", authenticate, asyncHandler(getOrderContact));

// PATCH /api/v1/orders/:id/staff-contact — admin assigns staff contact shown to client
router.patch("/:id/staff-contact", authenticate, asyncHandler(assignStaffContact));

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

// PATCH /api/v1/orders/:id/cancel — client only
router.patch("/:id/cancel", authenticate, asyncHandler(cancelOrder));

// GET /api/v1/orders/:id/disputes — all roles (clients scoped to own orders)
router.get("/:id/disputes", authenticate, asyncHandler(getOrderDisputes));

// POST /api/v1/orders/:id/disputes — client only
router.post("/:id/disputes", authenticate, asyncHandler(createDispute));

// POST /api/v1/orders/:id/dispute-video — client only
router.post("/:id/dispute-video", authenticate, asyncHandler(uploadDisputeVideo));

export default router;
