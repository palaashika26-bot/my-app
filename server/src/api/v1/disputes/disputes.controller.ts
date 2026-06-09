import { Request, Response } from "express";
import { disputesRepository } from "./disputes.repository";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import prisma from "../../../config/prisma";
import { notifyUser } from "../../../utils/notify";
import { signImageFields } from "../../../config/storage";

// Dispute proof fields that may hold object-storage paths needing signed read URLs.
const DISPUTE_IMAGE_SPEC = {
  singles: ["videoProofUrl"] as string[],
  arrays: ["attachments", "attachmentThumbs"] as string[],
};

export const getAllDisputes = async (req: Request, res: Response) => {
  if (req.user?.role === "CLIENT") throw ApiError.forbidden("Clients cannot view all disputes");

  const { status, orderId } = req.query as Record<string, string>;
  const disputes = await disputesRepository.findAll(status, orderId);
  await signImageFields(disputes, DISPUTE_IMAGE_SPEC);
  return ApiResponse.success(res, disputes, "Disputes fetched");
};

export const getDisputeById = async (req: Request, res: Response) => {
  const { disputeId } = req.params;
  const dispute = await disputesRepository.findById(disputeId);

  if (req.user?.role === "CLIENT") {
    const client = await prisma.client.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!client || dispute.clientId !== client.id) {
      throw ApiError.forbidden("You do not have access to this dispute");
    }
  }

  await signImageFields(dispute, DISPUTE_IMAGE_SPEC);
  return ApiResponse.success(res, dispute, "Dispute fetched");
};

export const updateDisputeStatus = async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") throw ApiError.forbidden("Only admins can update dispute status");

  const { disputeId } = req.params;
  const { status, adminNote } = req.body;

  const validStatuses = ["UNDER_REVIEW", "RESOLVED", "REJECTED"];
  if (!status || !validStatuses.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${validStatuses.join(", ")}`);
  }

  const dispute = await disputesRepository.findById(disputeId);
  const updated = await disputesRepository.updateStatus(disputeId, { status, adminNote });

  // Notify the client
  const clientUser = await prisma.user.findFirst({
    where: { client: { id: dispute.clientId } },
    select: { id: true },
  });
  if (clientUser) {
    const typeLabel = dispute.type === "REPLACEMENT" ? "replacement" : "issue";
    const statusLabel =
      status === "UNDER_REVIEW"
        ? "is under review"
        : status === "RESOLVED"
        ? "has been resolved"
        : "has been rejected";
    await notifyUser(clientUser.id, {
      type: "DISPUTE_UPDATED",
      title: `${dispute.type === "REPLACEMENT" ? "Replacement" : "Issue"} Request Update`,
      message: `Your ${typeLabel} request on Order #${dispute.order.orderNumber} ${statusLabel}.${adminNote ? ` Note: ${adminNote}` : ""}`,
      relatedType: "DISPUTE",
      relatedId: disputeId,
    });
  }

  return ApiResponse.success(res, updated, "Dispute updated");
};

export const getOpenDisputeCount = async (req: Request, res: Response) => {
  if (req.user?.role === "CLIENT") throw ApiError.forbidden();
  const count = await disputesRepository.countOpen();
  return ApiResponse.success(res, { count }, "Open dispute count fetched");
};
