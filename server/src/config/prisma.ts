import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
  // Connection pool uses DATABASE_URL query params for configuration.
  // The DATABASE_URL should include ?pgbouncer=true&connection_limit=5
  // when connecting through the Supabase pooler.
});

export default prisma;
