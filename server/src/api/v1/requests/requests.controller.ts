import { Request, Response } from "express";
import { requestsService } from "./requests.service";
import { ApiError } from "../../../utils/ApiError";
import { ApiResponse } from "../../../utils/ApiResponse";

export const createRequest = async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) throw new ApiError(403, "Client profile not found for this user");
  const request = await requestsService.createRequest(clientId, req.body);
  return ApiResponse.success(res, request, "Request submitted successfully", 201);
};

export const getRequests = async (req: Request, res: Response) => {
  const { page, limit, statuses, search } = req.query as Record<string, string>;
  const clientId = req.user?.clientId;
  // A tab maps to one or more enum statuses, sent as a comma-separated list.
  const statusList = statuses
    ? statuses.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const { requests, pagination } = await requestsService.getRequests(
    { page, limit, statuses: statusList, search },
    req.user!.userId,
    req.user!.role,
    clientId
  );
  return ApiResponse.success(res, requests, "Requests fetched successfully", 200, pagination);
};

export const getRequestById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await requestsService.getRequestById(
    id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, request, "Request fetched successfully");
};

export const sendQuotation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await requestsService.sendQuotation(id, req.body, req.user!.userId);
  return ApiResponse.success(res, request, "Quotation sent successfully");
};

export const updateLogistics = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await requestsService.updateLogistics(id, req.body);
  return ApiResponse.success(res, request, "Logistics estimate saved");
};

export const approveRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await requestsService.approveAndConvert(id, req.user!.userId, req.user!.role);
  return ApiResponse.success(res, result, "Request approved and order created");
};

export const rejectRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await requestsService.rejectRequest(id, req.user!.userId, req.body?.reason);
  return ApiResponse.success(res, request, "Request rejected");
};

export const cancelRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await requestsService.cancelRequest(
    id,
    req.user!.userId,
    req.user!.role,
    req.body?.cancelReason
  );
  return ApiResponse.success(res, request, "Request cancelled");
};

export const respondToQuotation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await requestsService.respondToQuotation(id, req.user!.userId, req.body);
  return ApiResponse.success(res, result, "Response submitted");
};

export const respondToCounter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await requestsService.respondToCounter(id, req.user!.userId, req.body);
  return ApiResponse.success(res, result, "Counter response submitted");
};

export const sendMessage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const message = await requestsService.sendMessage(id, req.user!.userId, req.user!.role, req.body.text);
  return ApiResponse.success(res, message, "Message sent", 201);
};

export const getMessages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const since = req.query.since as string | undefined;
  const messages = await requestsService.getMessages(id, req.user!.userId, req.user!.role, since);
  return ApiResponse.success(res, messages, "Messages fetched");
};
