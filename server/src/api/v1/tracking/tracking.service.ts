import {
  addTrackingStage,
  getTrackingByOrder,
  deleteTrackingStage,
} from "./tracking.repository";

export const createTrackingStage = async (
  orderId: string,
  data: {
    stage: string;
    statusNote?: string;
    updatedBy: string;
    updatedAt: Date;
  }
) => addTrackingStage(orderId, data);

export const fetchTrackingByOrder = async (orderId: string) =>
  getTrackingByOrder(orderId);

export const removeTrackingStage = async (id: string) =>
  deleteTrackingStage(id);
