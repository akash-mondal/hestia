import { NextRequest, NextResponse } from 'next/server';
import { MIRROR_NODE_URL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(`${MIRROR_NODE_URL}${path}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Mirror Node returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Mirror Node proxy error:', error);
    return NextResponse.json({ error: 'Mirror Node unreachable' }, { status: 502 });
  }
}
