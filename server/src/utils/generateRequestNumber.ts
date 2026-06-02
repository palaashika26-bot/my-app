import prisma from "../config/prisma";

export async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.sourcingRequest.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `BK-REQ-${year}-${seq}`;
}
