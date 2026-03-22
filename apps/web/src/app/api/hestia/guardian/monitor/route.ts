import { NextResponse } from 'next/server';
import { fetchValidations } from '@/lib/hestia-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const validations = await fetchValidations();
    return NextResponse.json(validations);
  } catch (error) {
    console.error('Hestia monitor fetch error:', error);
    return NextResponse.json([], { status: 502 });
  }
}
