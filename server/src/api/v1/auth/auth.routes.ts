import { Router } from "express";
import { login, register, logout, me, refresh } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";
import { validate } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authLimiter } from "../../../middleware/rateLimiter";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

// Strict rate limiter on all auth routes
router.use(authLimiter);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), asyncHandler(login));

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), asyncHandler(register));

// POST /api/v1/auth/logout
router.post("/logout", asyncHandler(logout));

// GET  /api/v1/auth/me  (protected)
router.get("/me", authenticate, asyncHandler(me));

// POST /api/v1/auth/refresh
router.post("/refresh", asyncHandler(refresh));

export default router;
