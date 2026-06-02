import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function addStaff() {
  const passwordHash = await bcrypt.hash('Demo@1234', 10)

  const staffUsers = [
    {
      email: 'sourcing.staff@elioswholesale.in',
      firstName: 'Meera',
      lastName: 'Nair',
      phone: '+91-9876500001',
      staffRole: 'sourcing-logistics',
    },
    {
      email: 'warehouse.staff@elioswholesale.in',
      firstName: 'Vikram',
      lastName: 'Desai',
      phone: '+91-9876500002',
      staffRole: 'warehouse-qc',
    },
    {
      email: 'logistics.staff@elioswholesale.in',
      firstName: 'Rohit',
      lastName: 'Menon',
      phone: '+91-9876500003',
      staffRole: 'sourcing-logistics',
    },
    {
      email: 'qc.staff@elioswholesale.in',
      firstName: 'Ananya',
      lastName: 'Bose',
      phone: '+91-9876500004',
      staffRole: 'warehouse-qc',
    },
  ]

  for (const staff of staffUsers) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        passwordHash,
        isEmailVerified: true,
        isApproved: true,
        staffRole: staff.staffRole,
      },
      create: {
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        passwordHash,
        role: 'STAFF',
        staffRole: staff.staffRole,
        isEmailVerified: true,
        isApproved: true,
      },
    })
    console.log('Added:', staff.email)
  }

  await prisma.$disconnect()
  console.log('All staff added to Supabase!')
}

addStaff().catch(console.error)
