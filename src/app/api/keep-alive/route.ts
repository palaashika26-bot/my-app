/**
 * GET /api/keep-alive
 *
 * Vercel Cron pings this route every 10 minutes (see vercel.json).
 * This route in turn pings the Render backend so the free dyno never
 * idles long enough to spin down (Render sleeps after ~15 minutes of
 * inactivity on the free tier).
 *
 * The endpoint is also callable manually for debugging:
 *   curl https://<your-vercel-domain>/api/keep-alive
 */

import { NextResponse } from "next/server";

const BACKEND_HEALTH_URL =
  process.env.BACKEND_HEALTH_URL ??
  "https://elios-server.onrender.com/health";

export const dynamic = "force-dynamic"; // never cache this route

export async function GET() {
  const start = Date.now();

  try {
    const res = await fetch(BACKEND_HEALTH_URL, {
      method: "GET",
      // Use a generous timeout — the Render cold-start can take ~10 s
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      console.error(
        `[keep-alive] Backend responded with ${res.status} after ${latencyMs} ms`
      );
      return NextResponse.json(
        {
          success: false,
          status: res.status,
          latencyMs,
          pingedUrl: BACKEND_HEALTH_URL,
        },
        { status: 502 }
      );
    }

    const body = await res.json().catch(() => null);
    console.log(`[keep-alive] ✓ Backend alive in ${latencyMs} ms`);

    return NextResponse.json({
      success: true,
      latencyMs,
      pingedUrl: BACKEND_HEALTH_URL,
      backendResponse: body,
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[keep-alive] ✗ Ping failed after ${latencyMs} ms:`, message);

    return NextResponse.json(
      {
        success: false,
        error: message,
        latencyMs,
        pingedUrl: BACKEND_HEALTH_URL,
      },
      { status: 503 }
    );
  }
}
