import { Request, Response } from "express";
import { categoriesService } from "./categories.service";
import { ApiResponse } from "../../../utils/ApiResponse";

export const getCategories = async (req: Request, res: Response) => {
  const categories = await categoriesService.getCategories();
  return ApiResponse.success(res, categories, "Categories fetched successfully");
};

export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const category = await categoriesService.getCategoryBySlug(slug);
  return ApiResponse.success(res, category, "Category fetched successfully");
};
