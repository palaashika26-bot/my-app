import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function check() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, staffRole: true, isEmailVerified: true, isApproved: true, passwordHash: true }
  })
  users.forEach(u => {
    console.log(JSON.stringify({
      email: u.email,
      role: u.role,
      staffRole: u.staffRole,
      verified: u.isEmailVerified,
      approved: u.isApproved,
      hashPrefix: u.passwordHash.slice(0, 20)
    }))
  })
  await prisma.$disconnect()
}
check().catch(console.error)
