import { Request, Response } from "express";
import { supportService } from "./support.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const createTicket = async (req: Request, res: Response) => {
  const clientId = req.user?.clientId;
  if (!clientId) throw new ApiError(403, "Client profile not found for this user");
  const ticket = await supportService.createTicket(clientId, req.user!.userId, req.body);
  return ApiResponse.success(res, ticket, "Ticket submitted", 201);
};

export const listTickets = async (req: Request, res: Response) => {
  const tickets = await supportService.listTickets(req.user!.role, req.user?.clientId);
  return ApiResponse.success(res, tickets, "Tickets fetched");
};

export const getTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ticket = await supportService.getTicket(id, req.user!.userId, req.user!.role, req.user?.clientId);
  return ApiResponse.success(res, ticket, "Ticket fetched");
};

export const addMessage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const message = await supportService.addMessage(
    id,
    req.user!.userId,
    req.user!.role,
    req.body,
    req.user?.clientId
  );
  return ApiResponse.success(res, message, "Message sent", 201);
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await supportService.updateStatus(id, req.user!.role, req.body.status);
  return ApiResponse.success(res, result, "Status updated");
};
