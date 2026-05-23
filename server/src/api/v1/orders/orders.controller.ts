import { Request, Response } from "express";
import { ordersService } from "./orders.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";

export const getOrders = async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;

  let clientId: string | undefined;

  if (req.user?.role === "CLIENT") {
    // Scope results to this client's own orders only
    const id = await ordersService.getClientIdByUserId(req.user.userId);
    if (!id) throw ApiError.forbidden("No client profile linked to this account");
    clientId = id;
  }
  // ADMIN and STAFF receive all orders (clientId stays undefined)

  const { orders, pagination } = await ordersService.getOrders(
    { page, limit },
    clientId
  );

  return ApiResponse.success(res, orders, "Orders fetched successfully", 200, pagination);
};

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  let clientId: string | undefined;

  if (req.user?.role === "CLIENT") {
    // Ownership check — repository will 404 if this order doesn't belong to them
    const cid = await ordersService.getClientIdByUserId(req.user.userId);
    if (!cid) throw ApiError.forbidden("No client profile linked to this account");
    clientId = cid;
  }

  const order = await ordersService.getOrderById(id, clientId);

  return ApiResponse.success(res, order, "Order fetched successfully");
};
