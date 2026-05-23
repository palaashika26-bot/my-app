import { Request, Response } from "express";
import { productsService } from "./products.service";
import { ApiResponse } from "../../../utils/ApiResponse";

export const getProducts = async (req: Request, res: Response) => {
  const { page, limit, categorySlug, supplierId, search } = req.query as Record<string, string>;

  const { products, pagination } = await productsService.getProducts({
    page,
    limit,
    categorySlug,
    supplierId,
    search,
  });

  return ApiResponse.success(
    res,
    products,
    "Products fetched successfully",
    200,
    pagination
  );
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await productsService.getProductById(id);
  return ApiResponse.success(res, product, "Product fetched successfully");
};
