import { Request, Response } from "express";
import { adminService } from "./admin.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const getStats = async (_req: Request, res: Response) => {
  const stats = await adminService.getStats();
  return ApiResponse.success(res, stats, "Stats fetched successfully");
};

export const getClients = async (req: Request, res: Response) => {
  const { clients, pagination } = await adminService.getClients(
    req.query as Record<string, string>
  );
  return ApiResponse.success(res, clients, "Clients fetched successfully", 200, pagination);
};

export const getClientById = async (req: Request, res: Response) => {
  const client = await adminService.getClientById(req.params.id);
  if (!client) throw ApiError.notFound("Client not found");
  return ApiResponse.success(res, client, "Client fetched successfully");
};
