import { Router } from "express";
import {
  createLogistics,
  getLogisticsList,
  getLogisticsById,
  quoteLogistics,
  respondLogistics,
  respondCounterLogistics,
  updateLogisticsPhase,
  setLogisticsDeliveryMode,
  uploadLogisticsSlip,
  confirmLogisticsCargo,
  cancelLogistics,
  sendLogisticsMessage,
  getLogisticsMessages,
} from "./logistics.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validate, validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import {
  createLogisticsSchema,
  quoteLogisticsSchema,
  respondLogisticsSchema,
  respondCounterLogisticsSchema,
  updatePhaseSchema,
  deliveryModeSchema,
  uploadSlipSchema,
  confirmCargoSchema,
  cancelLogisticsSchema,
  sendLogisticsMessageSchema,
} from "./logistics.schema";

const router = Router();

// ── Client submits a logistics request ────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize(["CLIENT"]),
  validate(createLogisticsSchema),
  asyncHandler(createLogistics)
);

router.get(
  "/",
  authenticate,
  authorize(["CLIENT", "ADMIN", "STAFF"]),
  validateQueryParams,
  asyncHandler(getLogisticsList)
);

router.get(
  "/:id",
  authenticate,
  authorize(["CLIENT", "ADMIN", "STAFF"]),
  asyncHandler(getLogisticsById)
);

// ── Admin/staff quote + counter-response ──────────────────────────────────────
router.post(
  "/:id/quote",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(quoteLogisticsSchema),
  asyncHandler(quoteLogistics)
);

router.post(
  "/:id/respond-counter",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(respondCounterLogisticsSchema),
  asyncHandler(respondCounterLogistics)
);

// ── Client accept/reject/counter ──────────────────────────────────────────────
router.post(
  "/:id/respond",
  authenticate,
  authorize(["CLIENT"]),
  validate(respondLogisticsSchema),
  asyncHandler(respondLogistics)
);

// ── Fulfillment: phase (admin) + delivery mode & slip (client) ────────────────
router.patch(
  "/:id/phase",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(updatePhaseSchema),
  asyncHandler(updateLogisticsPhase)
);

router.patch(
  "/:id/delivery-mode",
  authenticate,
  authorize(["CLIENT"]),
  validate(deliveryModeSchema),
  asyncHandler(setLogisticsDeliveryMode)
);

router.patch(
  "/:id/slip",
  authenticate,
  authorize(["CLIENT"]),
  validate(uploadSlipSchema),
  asyncHandler(uploadLogisticsSlip)
);

router.post(
  "/:id/cargo-confirm",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(confirmCargoSchema),
  asyncHandler(confirmLogisticsCargo)
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize(["CLIENT", "ADMIN", "STAFF"]),
  validate(cancelLogisticsSchema),
  asyncHandler(cancelLogistics)
);

// ── Conversation ──────────────────────────────────────────────────────────────
router.post(
  "/:id/messages",
  authenticate,
  validate(sendLogisticsMessageSchema),
  asyncHandler(sendLogisticsMessage)
);
router.get("/:id/messages", authenticate, asyncHandler(getLogisticsMessages));

export default router;
