import { Request, Response } from "express";
import { getExchangeRate, setExchangeRate } from "./settings.repository";
import { ApiResponse } from "../../../utils/ApiResponse";

export const getExchangeRateController = async (_req: Request, res: Response) => {
  const rate = await getExchangeRate();
  return ApiResponse.success(res, { rate }, "Exchange rate fetched successfully");
};

export const updateExchangeRateController = async (req: Request, res: Response) => {
  const rate = await setExchangeRate(req.body.rate);
  return ApiResponse.success(res, { rate }, "Exchange rate updated successfully");
};
