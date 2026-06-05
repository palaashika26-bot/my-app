import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// GET /api/staff-users — returns list of active STAFF users for admin dropdowns
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${EXPRESS_BASE}/admin/staff`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to reach API server' }, { status: 502 });
  }
}
