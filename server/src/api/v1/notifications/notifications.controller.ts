import { Request, Response } from "express";
import { notificationsService } from "./notifications.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const getNotifications = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10"));
  const notifications = await notificationsService.getForUser(
    req.user.userId,
    req.user.role,
    limit
  );
  return ApiResponse.success(res, notifications, "Notifications fetched");
};

// No-op — in a future phase these would update a real Notification row
export const markAsRead = async (_req: Request, res: Response) => {
  return ApiResponse.success(res, null, "Marked as read");
};

export const markAllAsRead = async (_req: Request, res: Response) => {
  return ApiResponse.success(res, null, "All marked as read");
};
