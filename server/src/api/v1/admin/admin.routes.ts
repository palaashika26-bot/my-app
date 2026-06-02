import { Router } from "express";
import { getStats, getClients, getClientById } from "./admin.controller";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

// All admin routes require authentication + ADMIN or STAFF role
router.use(authenticate, authorize(["ADMIN", "STAFF"]));

// GET /api/v1/admin/stats
router.get("/stats", asyncHandler(getStats));

// GET /api/v1/admin/clients
router.get("/clients", asyncHandler(getClients));

// GET /api/v1/admin/clients/:id
router.get("/clients/:id", asyncHandler(getClientById));

export default router;
