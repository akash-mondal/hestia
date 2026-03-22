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

  // Fallback: realistic Sierra Nevada fire season demo data
  // 18 detections across the Northern California wildfire corridor
  return NextResponse.json({
    bbox,
    days: Number(days),
    count: 18,
    fires: [
      // Tahoe Donner cluster (3 hotspots — the site we're protecting)
      { latitude: 39.342, longitude: -120.238, brightness: 330, confidence: 'high',    frp: 22.4, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 39.338, longitude: -120.225, brightness: 318, confidence: 'high',    frp: 18.7, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 39.348, longitude: -120.245, brightness: 305, confidence: 'nominal', frp: 11.2, acq_date: '2026-03-21', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      // Donner Pass / I-80 corridor (4 hotspots)
      { latitude: 39.315, longitude: -120.320, brightness: 345, confidence: 'high',    frp: 34.8, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 39.308, longitude: -120.305, brightness: 338, confidence: 'high',    frp: 29.1, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 39.322, longitude: -120.290, brightness: 312, confidence: 'nominal', frp: 14.5, acq_date: '2026-03-20', acq_time: '0645', satellite: 'VIIRS_SNPP' },
      { latitude: 39.295, longitude: -120.340, brightness: 302, confidence: 'nominal', frp: 8.3,  acq_date: '2026-03-20', acq_time: '0645', satellite: 'VIIRS_SNPP' },
      // North Lake Tahoe (3 hotspots)
      { latitude: 39.250, longitude: -120.050, brightness: 355, confidence: 'high',    frp: 42.6, acq_date: '2026-03-21', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      { latitude: 39.240, longitude: -120.030, brightness: 342, confidence: 'high',    frp: 36.1, acq_date: '2026-03-21', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      { latitude: 39.260, longitude: -120.070, brightness: 308, confidence: 'nominal', frp: 10.9, acq_date: '2026-03-20', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      // Foresthill / Auburn (2 hotspots — downhill spread)
      { latitude: 39.010, longitude: -120.820, brightness: 348, confidence: 'high',    frp: 38.4, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 38.980, longitude: -120.790, brightness: 325, confidence: 'high',    frp: 21.7, acq_date: '2026-03-20', acq_time: '0645', satellite: 'VIIRS_SNPP' },
      // Placerville / El Dorado (2 hotspots)
      { latitude: 38.730, longitude: -120.780, brightness: 316, confidence: 'nominal', frp: 15.8, acq_date: '2026-03-20', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      { latitude: 38.750, longitude: -120.750, brightness: 310, confidence: 'nominal', frp: 12.3, acq_date: '2026-03-19', acq_time: '0645', satellite: 'VIIRS_SNPP' },
      // Yuba / Nevada City (2 hotspots — north of I-80)
      { latitude: 39.420, longitude: -121.050, brightness: 340, confidence: 'high',    frp: 31.5, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 39.395, longitude: -121.020, brightness: 322, confidence: 'high',    frp: 19.8, acq_date: '2026-03-20', acq_time: '1432', satellite: 'VIIRS_SNPP' },
      // South Lake Tahoe (2 hotspots)
      { latitude: 38.940, longitude: -120.010, brightness: 332, confidence: 'high',    frp: 25.3, acq_date: '2026-03-21', acq_time: '1430', satellite: 'VIIRS_SNPP' },
      { latitude: 38.920, longitude: -119.980, brightness: 306, confidence: 'nominal', frp: 9.7,  acq_date: '2026-03-19', acq_time: '1430', satellite: 'VIIRS_SNPP' },
    ],
    source: 'demo_fallback',
  });
}
