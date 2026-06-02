import { Request, Response } from "express";
import { inquiriesService } from "./inquiries.service";
import { ApiResponse } from "../../../utils/ApiResponse";

export const createInquiry = async (req: Request, res: Response) => {
  const inquiry = await inquiriesService.createInquiry(
    req.user!.userId,
    req.body
  );
  return ApiResponse.success(res, inquiry, "Inquiry submitted successfully", 201);
};

export const getInquiries = async (req: Request, res: Response) => {
  const { page, limit, status } = req.query as Record<string, string>;
  const { inquiries, pagination } = await inquiriesService.getInquiries(
    { page, limit, status },
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, inquiries, "Inquiries fetched successfully", 200, pagination);
};

export const getInquiryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const inquiry = await inquiriesService.getInquiryById(
    id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, inquiry, "Inquiry fetched successfully");
};
