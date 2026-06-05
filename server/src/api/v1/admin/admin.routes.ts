import { Router } from "express";
import { getStats, getClients, getClientById, getStaff, createStaff, updateStaff, deleteStaff } from "./admin.controller";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { validate } from "../../../middleware/validate";
import { asyncHandler } from "../../../utils/asyncHandler";
import { createStaffSchema, updateStaffSchema } from "./admin.schema";

const router = Router();

// All admin routes require authentication + ADMIN or STAFF role
router.use(authenticate, authorize(["ADMIN", "STAFF"]));

// GET /api/v1/admin/stats
router.get("/stats", asyncHandler(getStats));

// GET /api/v1/admin/clients
router.get("/clients", asyncHandler(getClients));

// GET /api/v1/admin/clients/:id
router.get("/clients/:id", asyncHandler(getClientById));

// GET /api/v1/admin/staff — list STAFF users (active only; ?includeInactive=true for management)
router.get("/staff", asyncHandler(getStaff));

// POST /api/v1/admin/staff — create a staff account (ADMIN only)
router.post("/staff", authorize(["ADMIN"]), validate(createStaffSchema), asyncHandler(createStaff));

// PATCH /api/v1/admin/staff/:id — update a staff account (ADMIN only)
router.patch("/staff/:id", authorize(["ADMIN"]), validate(updateStaffSchema), asyncHandler(updateStaff));

// DELETE /api/v1/admin/staff/:id — soft-delete a staff account (ADMIN only)
router.delete("/staff/:id", authorize(["ADMIN"]), asyncHandler(deleteStaff));

export default router;
