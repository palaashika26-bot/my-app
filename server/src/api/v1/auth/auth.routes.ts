import { Router } from "express";
import {
  login,
  register,
  registerClient,
  verifyEmail,
  resendVerification,
  logout,
  me,
  refresh,
  acceptInvite,
} from "./auth.controller";
import {
  loginSchema,
  registerSchema,
  registerClientSchema,
  resendVerificationSchema,
} from "./auth.schema";
import { validate } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authLimiter } from "../../../middleware/rateLimiter";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

// Strict rate limiter on all auth routes
router.use(authLimiter);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), asyncHandler(login));

// POST /api/v1/auth/register  (legacy / admin-created accounts)
router.post("/register", validate(registerSchema), asyncHandler(register));

// POST /api/v1/auth/register/client  (self-registration with email verification)
router.post(
  "/register/client",
  validate(registerClientSchema),
  asyncHandler(registerClient)
);

// GET /api/v1/auth/verify-email?token=...
router.get("/verify-email", asyncHandler(verifyEmail));

// POST /api/v1/auth/resend-verification  (re-send the verification email)
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  asyncHandler(resendVerification)
);

// POST /api/v1/auth/logout
router.post("/logout", asyncHandler(logout));

// GET  /api/v1/auth/me  (protected)
router.get("/me", authenticate, asyncHandler(me));

// POST /api/v1/auth/refresh
router.post("/refresh", asyncHandler(refresh));

// POST /api/v1/auth/accept-invite  (staff sets their password from invite link)
router.post("/accept-invite", asyncHandler(acceptInvite));

export default router;
