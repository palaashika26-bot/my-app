import { Router } from "express";
import { getOrders, getOrderById } from "./orders.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validateQueryParams } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

// GET /api/v1/orders — requires auth; CLIENTs see only their orders
router.get("/", authenticate, validateQueryParams, asyncHandler(getOrders));

// GET /api/v1/orders/:id — requires auth; ownership enforced for CLIENTs
router.get("/:id", authenticate, asyncHandler(getOrderById));

export default router;
