import { NextResponse } from 'next/server';
import { fetchSites } from '@/lib/hestia-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sites, raw } = await fetchSites();
    // Return raw documents so client can access _id for approval
    return NextResponse.json(raw);
  } catch (error) {
    console.error('Hestia sites fetch error:', error);
    return NextResponse.json([], { status: 502 });
  }
}
