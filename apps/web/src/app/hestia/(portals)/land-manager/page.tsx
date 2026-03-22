import { Coins, MapPin, TrendingDown, DollarSign, ExternalLink, Shield, TreePine, Flame } from 'lucide-react';
import { fetchSites, fetchAssessments, fetchInsurance, fetchWrcSupply, fetchHcsMessageCount } from '@/lib/hestia-api';
import { HASHSCAN_BASE, WRC_TOKEN_ID, CERT_TOKEN_ID, INSTANCE_TOPIC_ID, TAGS, getRiskTier, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS } from '@/lib/hestia-constants';
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
  const [{ sites }, assessments, insurance, wrcSupply, hcsCount] = await Promise.all([
    fetchSites('verifier'),
    fetchAssessments('verifier'),
    fetchInsurance('verifier'),
    fetchWrcSupply(),
    fetchHcsMessageCount(),
  ]);

  const wrcDisplay = (wrcSupply / 100).toLocaleString();
  const avgReduction = assessments.length > 0
    ? (assessments.reduce((sum, a) => sum + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(1)
    : '0';
  const totalSavings = insurance.reduce((sum, i) => sum + Number(i.estimatedAnnualSavings), 0);

  const stats: HestiaStatCard[] = [
    { label: 'WRC Earned', value: wrcDisplay, icon: Coins, glow: 'green', link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`, subtitle: 'Wildfire Resilience Credits' },
    { label: 'Sites Registered', value: sites.length, icon: MapPin, glow: 'amber', subtitle: 'Treatment-eligible sites' },
    { label: 'Avg Risk Reduction', value: `${avgReduction}%`, icon: TrendingDown, glow: 'teal', subtitle: 'Pre vs post treatment' },
    { label: 'Annual Savings', value: `$${totalSavings.toLocaleString()}`, icon: DollarSign, glow: 'green', subtitle: 'Insurance premium savings' },
  ];

  return (
    <div className="space-y-6">
      <HestiaStatsGrid stats={stats} />

      {/* ── Asymmetric: Risk Chart (3/5) + On-Chain Proof Panel (2/5) ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <RiskComparisonChart assessments={assessments} />
        </div>
        <div className="col-span-2 space-y-4">
          {/* On-chain proof card */}
          <div className="card p-5 animate-fade-in stagger-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>On-Chain Verification</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'WRC Token', id: WRC_TOKEN_ID, type: 'token' as const },
                { label: 'CERT NFT', id: CERT_TOKEN_ID, type: 'token' as const },
                { label: 'HCS Topic', id: INSTANCE_TOPIC_ID, type: 'topic' as const },
                { label: 'Risk Oracle', id: RISK_ORACLE_ADDRESS, type: 'contract' as const },
                { label: 'Insurance Calc', id: INSURANCE_CALC_ADDRESS, type: 'contract' as const },
              ].map(item => (
                <a key={item.id} href={`${HASHSCAN_BASE}/${item.type}/${item.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                    {item.id.length > 16 ? item.id.slice(0, 8) + '...' + item.id.slice(-6) : item.id}
                    <ExternalLink size={9} />
                  </span>
                </a>
              ))}
            </div>
            <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hcsCount} HCS messages on Hedera Testnet</span>
            </div>
          </div>

          {/* Tahoe Donner highlight card */}
          <div className="card p-5 animate-fade-in stagger-3" style={{ background: 'var(--accent-surface)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TreePine size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Demo Site</span>
            </div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Tahoe Donner Unit 7</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                ['Acreage', '640'],
                ['WUI', '187 structures'],
                ['Pre-Risk', '78 (Extreme)'],
                ['Post-Risk', '41 (Moderate)'],
                ['Premium', '−39%'],
                ['Savings', '$111,150/yr'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="ml-1 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Site Registration Form ── */}
      <GuardianForm
        tag={TAGS.SITE_FORM}
        role="land-manager"
        fields={SITE_FORM_FIELDS}
        title="Register New Site"
        description="Register a wildfire resilience site for treatment and crediting. Submits a Verifiable Credential to Hedera."
      />

      {/* ── Sites Table ── */}
      {sites.length > 0 && (
        <div className="card animate-fade-in stagger-4">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Registered Sites</h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>All sites with Verifiable Credentials on Hedera</p>
            </div>
            <span className="pill pill-accent">{sites.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-[10px]">Site ID</th>
                  <th className="text-left px-3 py-3 text-[10px]">Name</th>
                  <th className="text-center px-3 py-3 text-[10px]">Acres</th>
                  <th className="text-center px-3 py-3 text-[10px]">WUI</th>
                  <th className="text-center px-3 py-3 text-[10px]">Risk</th>
                  <th className="text-left px-3 py-3 text-[10px]">State</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, i) => {
                  const tier = getRiskTier(Number(s.currentFireRiskScore));
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{s.siteId}</td>
                      <td className="px-3 py-2.5 text-[11px]">{s.siteName}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-[11px]">{s.totalAcres}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-[11px]">{s.wuiStructures}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium" style={{ color: tier.color, background: tier.bg }}>
                          {s.currentFireRiskScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">{s.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
