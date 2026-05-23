import { Router } from "express";
import { getCategories, getCategoryBySlug } from "./categories.controller";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

// GET /api/v1/categories
router.get("/", asyncHandler(getCategories));

// GET /api/v1/categories/:slug
router.get("/:slug", asyncHandler(getCategoryBySlug));

export default router;
