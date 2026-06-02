import { Request, Response } from "express";
import { paymentsService } from "./payments.service";
import { ApiResponse } from "../../../utils/ApiResponse";

export const submitPayment = async (req: Request, res: Response) => {
  const payment = await paymentsService.submitPayment(req.user!.userId, req.body);
  return ApiResponse.success(res, payment, "Payment proof submitted successfully", 201);
};

export const getOrderPayments = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const payments = await paymentsService.getOrderPayments(
    orderId,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, payments, "Payments fetched successfully");
};

export const verifyPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;
  const payment = await paymentsService.verifyPayment(
    id,
    req.user!.userId,
    action,
    rejectionReason
  );
  return ApiResponse.success(
    res,
    payment,
    action === "VERIFY" ? "Payment verified successfully" : "Payment rejected"
  );
};

export const submitRequestPayment = async (req: Request, res: Response) => {
  const payment = await paymentsService.submitRequestPayment(req.user!.userId, req.body);
  return ApiResponse.success(res, payment, "Payment proof submitted successfully", 201);
};

export const getRequestPayments = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const payments = await paymentsService.getRequestPayments(
    requestId,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, payments, "Payments fetched successfully");
};

export const verifyRequestPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;
  const result = await paymentsService.verifyRequestPayment(
    id,
    req.user!.userId,
    action,
    rejectionReason
  );
  return ApiResponse.success(
    res,
    result,
    action === "VERIFY" ? "Payment verified and order created" : "Payment rejected"
  );
};
