import { Router } from "express";
import multer from "multer";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, importProductsFromCSV } from "./products.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { searchLimiter } from "../../../middleware/rateLimiter";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { requireRole } from "../../../middleware/requireRole";
import { validate } from "../../../middleware/validate";
import { createProductSchema, updateProductSchema } from "./products.schema";

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

// POST /api/v1/products — create new product
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  validate(createProductSchema),
  asyncHandler(createProduct)
);

// PUT /api/v1/products/:id — update product
router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  validate(updateProductSchema),
  asyncHandler(updateProduct)
);

// DELETE /api/v1/products/:id — soft-delete product
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "STAFF"]),
  asyncHandler(deleteProduct)
);

export default router;
