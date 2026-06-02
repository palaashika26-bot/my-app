import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "./notifications.controller";
import { authenticate } from "../../../middleware/authenticate";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.use(authenticate);

// GET /api/v1/notifications
router.get("/", asyncHandler(getNotifications));

// PATCH /api/v1/notifications/read-all  (must come before /:id)
router.patch("/read-all", asyncHandler(markAllAsRead));

// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", asyncHandler(markAsRead));

export default router;
