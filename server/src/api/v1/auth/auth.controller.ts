import { Request, Response } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import config from "../../../config/env";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const { user, accessToken, refreshToken } = await authService.login(email, password);

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return ApiResponse.success(res, { user, accessToken }, "Login successful");
};

export const register = async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  return ApiResponse.success(res, user, "Registration successful", 201);
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;

  if (token) {
    await authService.logout(token);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
  });

  return ApiResponse.success(res, null, "Logged out successfully");
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getCurrentUser(req.user.userId);
  return ApiResponse.success(res, user, "User fetched successfully");
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new ApiError(401, "No refresh token provided");

  const result = await authService.refreshAccessToken(token);
  return ApiResponse.success(res, result, "Token refreshed");
};
