import { NextResponse } from 'next/server';
import { FIRE_SATELLITE_API_URL } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox') || '-122,37,-118,41'; // California default
  const days = searchParams.get('days') || '7';

  try {
    const res = await fetch(`${FIRE_SATELLITE_API_URL}/active-fires?bbox=${bbox}&days=${days}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // Satellite API not running — return demo data
  }

  // Fallback: California fire season demo data
  return NextResponse.json({
    bbox,
    days: Number(days),
    count: 3,
    fires: [
      { latitude: 39.34, longitude: -120.23, brightness: 310, confidence: 'nominal', frp: 12.5, acq_date: '2026-03-20', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 38.91, longitude: -121.08, brightness: 340, confidence: 'high', frp: 28.3, acq_date: '2026-03-20', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      { latitude: 34.05, longitude: -118.56, brightness: 305, confidence: 'nominal', frp: 8.1, acq_date: '2026-03-19', acq_time: '0645', satellite: 'VIIRS_SNPP' },
    ],
    source: 'demo_fallback',
  });
}
