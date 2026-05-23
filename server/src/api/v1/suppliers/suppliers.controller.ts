import { Request, Response } from "express";
import { suppliersService } from "./suppliers.service";
import { ApiResponse } from "../../../utils/ApiResponse";

export const getSuppliers = async (req: Request, res: Response) => {
  const { page, limit, isVerified, search } = req.query as Record<string, string>;

  const { suppliers, pagination } = await suppliersService.getSuppliers({
    page,
    limit,
    isVerified,
    search,
  });

  return ApiResponse.success(
    res,
    suppliers,
    "Suppliers fetched successfully",
    200,
    pagination
  );
};

export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await suppliersService.getSupplierById(id);
  return ApiResponse.success(res, supplier, "Supplier fetched successfully");
};
