import { NextResponse } from 'next/server';
import { JsonRpcProvider, Contract } from 'ethers';
import { INSURANCE_CALC_ADDRESS, HEDERA_JSON_RPC_URL, DISCOUNT_TIERS } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

const ABI = [
  'function calculateSavings(uint256 annualPremiumCents, uint256 wrcBalance, uint32 acreage) pure returns (uint256 savingsCents, uint16 discountBps, string tierName)',
  'function checkParametricTrigger(uint8 firmsHotspots, uint8 threshold) pure returns (bool triggered)',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wrcBalance = Number(searchParams.get('wrc') || 11850);
  const acreage = Number(searchParams.get('acreage') || 640);
  const annualPremium = Number(searchParams.get('premium') || 285000);
  const firmsHotspots = Number(searchParams.get('firms') || 0);

  if (acreage <= 0) {
    return NextResponse.json({ error: 'Acreage must be > 0' }, { status: 400 });
  }

  // Try REAL eth_call to deployed contract
  try {
    const provider = new JsonRpcProvider(HEDERA_JSON_RPC_URL);
    const contract = new Contract(INSURANCE_CALC_ADDRESS, ABI, provider);

    // calculateSavings expects cents
    const premiumCents = annualPremium * 100;
    const result = await contract.calculateSavings(premiumCents, wrcBalance, acreage);
    const savingsCents = Number(result.savingsCents);
    const discountBps = Number(result.discountBps);
    const tierName = result.tierName;

    // Also check parametric trigger
    let parametricTriggered = false;
    try {
      const triggerResult = await contract.checkParametricTrigger(firmsHotspots, 5);
      parametricTriggered = triggerResult;
    } catch { /* ignore */ }

    return NextResponse.json({
      wrcBalance,
      acreage,
      wrcPerAcre: Math.round((wrcBalance / 100) / acreage * 100) / 100,
      tierName,
      discountPercent: discountBps / 100,
      annualPremium,
      estimatedSavings: Math.round(savingsCents / 100),
      parametricTriggered,
      firmsHotspots,
      parametricThreshold: 5,
      contractAddress: INSURANCE_CALC_ADDRESS,
      source: 'hedera_testnet',
    });
  } catch (err) {
    console.error('InsurancePremiumCalculator eth_call failed, using local fallback:', err);
  }

  // Fallback: same logic as contract
  const wrcPerAcre = (wrcBalance / 100) / acreage;
  let tierName = 'None';
  let discount = 0;
  for (let i = DISCOUNT_TIERS.length - 1; i >= 0; i--) {
    if (wrcPerAcre >= DISCOUNT_TIERS[i].minWrc) {
      tierName = DISCOUNT_TIERS[i].name;
      discount = DISCOUNT_TIERS[i].discount;
      break;
    }
  }
  const savings = annualPremium * (discount / 100);

  return NextResponse.json({
    wrcBalance,
    acreage,
    wrcPerAcre: Math.round(wrcPerAcre * 100) / 100,
    tierName,
    discountPercent: discount,
    annualPremium,
    estimatedSavings: Math.round(savings),
    parametricTriggered: firmsHotspots >= 5,
    firmsHotspots,
    parametricThreshold: 5,
    contractAddress: INSURANCE_CALC_ADDRESS,
    source: 'local_fallback',
  });
}
