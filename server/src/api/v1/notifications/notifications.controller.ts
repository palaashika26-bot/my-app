import { Request, Response } from "express";
import { notificationsService } from "./notifications.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import prisma from "../../../config/prisma";

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

// Mark a single persisted notification as read. Scoped to the caller's own rows.
// Synthetic/derived ids (e.g. `ord-…`) simply match nothing → count 0, no error,
// so the bell's derived items degrade gracefully.
export const markAsRead = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.user.userId },
    data: { read: true },
  });
  return ApiResponse.success(res, null, "Marked as read");
};

export const markAllAsRead = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await prisma.notification.updateMany({
    where: { userId: req.user.userId, read: false },
    data: { read: true },
  });
  return ApiResponse.success(res, null, "All marked as read");
};
