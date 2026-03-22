import { Flame, FileCheck, Coins, Satellite } from 'lucide-react';
import { fetchAssessments, fetchWrcSupply } from '@/lib/hestia-api';
import { HASHSCAN_BASE, WRC_TOKEN_ID, TAGS } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import GuardianForm from '@/components/hestia/shared/guardian-form';
import RiskMatrix from '@/components/hestia/verifier/risk-matrix';
import type { HestiaStatCard } from '@/types/hestia';
import type { FieldConfig } from '@/components/hestia/shared/guardian-form';

export const dynamic = 'force-dynamic';

const RISK_ASSESSMENT_FIELDS: FieldConfig[] = [
  { name: 'assessmentId', label: 'Assessment ID', type: 'text', required: true, placeholder: 'RA-TD-001-002' },
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-001' },
  { name: 'assessedAt', label: 'Assessed At', type: 'text', required: true, placeholder: '2026-03-22T12:00:00Z' },
  { name: 'preRisk', label: 'Pre-Treatment Risk (0-100)', type: 'number', required: true, defaultValue: 78 },
  { name: 'postRisk', label: 'Post-Treatment Risk (0-100)', type: 'number', required: true, defaultValue: 41 },
  { name: 'reduction', label: 'Risk Reduction %', type: 'number', required: true, defaultValue: 47.4 },
  { name: 'ndviPre', label: 'NDVI Pre', type: 'number', required: true, defaultValue: 0.72 },
  { name: 'ndviPost', label: 'NDVI Post', type: 'number', required: true, defaultValue: 0.38 },
  { name: 'nbrDelta', label: 'dNBR (Burn Severity)', type: 'number', required: true, defaultValue: 0.34 },
  { name: 'firmsHotspots', label: 'FIRMS Hotspot Count', type: 'number', required: true, defaultValue: 0 },
  { name: 'weatherRisk', label: 'Weather Risk (0-1)', type: 'number', required: true, defaultValue: 0.42 },
  { name: 'slopeRisk', label: 'Slope Risk (0-1)', type: 'number', required: true, defaultValue: 0.35 },
  { name: 'wuiDensity', label: 'WUI Density (0-1)', type: 'number', required: true, defaultValue: 0.29 },
  { name: 'verifiedAcres', label: 'Verified Acres (WRC Mint Amount)', type: 'number', required: true, defaultValue: 118.5 },
  { name: 'dataSources', label: 'Data Sources', type: 'text', required: true, defaultValue: 'FIRMS,Sentinel-2,LANDFIRE,NOAA' },
  { name: 'sentinelDate', label: 'Sentinel-2 Date', type: 'text', required: true, placeholder: '2026-03-10' },
  { name: 'compliant', label: 'Overall Compliant', type: 'boolean', required: true, defaultValue: true },
  { name: 'tokenAction', label: 'Token Action', type: 'select', required: true, options: [
    { value: 'mint_wrc', label: 'Mint WRC (triggers minting!)' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'none', label: 'None' },
  ]},
];

const INSURANCE_FIELDS: FieldConfig[] = [
  { name: 'impactId', label: 'Impact ID', type: 'text', required: true, placeholder: 'II-TD-001-002' },
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-001' },
  { name: 'assessedAt', label: 'Assessed At', type: 'text', required: true, placeholder: '2026-03-22T12:00:00Z' },
  { name: 'preRisk', label: 'Pre Risk Score', type: 'number', required: true, defaultValue: 78 },
  { name: 'postRisk', label: 'Post Risk Score', type: 'number', required: true, defaultValue: 41 },
  { name: 'premiumReduction', label: 'Premium Reduction %', type: 'number', required: true, defaultValue: 39.0 },
  { name: 'annualSavings', label: 'Annual Savings ($)', type: 'number', required: true, defaultValue: 111150 },
  { name: 'paramThreshold', label: 'Parametric Threshold (FIRMS)', type: 'number', required: true, defaultValue: 5 },
  { name: 'maxPayout', label: 'Max Payout ($)', type: 'number', defaultValue: 2500000 },
  { name: 'seeaStock', label: 'SEEA Stock Classification', type: 'text', required: true, defaultValue: 'Forest ecosystem (SEEA CF 4.1.1)' },
  { name: 'seeaFlow', label: 'SEEA Flow Type', type: 'text', required: true, defaultValue: 'Fire risk regulation' },
  { name: 'seeaValue', label: 'SEEA Monetary Value ($)', type: 'number', required: true, defaultValue: 111150 },
];

export default async function SatellitePortal() {
  const [assessments, wrcSupply] = await Promise.all([
    fetchAssessments('verifier'),
    fetchWrcSupply(),
  ]);

  const wrcMinted = assessments.filter(a => a.tokenAction === 'mint_wrc').length;

  const stats: HestiaStatCard[] = [
    { label: 'FIRMS Fires', value: 3, icon: Flame, glow: 'red', subtitle: 'California last 7 days' },
    { label: 'Assessments', value: assessments.length, icon: FileCheck, glow: 'amber', subtitle: 'Risk assessments submitted' },
    {
      label: 'WRC Triggered',
      value: (wrcSupply / 100).toLocaleString(),
      icon: Coins,
      glow: 'green',
      link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`,
      subtitle: 'Total WRC minted',
    },
    { label: 'Data Sources', value: 4, icon: Satellite, glow: 'teal', subtitle: 'FIRMS, Sentinel-2, LANDFIRE, NOAA' },
  ];

  return (
    <div className="space-y-8">
      <HestiaStatsGrid stats={stats} />

      <GuardianForm
        tag={TAGS.RISK_INTAKE}
        role="satellite"
        fields={RISK_ASSESSMENT_FIELDS}
        title="Submit Risk Assessment"
        description="Submit satellite-derived wildfire risk assessment. Setting tokenAction to 'mint_wrc' triggers WRC minting on Hedera."
      />

      <GuardianForm
        tag={TAGS.INSURANCE_INTAKE}
        role="satellite"
        fields={INSURANCE_FIELDS}
        title="Submit Insurance Impact"
        description="Submit SEEA monetary impact assessment with parametric insurance trigger thresholds."
      />

      <RiskMatrix sites={[]} assessments={assessments} />
    </div>
  );
}
