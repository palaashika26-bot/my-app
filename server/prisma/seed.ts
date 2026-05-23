import {
  PrismaClient,
  Role,
  OrderStatus,
  InquiryStatus,
  QCStatus,
  ShipmentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(
    async (tx) => {
      // ── Users ────────────────────────────────────────────────────────────
    const adminUser = await tx.user.upsert({
      where: { email: "admin@elios.in" },
      update: {},
      create: {
        email: "admin@elios.in",
        passwordHash,
        firstName: "Arjun",
        lastName: "Mehta",
        phone: "+91-9876543210",
        role: Role.ADMIN,
      },
    });
    void adminUser;

    const staffUser = await tx.user.upsert({
      where: { email: "staff1@elios.in" },
      update: {},
      create: {
        email: "staff1@elios.in",
        passwordHash,
        firstName: "Priya",
        lastName: "Sharma",
        phone: "+91-9123456789",
        role: Role.STAFF,
      },
    });

    const clientUser1 = await tx.user.upsert({
      where: { email: "client1@elios.in" },
      update: {},
      create: {
        email: "client1@elios.in",
        passwordHash,
        firstName: "Rahul",
        lastName: "Gupta",
        phone: "+91-9988776655",
        role: Role.CLIENT,
      },
    });

    const clientUser2 = await tx.user.upsert({
      where: { email: "client2@elios.in" },
      update: {},
      create: {
        email: "client2@elios.in",
        passwordHash,
        firstName: "Sneha",
        lastName: "Patel",
        phone: "+91-9871234560",
        role: Role.CLIENT,
      },
    });

    // ── Clients ────────────────────────────────────────────────────────────
    const client1 = await tx.client.upsert({
      where: { userId: clientUser1.id },
      update: {},
      create: {
        userId: clientUser1.id,
        companyName: "Gupta Traders Pvt Ltd",
        gstin: "27AABCG1234F1Z5",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
    });

    const client2 = await tx.client.upsert({
      where: { userId: clientUser2.id },
      update: {},
      create: {
        userId: clientUser2.id,
        companyName: "Patel Enterprises",
        gstin: "24AABCP5678F1Z3",
        city: "Surat",
        state: "Gujarat",
        pincode: "395001",
      },
    });

    // ── Suppliers (no unique field in schema — findFirst + create) ─────────
    let supplier1 = await tx.supplier.findFirst({
      where: { companyName: "Shenzhen FastTech Co." },
    });
    if (!supplier1) {
      supplier1 = await tx.supplier.create({
        data: {
          companyName: "Shenzhen FastTech Co.",
          city: "Shenzhen",
          contactName: "Li Wei",
          contactEmail: "liwei@fasttech.cn",
          contactPhone: "+86-755-12345678",
          isVerified: true,
        },
      });
    }

    let supplier2 = await tx.supplier.findFirst({
      where: { companyName: "Guangzhou HomeGoods Ltd." },
    });
    if (!supplier2) {
      supplier2 = await tx.supplier.create({
        data: {
          companyName: "Guangzhou HomeGoods Ltd.",
          city: "Guangzhou",
          contactName: "Chen Fang",
          contactEmail: "chen@homegoods.cn",
          isVerified: true,
        },
      });
    }

    let supplier3 = await tx.supplier.findFirst({
      where: { companyName: "Yiwu SmallGoods Factory" },
    });
    if (!supplier3) {
      supplier3 = await tx.supplier.create({
        data: {
          companyName: "Yiwu SmallGoods Factory",
          city: "Yiwu",
          contactName: "Wang Lei",
          contactEmail: "wang@yiwugoods.cn",
          isVerified: false,
        },
      });
    }

    // ── Product Categories ─────────────────────────────────────────────────
    const catElectronics = await tx.productCategory.upsert({
      where: { slug: "electronics" },
      update: {},
      create: { name: "Electronics", slug: "electronics" },
    });

    const catHomeKitchen = await tx.productCategory.upsert({
      where: { slug: "home-kitchen" },
      update: {},
      create: { name: "Home & Kitchen", slug: "home-kitchen" },
    });

    const catPackaging = await tx.productCategory.upsert({
      where: { slug: "packaging" },
      update: {},
      create: { name: "Packaging Materials", slug: "packaging" },
    });

    const catMobileAcc = await tx.productCategory.upsert({
      where: { slug: "mobile-accessories" },
      update: {},
      create: {
        name: "Mobile Accessories",
        slug: "mobile-accessories",
        parentId: catElectronics.id,
      },
    });

    const catLED = await tx.productCategory.upsert({
      where: { slug: "led-lighting" },
      update: {},
      create: {
        name: "LED Lighting",
        slug: "led-lighting",
        parentId: catElectronics.id,
      },
    });

    // ── Products ───────────────────────────────────────────────────────────
    const prod1 = await tx.product.upsert({
      where: { slug: "usb-c-fast-charger-65w" },
      update: {},
      create: {
        name: "USB-C Fast Charger 65W",
        slug: "usb-c-fast-charger-65w",
        description:
          "65W GaN USB-C fast charger, universal compatibility, foldable plug, CE certified",
        unit: "PCS",
        moq: 100,
        basePrice: 45.0,
        currency: "CNY",
        supplierId: supplier1.id,
        categoryId: catMobileAcc.id,
        images: [],
        isActive: true,
      },
    });

    const prod2 = await tx.product.upsert({
      where: { slug: "led-strip-light-5m-rgb" },
      update: {},
      create: {
        name: "LED Strip Light 5m RGB",
        slug: "led-strip-light-5m-rgb",
        description:
          "5 meter RGB LED strip with remote, 300 LEDs, IP65 waterproof, 12V DC",
        unit: "PCS",
        moq: 50,
        basePrice: 28.5,
        currency: "CNY",
        supplierId: supplier1.id,
        categoryId: catLED.id,
        images: [],
        isActive: true,
      },
    });

    await tx.product.upsert({
      where: { slug: "ceramic-coffee-mug-set-6pcs" },
      update: {},
      create: {
        name: "Ceramic Coffee Mug Set 6pcs",
        slug: "ceramic-coffee-mug-set-6pcs",
        description:
          "Premium ceramic mugs 350ml each, dishwasher safe, gift box included",
        unit: "SET",
        moq: 200,
        basePrice: 38.0,
        currency: "CNY",
        supplierId: supplier2.id,
        categoryId: catHomeKitchen.id,
        images: [],
        isActive: true,
      },
    });

    await tx.product.upsert({
      where: { slug: "bubble-wrap-roll-50m" },
      update: {},
      create: {
        name: "Bubble Wrap Roll 50m",
        slug: "bubble-wrap-roll-50m",
        description:
          "50m x 1m bubble wrap roll, small bubbles 10mm, protective packaging",
        unit: "PCS",
        moq: 20,
        basePrice: 95.0,
        currency: "CNY",
        supplierId: supplier3.id,
        categoryId: catPackaging.id,
        images: [],
        isActive: true,
      },
    });

    // ── Order 1 — Delivered ────────────────────────────────────────────────
    const order1 = await tx.order.upsert({
      where: { orderNumber: "EL-2024-001" },
      update: {},
      create: {
        orderNumber: "EL-2024-001",
        clientId: client1.id,
        status: OrderStatus.DELIVERED,
        subtotalINR: 82500,
        shippingCostINR: 5000,
        taxINR: 0,
        totalINR: 87500,
      },
    });

    let orderItem1 = await tx.orderItem.findFirst({
      where: { orderId: order1.id, productId: prod1.id },
    });
    if (!orderItem1) {
      orderItem1 = await tx.orderItem.create({
        data: {
          orderId: order1.id,
          productId: prod1.id,
          supplierId: supplier1.id,
          quantity: 500,
          unitPriceCNY: 45.0,
          unitPriceINR: 15.0,
          totalINR: 7500,
        },
      });
    }

    await tx.shipment.upsert({
      where: { orderId: order1.id },
      update: {},
      create: {
        orderId: order1.id,
        trackingNumber: "CNSHP123456IN",
        carrier: "Blue Dart",
        status: ShipmentStatus.DELIVERED,
        dispatchedAt: thirtyDaysAgo,
        deliveredAt: tenDaysAgo,
      },
    });

    // ── Order 2 — QC Pending ───────────────────────────────────────────────
    const order2 = await tx.order.upsert({
      where: { orderNumber: "EL-2024-002" },
      update: {},
      create: {
        orderNumber: "EL-2024-002",
        clientId: client1.id,
        status: OrderStatus.QC_PENDING,
        subtotalINR: 40000,
        shippingCostINR: 3200,
        taxINR: 0,
        totalINR: 43200,
      },
    });

    let orderItem2 = await tx.orderItem.findFirst({
      where: { orderId: order2.id, productId: prod2.id },
    });
    if (!orderItem2) {
      orderItem2 = await tx.orderItem.create({
        data: {
          orderId: order2.id,
          productId: prod2.id,
          supplierId: supplier1.id,
          quantity: 300,
          unitPriceCNY: 28.5,
          unitPriceINR: 130.0,
          totalINR: 39000,
        },
      });
    }

    await tx.qualityCheck.upsert({
      where: { orderItemId: orderItem2.id },
      update: {},
      create: {
        orderItemId: orderItem2.id,
        checkedByUserId: staffUser.id,
        status: QCStatus.PENDING,
        notes: "Awaiting inspection at warehouse",
        images: [],
      },
    });

    // ── Inquiry ────────────────────────────────────────────────────────────
    const existingInquiry = await tx.inquiry.findFirst({
      where: { clientId: client2.id, productId: prod1.id },
    });
    if (!existingInquiry) {
      await tx.inquiry.create({
        data: {
          clientId: client2.id,
          productId: prod1.id,
          quantity: 1000,
          targetPricePerUnit: 12.5,
          status: InquiryStatus.QUOTED,
          staffNotes: "Quoted at ₹13/unit for 1000 pcs MOQ",
        },
      });
    }
  },
  { timeout: 30000 }
  );

  console.log("✅ Seed completed successfully");
  console.log(
    "   4 users | 2 clients | 3 suppliers | 5 categories | 4 products | 2 orders | 1 inquiry"
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
