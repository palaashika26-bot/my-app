import { Router } from "express";
import { signUpload } from "./uploads.controller";
import { asyncHandler } from "../../../utils/asyncHandler";
import { authenticate } from "../../../middleware/authenticate";
import { validate } from "../../../middleware/validate";
import { signUploadSchema } from "./uploads.schema";

const router = Router();

// Any authenticated user may request a signed upload URL for their own object
// path. Scope + content-type allowlist + batch cap are enforced in the schema
// and storage helper.
router.post("/sign", authenticate, validate(signUploadSchema), asyncHandler(signUpload));

export default router;
