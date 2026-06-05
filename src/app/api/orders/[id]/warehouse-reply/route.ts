import { resolveApiBaseUrl } from '@/lib/apiBase';
import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = resolveApiBaseUrl();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get('authorization') ?? '';
  const body = await req.json();

  try {
    const res = await fetch(`${EXPRESS_BASE}/orders/${id}/warehouse-reply`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}
