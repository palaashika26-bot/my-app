import { Router } from "express";
import {
  submitPayment, getOrderPayments, verifyPayment,
  submitRequestPayment, getRequestPayments, verifyRequestPayment,
  submitLogisticsPayment, getLogisticsPayments, verifyLogisticsPayment,
} from "./payments.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validate } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { submitPaymentSchema, submitRequestPaymentSchema, submitLogisticsPaymentSchema, verifyPaymentSchema } from "./payments.schema";

const router = Router();

// ── Order payment routes ────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize(["CLIENT"]),
  validate(submitPaymentSchema),
  asyncHandler(submitPayment)
);

router.get(
  "/order/:orderId",
  authenticate,
  asyncHandler(getOrderPayments)
);

router.patch(
  "/:id/verify",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(verifyPaymentSchema),
  asyncHandler(verifyPayment)
);

// ── Request payment routes ──────────────────────────────────────────────────
router.post(
  "/request",
  authenticate,
  authorize(["CLIENT"]),
  validate(submitRequestPaymentSchema),
  asyncHandler(submitRequestPayment)
);

router.get(
  "/request/:requestId",
  authenticate,
  asyncHandler(getRequestPayments)
);

router.patch(
  "/request/:id/verify",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(verifyPaymentSchema),
  asyncHandler(verifyRequestPayment)
);

// ── Logistics payment routes ────────────────────────────────────────────────
router.post(
  "/logistics",
  authenticate,
  authorize(["CLIENT"]),
  validate(submitLogisticsPaymentSchema),
  asyncHandler(submitLogisticsPayment)
);

router.get(
  "/logistics/:logisticsId",
  authenticate,
  asyncHandler(getLogisticsPayments)
);

router.patch(
  "/logistics/:id/verify",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(verifyPaymentSchema),
  asyncHandler(verifyLogisticsPayment)
);

export default router;
