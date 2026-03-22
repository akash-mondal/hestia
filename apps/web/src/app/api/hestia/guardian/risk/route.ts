import { NextResponse } from 'next/server';
import { fetchAssessments } from '@/lib/hestia-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const assessments = await fetchAssessments();
    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Hestia risk fetch error:', error);
    return NextResponse.json([], { status: 502 });
  }
}
