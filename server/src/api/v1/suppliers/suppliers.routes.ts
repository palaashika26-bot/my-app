import { Router } from "express";
import { getSuppliers, getSupplierById } from "./suppliers.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";

const router = Router();

// GET /api/v1/suppliers — ADMIN and STAFF only
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  validateQueryParams,
  asyncHandler(getSuppliers)
);

// GET /api/v1/suppliers/:id — ADMIN and STAFF only
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  asyncHandler(getSupplierById)
);

export default router;
