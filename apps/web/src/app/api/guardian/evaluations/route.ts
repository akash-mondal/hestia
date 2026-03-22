import { NextResponse } from 'next/server';
import { fetchEvaluations } from '@/lib/api';

export async function GET() {
  try {
    const evaluations = await fetchEvaluations();
    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Failed to fetch evaluations:', error);
    return NextResponse.json([], { status: 502 });
  }
}
