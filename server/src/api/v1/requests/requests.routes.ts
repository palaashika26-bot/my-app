import { Router } from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  sendQuotation,
  approveRequest,
  rejectRequest,
  respondToQuotation,
  respondToCounter,
  sendMessage,
  getMessages,
} from "./requests.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validate, validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import {
  createRequestSchemaV2,
  sendQuotationSchema,
  rejectRequestSchema,
  respondToQuotationSchema,
  respondToCounterSchema,
  sendMessageSchema,
} from "./requests.schema";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(["CLIENT", "ADMIN"]),
  validate(createRequestSchemaV2),
  asyncHandler(createRequest)
);

router.get("/", authenticate, authorize(["CLIENT", "ADMIN", "STAFF"]), validateQueryParams, asyncHandler(getRequests));

router.get("/:id", authenticate, authorize(["CLIENT", "ADMIN", "STAFF"]), asyncHandler(getRequestById));

router.post(
  "/:id/quotation",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(sendQuotationSchema),
  asyncHandler(sendQuotation)
);

router.post(
  "/:id/approve",
  authenticate,
  authorize(["ADMIN", "STAFF", "CLIENT"]),
  asyncHandler(approveRequest)
);

router.post(
  "/:id/reject",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(rejectRequestSchema),
  asyncHandler(rejectRequest)
);

router.post(
  "/:id/respond",
  authenticate,
  authorize(["CLIENT"]),
  validate(respondToQuotationSchema),
  asyncHandler(respondToQuotation)
);

router.post(
  "/:id/respond-counter",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validate(respondToCounterSchema),
  asyncHandler(respondToCounter)
);

router.post("/:id/messages", authenticate, validate(sendMessageSchema), asyncHandler(sendMessage));
router.get("/:id/messages", authenticate, asyncHandler(getMessages));

export default router;
