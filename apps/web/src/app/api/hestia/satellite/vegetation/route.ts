import { NextResponse } from 'next/server';
import { FIRE_SATELLITE_API_URL } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat') || '39.3406';
  const lon = searchParams.get('lon') || '-120.2346';
  const preDate = searchParams.get('pre_date') || '2025-06-01';
  const postDate = searchParams.get('post_date') || '2026-03-01';

  try {
    const res = await fetch(
      `${FIRE_SATELLITE_API_URL}/vegetation-change?lat=${lat}&lon=${lon}&pre_date=${preDate}&post_date=${postDate}`,
      { signal: AbortSignal.timeout(60000) }
    );

    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // Satellite API not running
  }

  // Fallback: Tahoe Donner demo data
  return NextResponse.json({
    latitude: Number(lat),
    longitude: Number(lon),
    pre_date: preDate,
    post_date: postDate,
    pre_ndvi: 0.72,
    post_ndvi: 0.38,
    pre_nbr: 0.45,
    post_nbr: 0.11,
    dndvi: 0.34,
    dnbr: 0.34,
    burn_severity: 'Moderate-Low',
    image_found: true,
    source: 'demo_fallback',
  });
}
