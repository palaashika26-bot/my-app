import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fix() {
  const passwordHash = await bcrypt.hash('Demo@1234', 10)

  const emails = [
    'client1@elios.in',
    'client2@elios.in',
    'admin@elios.in',
    'staff1@elios.in'
  ]

  for (const email of emails) {
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        isEmailVerified: true,
        isApproved: true
      }
    })
    console.log('Fixed:', email)
  }

  await prisma.$disconnect()
  console.log('All users fixed!')
}

fix().catch(console.error)
