import { resolveApiBaseUrl } from '@/lib/apiBase';
import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = resolveApiBaseUrl();

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${EXPRESS_BASE}/disputes/count/open`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}
