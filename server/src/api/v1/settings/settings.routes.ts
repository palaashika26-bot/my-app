import { Router } from "express";
import {
  getExchangeRateController,
  updateExchangeRateController,
} from "./settings.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { validate } from "../../../middleware/validate";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { updateExchangeRateSchema } from "./settings.schema";

const router = Router();

// Any authenticated role may read the rate (used in price displays everywhere).
router.get(
  "/exchange-rate",
  authenticate,
  authorize(["CLIENT", "ADMIN", "STAFF"]),
  asyncHandler(getExchangeRateController)
);

// Only admins may change the platform-wide rate.
router.patch(
  "/exchange-rate",
  authenticate,
  authorize(["ADMIN"]),
  validate(updateExchangeRateSchema),
  asyncHandler(updateExchangeRateController)
);

export default router;
