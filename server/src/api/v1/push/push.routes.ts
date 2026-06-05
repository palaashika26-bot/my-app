import { Router } from "express";
import { getVapidKey, subscribe, unsubscribe } from "./push.controller";
import { authenticate } from "../../../middleware/authenticate";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

// Public — frontend needs this before the user logs in
router.get("/vapid-public-key", asyncHandler(getVapidKey));

// Protected — must be logged in to subscribe/unsubscribe
router.post("/subscribe",   authenticate, asyncHandler(subscribe));
router.post("/unsubscribe", authenticate, asyncHandler(unsubscribe));

export default router;
