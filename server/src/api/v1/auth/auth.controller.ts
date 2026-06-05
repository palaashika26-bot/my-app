import { Request, Response } from "express";
import { authService } from "./auth.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import config from "../../../config/env";
import { RegisterClientInput } from "./auth.schema";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  // typed as a union to satisfy TypeScript cookie options
  sameSite: (config.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax" | "strict",
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

export const registerClient = async (req: Request, res: Response) => {
  const result = await authService.registerClient(req.body as RegisterClientInput);
  return ApiResponse.success(res, null, result.message, 201);
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) throw new ApiError(400, "Token is required");

  const result = await authService.verifyEmail(token);
  return ApiResponse.success(res, null, result.message);
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;

  if (token) {
    await authService.logout(token);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: (config.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax" | "strict",
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

  // If service rotated the refresh token, set the new cookie
  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }

  return ApiResponse.success(res, { accessToken: result.accessToken }, "Token refreshed");
};

export const acceptInvite = async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token?.trim()) throw new ApiError(400, "Invite token is required");
  if (!password || password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");

  const result = await authService.acceptInvite(token.trim(), password);
  return ApiResponse.success(res, null, result.message);
};
