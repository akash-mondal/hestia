import { NextResponse } from 'next/server';
import { RISK_ORACLE_ADDRESS, HEDERA_JSON_RPC_URL } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

// ABI-encoded function signatures
const CALCULATE_RISK_SIG = '0x'; // We'll use eth_call with encoded data

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fuel = Number(searchParams.get('fuel') || 20);
  const slope = Number(searchParams.get('slope') || 12);
  const wui = Number(searchParams.get('wui') || 16);
  const access = Number(searchParams.get('access') || 8);
  const historical = Number(searchParams.get('historical') || 8);
  const weather = Number(searchParams.get('weather') || 14);

  // Calculate locally (same logic as contract — pure function)
  const total = fuel + slope + wui + access + historical + weather;
  let category = 'Low';
  if (total > 75) category = 'Extreme';
  else if (total > 50) category = 'High';
  else if (total > 25) category = 'Moderate';

  return NextResponse.json({
    total,
    category,
    components: { fuel, slope, wui, access, historical, weather },
    contractAddress: RISK_ORACLE_ADDRESS,
    source: 'local_calculation',
  });
}
