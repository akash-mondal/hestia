import { Coins, MapPin, TrendingDown, DollarSign } from 'lucide-react';
import { fetchSites, fetchAssessments, fetchInsurance, fetchWrcSupply } from '@/lib/hestia-api';
import { HASHSCAN_BASE, WRC_TOKEN_ID, TAGS } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import GuardianForm from '@/components/hestia/shared/guardian-form';
import RiskComparisonChart from '@/components/hestia/land-manager/risk-comparison-chart';
import type { HestiaStatCard } from '@/types/hestia';
import type { FieldConfig } from '@/components/hestia/shared/guardian-form';

export const dynamic = 'force-dynamic';

const SITE_FORM_FIELDS: FieldConfig[] = [
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-003' },
  { name: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'Tahoe Donner Unit 12' },
  { name: 'ownerEntity', label: 'Owner Entity', type: 'text', required: true, placeholder: 'Tahoe Donner Association' },
  { name: 'state', label: 'State', type: 'text', required: true, placeholder: 'California' },
  { name: 'county', label: 'County', type: 'text', required: true, placeholder: 'Nevada County' },
  { name: 'gpsLatitude', label: 'GPS Latitude', type: 'number', required: true, defaultValue: 39.3406 },
  { name: 'gpsLongitude', label: 'GPS Longitude', type: 'number', required: true, defaultValue: -120.2346 },
  { name: 'totalAcres', label: 'Total Acres', type: 'number', required: true, defaultValue: 640 },
  { name: 'wuiStructures', label: 'WUI Structures', type: 'number', required: true, defaultValue: 187 },
  { name: 'vegetationType', label: 'Vegetation Type', type: 'select', required: true, options: [
    { value: 'mixed conifer', label: 'Mixed Conifer' },
    { value: 'chaparral', label: 'Chaparral' },
    { value: 'grassland', label: 'Grassland' },
    { value: 'oak woodland', label: 'Oak Woodland' },
    { value: 'ponderosa pine', label: 'Ponderosa Pine' },
  ]},
  { name: 'riskScore', label: 'Current Risk Score (0-100)', type: 'number', required: true, defaultValue: 78 },
  { name: 'insurerName', label: 'Insurer', type: 'text', placeholder: 'Swiss Re' },
  { name: 'annualPremium', label: 'Annual Premium ($)', type: 'number', defaultValue: 285000 },
  { name: 'hederaAccount', label: 'Hedera Account', type: 'text', required: true, placeholder: '0.0.8316646' },
];

export default async function LandManagerPortal() {
  const [
    { sites },
    assessments,
    insurance,
    wrcSupply,
  ] = await Promise.all([
    fetchSites('verifier'),
    fetchAssessments('verifier'),
    fetchInsurance('verifier'),
    fetchWrcSupply(),
  ]);

  const avgReduction = assessments.length > 0
    ? (assessments.reduce((sum, a) => sum + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(1)
    : '0';

  const totalSavings = insurance.reduce((sum, i) => sum + Number(i.estimatedAnnualSavings), 0);

  const stats: HestiaStatCard[] = [
    {
      label: 'WRC Earned',
      value: (wrcSupply / 100).toLocaleString(),
      icon: Coins,
      glow: 'green',
      link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`,
      subtitle: 'Wildfire Resilience Credits',
    },
    {
      label: 'Sites Registered',
      value: sites.length,
      icon: MapPin,
      glow: 'amber',
      subtitle: 'Treatment-eligible sites',
    },
    {
      label: 'Avg Risk Reduction',
      value: `${avgReduction}%`,
      icon: TrendingDown,
      glow: 'teal',
      subtitle: 'Pre vs post treatment',
    },
    {
      label: 'Annual Savings',
      value: `$${totalSavings.toLocaleString()}`,
      icon: DollarSign,
      glow: 'green',
      subtitle: 'Insurance premium savings',
    },
  ];

  return (
    <div className="space-y-8">
      <HestiaStatsGrid stats={stats} />

      <RiskComparisonChart assessments={assessments} />

      <GuardianForm
        tag={TAGS.SITE_FORM}
        role="land-manager"
        fields={SITE_FORM_FIELDS}
        title="Register New Site"
        description="Register a wildfire resilience site for treatment and crediting. Submits a Verifiable Credential to Hedera."
      />
    </div>
  );
}
