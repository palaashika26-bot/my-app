import prisma from "../../../config/prisma";

const CNY_INR_RATE_KEY = "cny_inr_rate";
const DEFAULT_CNY_INR_RATE = 11.5;

// Short-lived in-memory cache so the rate isn't read from the DB on every
// quotation calculation. Invalidated on write (setExchangeRate).
let cachedRate: number | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getExchangeRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedRate;
  }
  const row = await prisma.setting.findUnique({ where: { key: CNY_INR_RATE_KEY } });
  const parsed = row ? parseFloat(row.value) : NaN;
  const rate = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CNY_INR_RATE;
  cachedRate = rate;
  cachedAt = now;
  return rate;
}

export async function setExchangeRate(rate: number): Promise<number> {
  const value = rate.toString();
  await prisma.setting.upsert({
    where: { key: CNY_INR_RATE_KEY },
    update: { value },
    create: { key: CNY_INR_RATE_KEY, value },
  });
  cachedRate = rate;
  cachedAt = Date.now();
  return rate;
}
