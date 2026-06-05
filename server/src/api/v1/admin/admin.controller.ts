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

export const getStaff = async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const staff = await adminService.getStaffUsers(includeInactive);
  return ApiResponse.success(res, staff, "Staff users fetched successfully");
};

export const createStaff = async (req: Request, res: Response) => {
  const staff = await adminService.createStaff(req.body);
  return ApiResponse.success(res, staff, "Staff account created", 201);
};

export const updateStaff = async (req: Request, res: Response) => {
  const staff = await adminService.updateStaff(req.params.id, req.body);
  return ApiResponse.success(res, staff, "Staff member updated");
};

export const deleteStaff = async (req: Request, res: Response) => {
  const result = await adminService.deleteStaff(req.params.id);
  return ApiResponse.success(res, result, "Staff member removed");
};
