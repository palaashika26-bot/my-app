import { Router } from "express";
import { createInquiry, getInquiries, getInquiryById } from "./inquiries.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validate, validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { createInquirySchema } from "./inquiries.schema";

const router = Router();

// POST /api/v1/inquiries — CLIENT only
router.post(
  "/",
  authenticate,
  authorize(["CLIENT"]),
  validate(createInquirySchema),
  asyncHandler(createInquiry)
);

// GET /api/v1/inquiries — all roles; CLIENTs see only their own
router.get("/", authenticate, validateQueryParams, asyncHandler(getInquiries));

// GET /api/v1/inquiries/:id — all roles; ownership enforced for CLIENTs
router.get("/:id", authenticate, asyncHandler(getInquiryById));

export default router;
