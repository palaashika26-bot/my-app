import { Request, Response } from "express";
import { createSignedUploads, getStorageBucket, isStorageConfigured } from "../../../config/storage";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

// POST /api/v1/uploads/sign — issue short-lived signed upload URLs so the client
// can upload image/video bytes directly to object storage. The body never carries
// file bytes through this server; only the returned `path` values are persisted.
export const signUpload = async (req: Request, res: Response) => {
  if (!isStorageConfigured()) {
    throw new ApiError(503, "File uploads are temporarily unavailable (storage not configured)");
  }
  const { scope, contentTypes } = req.body;
  // Namespace objects by the uploader's client id (falls back to user id for
  // admin/staff who have no client profile).
  const ownerId = req.user?.clientId ?? req.user?.userId ?? "anon";
  const uploads = await createSignedUploads({ scope, ownerId, contentTypes });
  // The client needs the bucket name to call uploadToSignedUrl(path, token, file).
  return ApiResponse.success(res, { bucket: getStorageBucket(), uploads }, "Signed upload URLs created", 201);
};
