import { NextResponse } from 'next/server';
import { fetchReadings } from '@/lib/api';

export async function GET() {
  try {
    const readings = await fetchReadings();
    return NextResponse.json(readings);
  } catch (error) {
    console.error('Failed to fetch readings:', error);
    return NextResponse.json([], { status: 502 });
  }
}
