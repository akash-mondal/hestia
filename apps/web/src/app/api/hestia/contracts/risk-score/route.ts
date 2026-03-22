import { NextResponse } from 'next/server';
import { JsonRpcProvider, Contract } from 'ethers';
import { RISK_ORACLE_ADDRESS, HEDERA_JSON_RPC_URL } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

const ABI = [
  'function calculateRisk(tuple(uint8 fuel, uint8 slope, uint8 wui, uint8 access, uint8 historical, uint8 weather)) pure returns (uint8 total, string category)',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fuel = Number(searchParams.get('fuel') || 20);
  const slope = Number(searchParams.get('slope') || 12);
  const wui = Number(searchParams.get('wui') || 16);
  const access = Number(searchParams.get('access') || 8);
  const historical = Number(searchParams.get('historical') || 8);
  const weather = Number(searchParams.get('weather') || 14);

  // Try REAL eth_call to deployed contract
  try {
    const provider = new JsonRpcProvider(HEDERA_JSON_RPC_URL);
    const contract = new Contract(RISK_ORACLE_ADDRESS, ABI, provider);
    const result = await contract.calculateRisk({ fuel, slope, wui, access, historical, weather });
    const total = Number(result.total);
    const category = result.category;

    return NextResponse.json({
      total,
      category,
      components: { fuel, slope, wui, access, historical, weather },
      contractAddress: RISK_ORACLE_ADDRESS,
      source: 'hedera_testnet',
    });
  } catch (err) {
    console.error('RiskScoreOracle eth_call failed, using local fallback:', err);
  }

  // Fallback: same logic as contract (pure function)
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
    source: 'local_fallback',
  });
}
