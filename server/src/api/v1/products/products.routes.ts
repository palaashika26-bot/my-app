import { Router } from "express";
import multer from "multer";
import { getProducts, getProductById, importProductsFromCSV } from "./products.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { searchLimiter } from "../../../middleware/rateLimiter";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { requireRole } from "../../../middleware/requireRole";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/v1/products/import-csv — must be before /:id to avoid route conflict
router.post(
  "/import-csv",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  upload.single("file"),
  importProductsFromCSV
);

// GET /api/v1/products — search limiter + pagination validation
router.get("/", searchLimiter, validateQueryParams, asyncHandler(getProducts));

// GET /api/v1/products/:id
router.get("/:id", asyncHandler(getProductById));

export default router;
