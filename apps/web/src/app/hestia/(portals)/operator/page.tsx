import { ExternalLink, ArrowRight } from 'lucide-react';
import { fetchPlans, fetchAssessments, fetchReports } from '@/lib/hestia-api';
import { TAGS, HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, getRiskTier } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import GuardianForm from '@/components/hestia/shared/guardian-form';
import RiskComparisonChart from '@/components/hestia/land-manager/risk-comparison-chart';
import type { HestiaStatCard } from '@/types/hestia';
import type { FieldConfig } from '@/components/hestia/shared/guardian-form';

export const dynamic = 'force-dynamic';

const PLAN_FIELDS: FieldConfig[] = [
  { name: 'planId', label: 'Plan ID', type: 'text', required: true, placeholder: 'TP-TD-001-Q2' },
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-001' },
  { name: 'treatmentType', label: 'Treatment Type', type: 'select', required: true, options: [
    { value: 'prescribed_burn', label: 'Prescribed Burn' },
    { value: 'mechanical_thinning', label: 'Mechanical Thinning' },
    { value: 'defensible_space', label: 'Defensible Space' },
    { value: 'fuel_break', label: 'Fuel Break' },
  ]},
  { name: 'plannedAcres', label: 'Planned Acres', type: 'number', required: true, defaultValue: 120 },
  { name: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: '2026-04-01T08:00:00Z' },
  { name: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: '2026-04-05T17:00:00Z' },
  { name: 'fuelLoadPre', label: 'Fuel Load Pre (tons/acre)', type: 'number', required: true, defaultValue: 18.5 },
  { name: 'crewCert', label: 'Crew Certification', type: 'text', required: true, placeholder: 'CALFIRE-RX-2024-0847' },
  { name: 'burnPermit', label: 'Burn Permit Number', type: 'text', placeholder: 'AQMD-BP-2026-0312' },
  { name: 'envClearance', label: 'Environmental Clearance', type: 'boolean', required: true },
];

const REPORT_FIELDS: FieldConfig[] = [
  { name: 'reportId', label: 'Report ID', type: 'text', required: true, placeholder: 'TR-TD-001-002' },
  { name: 'planId', label: 'Plan ID', type: 'text', required: true, placeholder: 'TP-TD-001-Q2' },
  { name: 'siteId', label: 'Site ID', type: 'text', required: true, placeholder: 'TD-001' },
  { name: 'actualStart', label: 'Actual Start', type: 'text', required: true, placeholder: '2026-04-01T08:00:00Z' },
  { name: 'actualEnd', label: 'Actual End', type: 'text', required: true, placeholder: '2026-04-04T16:30:00Z' },
  { name: 'treatedAcres', label: 'Treated Acres', type: 'number', required: true, defaultValue: 118.5 },
  { name: 'fuelLoadPost', label: 'Fuel Post (tons/acre)', type: 'number', required: true, defaultValue: 4.2 },
  { name: 'fuelReduction', label: 'Fuel Reduction %', type: 'number', required: true, defaultValue: 77.3 },
  { name: 'containment', label: 'Containment Verified', type: 'boolean', required: true, defaultValue: true },
  { name: 'groundTemps', label: 'Ground Temps (JSON)', type: 'text', placeholder: '[{"temp":95}]' },
  { name: 'photoHash', label: 'Photo IPFS Hash', type: 'text', placeholder: 'QmYwAPJzv5CZ...' },
  { name: 'crewLead', label: 'Crew Lead', type: 'text', required: true, placeholder: 'J. Martinez' },
];

export default async function OperatorPortal() {
  const [{ plans }, assessments, reports] = await Promise.all([
    fetchPlans('verifier'),
    fetchAssessments('verifier'),
    fetchReports('verifier'),
  ]);

  const totalAcres = assessments.reduce((s, a) => s + Number(a.verifiedAcres), 0);
  const avgReduction = assessments.length > 0
    ? (assessments.reduce((s, a) => s + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(1) : '0';

  const stats: HestiaStatCard[] = [
    { label: 'Active Plans', value: plans.length, iconName: 'Flame', glow: 'amber', subtitle: 'Pending treatment plans' },
    { label: 'Acres Treated', value: totalAcres.toLocaleString(), iconName: 'TreePine', glow: 'green', subtitle: 'Satellite-verified' },
    { label: 'Avg Fuel Reduction', value: `${avgReduction}%`, iconName: 'TrendingDown', glow: 'teal', subtitle: 'Across all treatments' },
    { label: 'WRC Minted', value: assessments.filter(a => a.tokenAction === 'mint_wrc').length, iconName: 'CheckCircle2', glow: 'green',
      link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`, subtitle: 'Credits earned' },
  ];

  // Treatment lifecycle steps
  const LIFECYCLE = [
    { step: 'Plan Submitted', count: plans.length + assessments.length, color: '#D97706' },
    { step: 'Verifier Approved', count: assessments.length, color: '#6366F1' },
    { step: 'Treatment Complete', count: reports.length, color: '#059669' },
    { step: 'Risk Assessed', count: assessments.length, color: '#3B82F6' },
    { step: 'WRC Minted', count: assessments.filter(a => a.tokenAction === 'mint_wrc').length, color: '#EA580C' },
  ];

  return (
    <div className="space-y-6">
      <HestiaStatsGrid stats={stats} />

      {/* ── Treatment Lifecycle Pipeline ── */}
      <div className="card p-5 animate-fade-in stagger-2">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Treatment Lifecycle Pipeline</h3>
        <div className="flex items-center gap-1">
          {LIFECYCLE.map((stage, i) => (
            <div key={stage.step} className="flex items-center flex-1">
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: `${stage.color}10`, border: `1px solid ${stage.color}25` }}>
                <div className="text-xl font-bold font-mono" style={{ color: stage.color }}>{stage.count}</div>
                <div className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{stage.step}</div>
              </div>
              {i < LIFECYCLE.length - 1 && (
                <ArrowRight size={14} className="shrink-0 mx-1" style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Chart + HashScan Links ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <RiskComparisonChart assessments={assessments} />
        </div>
        <div className="col-span-2">
          {/* Fuel Reduction Highlight */}
          <div className="card p-5 animate-fade-in stagger-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Fuel Load Impact
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Before Treatment</span>
                  <span className="font-mono font-medium" style={{ color: '#EA580C' }}>18.5 tons/acre</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                  <div className="h-full rounded-full" style={{ width: '74%', background: 'linear-gradient(90deg, #EA580C, #FB923C)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>After Treatment</span>
                  <span className="font-mono font-medium" style={{ color: '#059669' }}>4.2 tons/acre</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                  <div className="h-full rounded-full" style={{ width: '17%', background: 'linear-gradient(90deg, #059669, #34D399)' }} />
                </div>
              </div>
              <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Fuel Reduction</span>
                <span className="text-2xl font-mono font-bold" style={{ color: 'var(--compliant)' }}>77.3%</span>
              </div>
            </div>
            <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
              View treatment VCs on HashScan <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Forms ── */}
      <GuardianForm tag={TAGS.PLAN_FORM} role="operator" fields={PLAN_FIELDS}
        title="Submit Treatment Plan"
        description="Submit a fuel reduction treatment plan for verifier approval. Creates a Verifiable Credential on Hedera." />

      <GuardianForm tag={TAGS.REPORT_FORM} role="operator" fields={REPORT_FIELDS}
        title="Submit Treatment Report"
        description="Report completed treatment with ground truth measurements and containment verification (Cinderard concept)." />

      {/* ── Treatment History ── */}
      {assessments.length > 0 && (
        <div className="card animate-fade-in stagger-4">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Treatment Results</h3>
            <a href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
              WRC on HashScan <ExternalLink size={9} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-[10px]">Site</th>
                  <th className="text-center px-3 py-3 text-[10px]">Pre</th>
                  <th className="text-center px-3 py-3 text-[10px]">Post</th>
                  <th className="text-center px-3 py-3 text-[10px]">Reduction</th>
                  <th className="text-center px-3 py-3 text-[10px]">Acres</th>
                  <th className="text-center px-3 py-3 text-[10px]">NDVI</th>
                  <th className="text-center px-3 py-3 text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => {
                  const preTier = getRiskTier(Number(a.preFireRiskScore));
                  const postTier = getRiskTier(Number(a.postFireRiskScore));
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{a.siteId}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono" style={{ color: preTier.color, background: preTier.bg }}>{a.preFireRiskScore}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono" style={{ color: postTier.color, background: postTier.bg }}>{a.postFireRiskScore}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--compliant)' }}>{a.riskReductionPercent}%</td>
                      <td className="px-3 py-2.5 text-center font-mono text-[11px] font-medium">{a.verifiedAcres}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-[10px]">{a.ndviPreTreatment}→{a.ndviPostTreatment}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`pill ${a.tokenAction === 'mint_wrc' ? 'pill-compliant' : 'pill-warning'}`}>
                          {a.tokenAction === 'mint_wrc' ? 'WRC' : a.tokenAction}
                        </span>
                      </td>
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
