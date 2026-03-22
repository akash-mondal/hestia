import { NextResponse } from 'next/server';
import { fetchPlans } from '@/lib/hestia-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { plans } = await fetchPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Hestia plans fetch error:', error);
    return NextResponse.json([], { status: 502 });
  }
}
