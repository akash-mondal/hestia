import { NextResponse } from 'next/server';
import { fetchRegistrations } from '@/lib/api';

export async function GET() {
  try {
    const registrations = await fetchRegistrations();
    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Failed to fetch registrations:', error);
    return NextResponse.json([], { status: 502 });
  }
}
