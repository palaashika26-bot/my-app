import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(req: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params;
  const auth = req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${EXPRESS_BASE}/disputes/${disputeId}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params;
  const auth = req.headers.get('authorization') ?? '';
  const body = await req.json();

  try {
    const res = await fetch(`${EXPRESS_BASE}/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}
