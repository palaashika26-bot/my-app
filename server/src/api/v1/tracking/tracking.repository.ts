import prisma from "../../../config/prisma";

export async function addTrackingStage(
  orderId: string,
  data: {
    stage: string;
    statusNote?: string;
    updatedBy: string;
    updatedAt: Date;
  }
) {
  return prisma.tracking.create({
    data: { orderId, ...data },
  });
}

export async function getTrackingByOrder(orderId: string) {
  return prisma.tracking.findMany({
    where: { orderId },
    orderBy: { updatedAt: "asc" },
  });
}

export async function deleteTrackingStage(id: string) {
  return prisma.tracking.delete({ where: { id } });
}
