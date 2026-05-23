import { Router } from "express";
import { getProducts, getProductById } from "./products.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { searchLimiter } from "../../../middleware/rateLimiter";
import { validateQueryParams } from "../../../middleware/validate";

const router = Router();

// GET /api/v1/products — search limiter + pagination validation
router.get("/", searchLimiter, validateQueryParams, asyncHandler(getProducts));

// GET /api/v1/products/:id
router.get("/:id", asyncHandler(getProductById));

export default router;
