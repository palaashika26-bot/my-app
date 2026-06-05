import { resolveApiBaseUrl } from '@/lib/apiBase';
import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_BASE = resolveApiBaseUrl();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = req.headers.get('authorization') ?? '';

  try {
    const res = await fetch(`${EXPRESS_BASE}/tracking/stage/${id}`, {
      method: 'DELETE',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to reach API server' },
      { status: 502 }
    );
  }
}
