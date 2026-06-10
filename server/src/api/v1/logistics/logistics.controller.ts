import { Request, Response } from "express";
import { logisticsService } from "./logistics.service";
import { ApiError } from "../../../utils/ApiError";
import { ApiResponse } from "../../../utils/ApiResponse";

export const createLogistics = async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) throw new ApiError(403, "Client profile not found for this user");
  const request = await logisticsService.createRequest(clientId, req.body);
  return ApiResponse.success(res, request, "Logistics request submitted", 201);
};

export const getLogisticsList = async (req: Request, res: Response) => {
  const { page, limit, status, view } = req.query as Record<string, string>;
  const { requests, pagination } = await logisticsService.getRequests(
    { page, limit, status, view },
    req.user!.userId,
    req.user!.role,
    req.user?.clientId
  );
  return ApiResponse.success(res, requests, "Logistics requests fetched", 200, pagination);
};

export const getLogisticsById = async (req: Request, res: Response) => {
  const request = await logisticsService.getRequestById(
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, request, "Logistics request fetched");
};

export const quoteLogistics = async (req: Request, res: Response) => {
  const request = await logisticsService.sendQuote(req.params.id, req.body);
  return ApiResponse.success(res, request, "Quote sent to client");
};

export const respondLogistics = async (req: Request, res: Response) => {
  const request = await logisticsService.respond(req.params.id, req.user!.userId, req.body);
  return ApiResponse.success(res, request, "Response submitted");
};

export const respondCounterLogistics = async (req: Request, res: Response) => {
  const request = await logisticsService.respondCounter(req.params.id, req.body);
  return ApiResponse.success(res, request, "Counter response submitted");
};

export const updateLogisticsPhase = async (req: Request, res: Response) => {
  const request = await logisticsService.updatePhase(req.params.id, req.body);
  return ApiResponse.success(res, request, "Phase updated");
};

export const setLogisticsDeliveryMode = async (req: Request, res: Response) => {
  const request = await logisticsService.setDeliveryMode(req.params.id, req.user!.userId, req.body);
  return ApiResponse.success(res, request, "Delivery preference saved");
};

export const uploadLogisticsSlip = async (req: Request, res: Response) => {
  const request = await logisticsService.uploadSlip(req.params.id, req.user!.userId, req.body);
  return ApiResponse.success(res, request, "Warehouse slip uploaded");
};

export const confirmLogisticsCargo = async (req: Request, res: Response) => {
  const request = await logisticsService.confirmCargo(req.params.id, req.body);
  return ApiResponse.success(res, request, "Cargo receipt confirmed");
};

export const cancelLogistics = async (req: Request, res: Response) => {
  const request = await logisticsService.cancelRequest(
    req.params.id,
    req.user!.userId,
    req.user!.role,
    req.body?.cancelReason
  );
  return ApiResponse.success(res, request, "Logistics request cancelled");
};

export const sendLogisticsMessage = async (req: Request, res: Response) => {
  const message = await logisticsService.sendMessage(
    req.params.id,
    req.user!.userId,
    req.user!.role,
    req.body.text
  );
  return ApiResponse.success(res, message, "Message sent", 201);
};

export const getLogisticsMessages = async (req: Request, res: Response) => {
  const since = req.query.since as string | undefined;
  const messages = await logisticsService.getMessages(
    req.params.id,
    req.user!.userId,
    req.user!.role,
    since
  );
  return ApiResponse.success(res, messages, "Messages fetched");
};
