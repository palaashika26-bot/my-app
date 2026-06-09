import { Router } from "express";
import {
  createRequest,
  listRequests,
  getRequest,
  addMessage,
  updateQuote,
  updateStatus,
} from "./logistics.controller";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { validate } from "../../../middleware/validate";
import { asyncHandler } from "../../../utils/asyncHandler";
import {
  createLogisticsSchema,
  logisticsMessageSchema,
  logisticsQuoteSchema,
  logisticsStatusSchema,
} from "./logistics.schema";

const router = Router();

router.use(authenticate);

// POST /api/v1/logistics/requests — client submits a logistics request
router.post(
  "/requests",
  authorize(["CLIENT"]),
  validate(createLogisticsSchema),
  asyncHandler(createRequest)
);

// GET /api/v1/logistics/requests — client own, admin/staff all
router.get("/requests", asyncHandler(listRequests));

// GET /api/v1/logistics/requests/:id — detail + chat
router.get("/requests/:id", asyncHandler(getRequest));

// POST /api/v1/logistics/requests/:id/messages — chat
router.post(
  "/requests/:id/messages",
  validate(logisticsMessageSchema),
  asyncHandler(addMessage)
);

// PATCH /api/v1/logistics/requests/:id/quote — admin/staff send a quote
router.patch(
  "/requests/:id/quote",
  authorize(["ADMIN", "STAFF"]),
  validate(logisticsQuoteSchema),
  asyncHandler(updateQuote)
);

// PATCH /api/v1/logistics/requests/:id/status — admin/staff update status
router.patch(
  "/requests/:id/status",
  authorize(["ADMIN", "STAFF"]),
  validate(logisticsStatusSchema),
  asyncHandler(updateStatus)
);

export default router;
