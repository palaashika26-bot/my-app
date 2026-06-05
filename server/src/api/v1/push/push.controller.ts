import { Request, Response } from "express";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import { saveSubscription, removeSubscription } from "./push.service";
import config from "../../../config/env";

// GET /api/v1/push/vapid-public-key — returns the public key for the frontend
export const getVapidKey = async (_req: Request, res: Response) => {
  return ApiResponse.success(res, { publicKey: config.VAPID_PUBLIC_KEY }, "VAPID public key");
};

// POST /api/v1/push/subscribe — save a push subscription for the logged-in user
export const subscribe = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ApiError(400, "Invalid push subscription payload");
  }

  await saveSubscription(req.user.userId, endpoint, keys.p256dh, keys.auth);
  return ApiResponse.success(res, null, "Subscribed to push notifications", 201);
};

// POST /api/v1/push/unsubscribe — remove a push subscription
export const unsubscribe = async (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) throw new ApiError(400, "endpoint is required");
  await removeSubscription(endpoint);
  return ApiResponse.success(res, null, "Unsubscribed from push notifications");
};
