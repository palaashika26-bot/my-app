import { Request, Response } from "express";
import { logisticsService } from "./logistics.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const createRequest = async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) throw new ApiError(403, "Client profile not found for this user");
  const request = await logisticsService.create(clientId, req.user!.userId, req.body);
  return ApiResponse.success(res, request, "Logistics request submitted", 201);
};

export const listRequests = async (req: Request, res: Response) => {
  const rows = await logisticsService.list(req.user!.role, req.user?.clientId);
  return ApiResponse.success(res, rows, "Logistics requests fetched");
};

export const getRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await logisticsService.getById(id, req.user!.userId, req.user!.role, req.user?.clientId);
  return ApiResponse.success(res, request, "Logistics request fetched");
};

export const addMessage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const message = await logisticsService.addMessage(
    id,
    req.user!.userId,
    req.user!.role,
    req.body,
    req.user?.clientId
  );
  return ApiResponse.success(res, message, "Message sent", 201);
};

export const updateQuote = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await logisticsService.updateQuote(id, req.user!.role, req.body.pricePerKg, req.body.note);
  return ApiResponse.success(res, result, "Quote saved");
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await logisticsService.updateStatus(id, req.user!.role, req.body.status);
  return ApiResponse.success(res, result, "Status updated");
};
