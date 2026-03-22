import { NextResponse } from 'next/server';
import { INSURANCE_CALC_ADDRESS, DISCOUNT_TIERS } from '@/lib/hestia-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wrcBalance = Number(searchParams.get('wrc') || 11850);
  const acreage = Number(searchParams.get('acreage') || 640);
  const annualPremium = Number(searchParams.get('premium') || 285000);

  if (acreage <= 0) {
    return NextResponse.json({ error: 'Acreage must be > 0' }, { status: 400 });
  }

  // Same logic as InsurancePremiumCalculator contract (pure function)
  const wrcPerAcre = (wrcBalance / 100) / acreage; // WRC has 2 decimals

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
    contractAddress: INSURANCE_CALC_ADDRESS,
    source: 'local_calculation',
  });
}
