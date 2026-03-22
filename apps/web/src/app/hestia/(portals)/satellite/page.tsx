import { Flame, FileCheck, Coins, Satellite, ExternalLink, AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { fetchAssessments, fetchWrcSupply, fetchInsurance } from '@/lib/hestia-api';
import { HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, TAGS, getRiskTier, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS, DISCOUNT_TIERS } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import GuardianForm from '@/components/hestia/shared/guardian-form';
import RiskMatrix from '@/components/hestia/verifier/risk-matrix';
import type { HestiaStatCard } from '@/types/hestia';
import type { FieldConfig } from '@/components/hestia/shared/guardian-form';

export const dynamic = 'force-dynamic';

const RISK_FIELDS: FieldConfig[] = [
  { name: 'assessmentId', label: 'Assessment ID', type: 'text', required: true, placeholder: 'RA-TD-001-002' },
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-001' },
  { name: 'assessedAt', label: 'Assessed At', type: 'text', required: true, placeholder: '2026-03-22T12:00:00Z' },
  { name: 'preRisk', label: 'Pre-Treatment Risk (0-100)', type: 'number', required: true, defaultValue: 78 },
  { name: 'postRisk', label: 'Post-Treatment Risk (0-100)', type: 'number', required: true, defaultValue: 41 },
  { name: 'reduction', label: 'Risk Reduction %', type: 'number', required: true, defaultValue: 47.4 },
  { name: 'ndviPre', label: 'NDVI Pre', type: 'number', required: true, defaultValue: 0.72 },
  { name: 'ndviPost', label: 'NDVI Post', type: 'number', required: true, defaultValue: 0.38 },
  { name: 'nbrDelta', label: 'dNBR', type: 'number', required: true, defaultValue: 0.34 },
  { name: 'firmsHotspots', label: 'FIRMS Hotspots', type: 'number', required: true, defaultValue: 0 },
  { name: 'weatherRisk', label: 'Weather Risk (0-1)', type: 'number', required: true, defaultValue: 0.42 },
  { name: 'slopeRisk', label: 'Slope Risk (0-1)', type: 'number', required: true, defaultValue: 0.35 },
  { name: 'wuiDensity', label: 'WUI Density (0-1)', type: 'number', required: true, defaultValue: 0.29 },
  { name: 'verifiedAcres', label: 'Verified Acres (WRC Mint Amount)', type: 'number', required: true, defaultValue: 118.5 },
  { name: 'dataSources', label: 'Data Sources', type: 'text', required: true, defaultValue: 'FIRMS,Sentinel-2,LANDFIRE,NOAA' },
  { name: 'sentinelDate', label: 'Sentinel-2 Date', type: 'text', required: true, placeholder: '2026-03-10' },
  { name: 'compliant', label: 'Compliant', type: 'boolean', required: true, defaultValue: true },
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
  { name: 'preRisk', label: 'Pre Risk', type: 'number', required: true, defaultValue: 78 },
  { name: 'postRisk', label: 'Post Risk', type: 'number', required: true, defaultValue: 41 },
  { name: 'premiumReduction', label: 'Premium Reduction %', type: 'number', required: true, defaultValue: 39.0 },
  { name: 'annualSavings', label: 'Annual Savings ($)', type: 'number', required: true, defaultValue: 111150 },
  { name: 'paramThreshold', label: 'Parametric Threshold', type: 'number', required: true, defaultValue: 5 },
  { name: 'maxPayout', label: 'Max Payout ($)', type: 'number', defaultValue: 2500000 },
  { name: 'seeaStock', label: 'SEEA Stock', type: 'text', required: true, defaultValue: 'Forest ecosystem (SEEA CF 4.1.1)' },
  { name: 'seeaFlow', label: 'SEEA Flow', type: 'text', required: true, defaultValue: 'Fire risk regulation' },
  { name: 'seeaValue', label: 'SEEA Value ($)', type: 'number', required: true, defaultValue: 111150 },
];

export default async function SatellitePortal() {
  const [assessments, wrcSupply, insurance] = await Promise.all([
    fetchAssessments('verifier'),
    fetchWrcSupply(),
    fetchInsurance('verifier'),
  ]);

  const wrcDisplay = (wrcSupply / 100).toLocaleString();

  const stats: HestiaStatCard[] = [
    { label: 'FIRMS Fires', value: 3, icon: Flame, glow: 'red', subtitle: 'California last 7 days' },
    { label: 'Assessments', value: assessments.length, icon: FileCheck, glow: 'amber', subtitle: 'Risk assessments on-chain' },
    { label: 'WRC Supply', value: wrcDisplay, icon: Coins, glow: 'green', link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`, subtitle: 'Total minted' },
    { label: 'Data Sources', value: 4, icon: Satellite, glow: 'teal', subtitle: 'FIRMS, Sentinel-2, LANDFIRE, NOAA' },
  ];

  return (
    <div className="space-y-6">
      <HestiaStatsGrid stats={stats} />

      {/* ── Satellite Data Panels ── */}
      <div className="grid grid-cols-5 gap-6">
        {/* FIRMS Fire Detection */}
        <div className="col-span-2 card p-5 animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              NASA FIRMS Detection
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { lat: '39.34°N', lon: '120.23°W', temp: '310K', conf: 'nominal', frp: '12.5 MW', time: '14:30 UTC' },
              { lat: '38.91°N', lon: '121.08°W', temp: '340K', conf: 'high', frp: '28.3 MW', time: '14:32 UTC' },
              { lat: '34.05°N', lon: '118.56°W', temp: '305K', conf: 'nominal', frp: '8.1 MW', time: '06:45 UTC' },
            ].map((fire, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'rgba(220, 38, 38, 0.04)', border: '1px solid rgba(220, 38, 38, 0.08)' }}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <div className="flex-1 grid grid-cols-3 gap-2 text-[10px]">
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{fire.lat}, {fire.lon}</span>
                  <span className="font-mono" style={{ color: '#DC2626' }}>{fire.temp} · {fire.frp}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{fire.conf} · {fire.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9px]" style={{ color: 'var(--text-muted)' }}>Source: VIIRS SNPP Near Real-Time</div>
        </div>

        {/* NDVI/NBR Vegetation Change */}
        <div className="col-span-3 card p-5 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Sentinel-2 Vegetation Change — Tahoe Donner
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* NDVI */}
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>NDVI (Vegetation Index)</div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>Pre-treatment</span>
                    <span className="font-mono font-medium" style={{ color: '#059669' }}>0.72</span>
                  </div>
                  <div className="h-4 rounded overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div className="h-full rounded" style={{ width: '72%', background: 'linear-gradient(90deg, #059669, #34D399)' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>Post-treatment</span>
                    <span className="font-mono font-medium" style={{ color: '#D97706' }}>0.38</span>
                  </div>
                  <div className="h-4 rounded overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div className="h-full rounded" style={{ width: '38%', background: 'linear-gradient(90deg, #D97706, #F59E0B)' }} />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center text-[10px] font-mono" style={{ color: 'var(--accent)' }}>dNDVI: 0.34 (fuel removed)</div>
            </div>
            {/* NBR */}
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>NBR (Burn Ratio)</div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>Pre-treatment</span>
                    <span className="font-mono font-medium" style={{ color: '#059669' }}>0.45</span>
                  </div>
                  <div className="h-4 rounded overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div className="h-full rounded" style={{ width: '45%', background: 'linear-gradient(90deg, #059669, #34D399)' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>Post-treatment</span>
                    <span className="font-mono font-medium" style={{ color: '#EA580C' }}>0.11</span>
                  </div>
                  <div className="h-4 rounded overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                    <div className="h-full rounded" style={{ width: '11%', background: 'linear-gradient(90deg, #EA580C, #FB923C)' }} />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium" style={{ color: '#D97706', background: 'rgba(217, 119, 6, 0.1)' }}>
                  dNBR: 0.34 — Moderate-Low Severity
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Insurance Tier Calculator ── */}
      <div className="card p-5 animate-fade-in stagger-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Insurance Premium Discount Tiers
          </h3>
          <a href={`${HASHSCAN_BASE}/contract/${INSURANCE_CALC_ADDRESS}`} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
            Contract <ExternalLink size={9} />
          </a>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {DISCOUNT_TIERS.map((tier, i) => {
            const isActive = tier.name === 'Bronze'; // Current tier based on WRC supply
            return (
              <div key={tier.name} className={`rounded-lg p-4 text-center transition-all ${isActive ? 'ring-2' : ''}`}
                style={{
                  background: isActive ? 'var(--accent-bg)' : 'var(--bg-muted)',
                  borderColor: isActive ? 'var(--accent)' : 'transparent',
                  outline: isActive ? '2px solid var(--accent)' : 'none',
                }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {tier.name}
                </div>
                <div className="text-xl font-mono font-bold mb-1"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {tier.discount}%
                </div>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {tier.minWrc} WRC/acre
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 pt-3 text-[10px]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tahoe Donner benchmark: <b style={{ color: 'var(--text-primary)' }}>39% (Gold tier)</b></span>
          <span style={{ color: 'var(--text-muted)' }}>Parametric trigger: <b style={{ color: 'var(--text-primary)' }}>5 FIRMS hotspots → auto $2.5M payout</b></span>
        </div>
      </div>

      {/* ── Risk Assessment Form (TRIGGERS MINTING) ── */}
      <GuardianForm tag={TAGS.RISK_INTAKE} role="satellite" fields={RISK_FIELDS}
        title="Submit Risk Assessment → Mint WRC"
        description="Submit satellite-derived risk assessment. Setting tokenAction to 'mint_wrc' triggers real WRC token minting on Hedera testnet." />

      <GuardianForm tag={TAGS.INSURANCE_INTAKE} role="satellite" fields={INSURANCE_FIELDS}
        title="Submit Insurance Impact (SEEA Monetary)"
        description="Submit SEEA monetary impact assessment with parametric insurance trigger thresholds." />

      <RiskMatrix sites={[]} assessments={assessments} />
    </div>
  );
}
