/**
 * One-time admin setup script.
 *
 * Usage:
 *   npx ts-node prisma/createAdmin.ts
 *
 * Or set env vars before running:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=Secret123 npx ts-node prisma/createAdmin.ts
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      // Hide password input
      process.stdout.write(question);
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function handler(char: string) {
        if (char === "\n" || char === "\r" || char === "") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", handler);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (char === "") {
          process.exit();
        } else if (char === "") {
          // backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(question + "*".repeat(input.length));
          }
        } else {
          input += char;
          process.stdout.write("*");
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║       Elios — Admin Account Setup    ║");
  console.log("╚══════════════════════════════════════╝\n");

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, deletedAt: null },
    select: { email: true },
  });

  if (existingAdmin) {
    console.log(`✅  An admin account already exists: ${existingAdmin.email}`);
    console.log("    If you want to create another admin, that's fine — continuing.\n");
  }

  // Read values from env vars or prompt interactively
  const firstName =
    process.env.ADMIN_FIRST_NAME ||
    (await ask("First name : "));

  const lastName =
    process.env.ADMIN_LAST_NAME ||
    (await ask("Last name  : "));

  const email =
    process.env.ADMIN_EMAIL ||
    (await ask("Email      : "));

  const password =
    process.env.ADMIN_PASSWORD ||
    (await ask("Password   : ", true));

  // Validate
  if (!firstName || !lastName || !email || !password) {
    console.error("\n❌  All fields are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("\n❌  Password must be at least 8 characters.");
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("\n❌  Invalid email address.");
    process.exit(1);
  }

  // Check duplicate email
  const duplicate = await prisma.user.findUnique({ where: { email } });
  if (duplicate) {
    console.error(`\n❌  Email "${email}" is already registered.`);
    process.exit(1);
  }

  // Create admin
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: Role.ADMIN,
      isActive: true,
      isEmailVerified: true,
      isApproved: true,
    },
  });

  console.log("\n✅  Admin account created successfully!");
  console.log(`    Name  : ${admin.firstName} ${admin.lastName}`);
  console.log(`    Email : ${admin.email}`);
  console.log(`    Role  : ADMIN`);
  console.log("\n    You can now log in at /login with these credentials.\n");
}

main()
  .catch((e) => {
    console.error("\n❌  Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
