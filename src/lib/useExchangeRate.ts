'use client';
import { useEffect, useState } from 'react';
import { settingsApi } from './api/settings.api';

// Fallback used until the real rate loads (and if the request fails). Matches the
// DB seed for the cny_inr_rate setting.
export const DEFAULT_CNY_INR_RATE = 11.5;

// Module-level cache shared across every component on the page, so the rate is
// fetched once per page session rather than per render or per component.
let cachedRate: number | null = null;
let inFlight: Promise<number> | null = null;

function fetchRate(): Promise<number> {
  if (cachedRate !== null) return Promise.resolve(cachedRate);
  if (inFlight) return inFlight;
  inFlight = settingsApi
    .getExchangeRate()
    .then((r) => {
      const rate = Number(r.data?.data?.rate);
      cachedRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_CNY_INR_RATE;
      return cachedRate;
    })
    .catch(() => DEFAULT_CNY_INR_RATE)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

// Clear the cache so the next reader re-fetches (e.g. after an admin updates it).
export function invalidateExchangeRate(): void {
  cachedRate = null;
  inFlight = null;
}

// Returns the current CNY→INR rate, defaulting to DEFAULT_CNY_INR_RATE until the
// fetch resolves. Components re-render once the real value arrives.
export function useExchangeRate(): number {
  const [rate, setRate] = useState<number>(cachedRate ?? DEFAULT_CNY_INR_RATE);

  useEffect(() => {
    let active = true;
    fetchRate().then((r) => {
      if (active) setRate(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return rate;
}
