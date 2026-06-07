import {
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Never seed demo data into a production database.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌ Refusing to seed: NODE_ENV=production. The seed script is for local/dev only."
    );
    process.exit(1);
  }

  // Password is taken from SEED_PASSWORD; if unset, a strong random one is
  // generated and printed below. No credentials are hardcoded in source.
  const seedPassword =
    process.env.SEED_PASSWORD || crypto.randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  console.log(
    `\n🔑 Seed user password: ${seedPassword}\n   (set SEED_PASSWORD to choose your own)\n`
  );

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
    void staffUser;

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
    await tx.product.upsert({
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

    await tx.product.upsert({
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

  },
  { timeout: 30000 }
  );

  console.log("✅ Seed completed successfully");
  console.log(
    "   2 users (admin + staff) | 3 suppliers | 5 categories | 4 products"
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
