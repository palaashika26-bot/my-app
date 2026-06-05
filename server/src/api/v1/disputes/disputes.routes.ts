import { Router } from "express";
import {
  getAllDisputes,
  getDisputeById,
  updateDisputeStatus,
  getOpenDisputeCount,
} from "./disputes.controller";
import { authenticate } from "../../../middleware/authenticate";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.use(authenticate);

// GET /api/v1/disputes
router.get("/", asyncHandler(getAllDisputes));

// GET /api/v1/disputes/count/open
router.get("/count/open", asyncHandler(getOpenDisputeCount));

// GET /api/v1/disputes/:disputeId
router.get("/:disputeId", asyncHandler(getDisputeById));

// PATCH /api/v1/disputes/:disputeId
router.patch("/:disputeId", asyncHandler(updateDisputeStatus));

export default router;
