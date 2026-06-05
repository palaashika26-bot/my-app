import { resolveApiBaseUrl } from '@/lib/apiBase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const EXPRESS_BASE = resolveApiBaseUrl();

    const formData = await req.formData();
    const authHeader = req.headers.get('authorization') || '';

    const response = await fetch(`${EXPRESS_BASE}/products/import-csv`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error('[import-csv proxy error]', err);
    return NextResponse.json(
      { success: false, error: 'Proxy error connecting to backend' },
      { status: 500 }
    );
  }
}
