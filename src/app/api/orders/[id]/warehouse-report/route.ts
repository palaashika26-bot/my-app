import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get('authorization') ?? '';
  const qs = req.nextUrl.search; // forwards ?photos=false and any other params

  try {
    const res = await fetch(`${EXPRESS_BASE}/orders/${id}/warehouse-report${qs}`, {
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get('authorization') ?? '';
  const body = await req.json();

  try {
    const res = await fetch(`${EXPRESS_BASE}/orders/${id}/warehouse-report`, {
      method: 'PATCH',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}
