import { NextResponse } from 'next/server';
import { fetchSites } from '@/lib/hestia-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sites } = await fetchSites();
    return NextResponse.json(sites);
  } catch (error) {
    console.error('Hestia sites fetch error:', error);
    return NextResponse.json([], { status: 502 });
  }
}
