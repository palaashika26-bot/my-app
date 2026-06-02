import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emails = [
    "admin@elios.in",
    "staff1@elios.in",
    "client1@elios.in",
    "client2@elios.in",
  ];

  const result = await prisma.user.updateMany({
    where: { email: { in: emails } },
    data: {
      isEmailVerified: true,
      isApproved: true,
    },
  });

  console.log(`✅ Updated ${result.count} users (isEmailVerified=true, isApproved=true)`);

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, role: true, isEmailVerified: true, isApproved: true },
  });

  console.table(users);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
