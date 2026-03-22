import { NextRequest, NextResponse } from 'next/server';
import { SATELLITE_API_URL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  let apiPath = '/health';

  if (action === 'validate') {
    const facilityId = searchParams.get('facility_id');
    const tss = searchParams.get('ocems_tss_mg_l');
    apiPath = `/validate?facility_id=${facilityId}&ocems_tss_mg_l=${tss}`;
  } else if (action === 'water-quality') {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    apiPath = `/water-quality?lat=${lat}&lon=${lon}`;
  }

  try {
    const res = await fetch(`${SATELLITE_API_URL}${apiPath}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Satellite API returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Satellite API unreachable', status: 'unavailable' }, { status: 502 });
  }
}
