import { Router } from "express";
import { authenticate } from "../../../middleware/authenticate";
import { requireRole } from "../../../middleware/requireRole";
import { asyncHandler } from "../../../utils/asyncHandler";
import {
  postTrackingUpdate,
  getTracking,
  deleteTracking,
} from "./tracking.controller";

const router = Router();

router.post(
  "/:orderId",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(postTrackingUpdate)
);

router.get(
  "/:orderId",
  authenticate,
  requireRole(["ADMIN", "STAFF", "CLIENT"]),
  asyncHandler(getTracking)
);

router.delete(
  "/stage/:id",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(deleteTracking)
);

export default router;
