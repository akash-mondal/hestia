import { Flame, TreePine, TrendingDown, CheckCircle2 } from 'lucide-react';
import { fetchPlans, fetchAssessments } from '@/lib/hestia-api';
import { TAGS } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import GuardianForm from '@/components/hestia/shared/guardian-form';
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
  const [{ plans }, assessments] = await Promise.all([
    fetchPlans('verifier'),
    fetchAssessments('verifier'),
  ]);

  const totalAcres = assessments.reduce((s, a) => s + Number(a.verifiedAcres), 0);
  const avgReduction = assessments.length > 0
    ? (assessments.reduce((s, a) => s + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(1)
    : '0';

  const stats: HestiaStatCard[] = [
    { label: 'Active Treatments', value: plans.length, icon: Flame, glow: 'amber', subtitle: 'Plans in progress' },
    { label: 'Acres Treated', value: totalAcres.toLocaleString(), icon: TreePine, glow: 'green', subtitle: 'Verified treated acres' },
    { label: 'Avg Fuel Reduction', value: `${avgReduction}%`, icon: TrendingDown, glow: 'teal', subtitle: 'Across all treatments' },
    { label: 'Assessments', value: assessments.length, icon: CheckCircle2, glow: 'green', subtitle: 'Risk assessments completed' },
  ];

  return (
    <div className="space-y-8">
      <HestiaStatsGrid stats={stats} />

      <GuardianForm
        tag={TAGS.PLAN_FORM}
        role="operator"
        fields={PLAN_FIELDS}
        title="Submit Treatment Plan"
        description="Submit a fuel reduction treatment plan for verifier approval. Creates a Verifiable Credential on Hedera."
      />

      <GuardianForm
        tag={TAGS.REPORT_FORM}
        role="operator"
        fields={REPORT_FIELDS}
        title="Submit Treatment Report"
        description="Report completed treatment with ground truth measurements and containment verification (Cinderard concept)."
      />

      {/* Treatment History */}
      {assessments.length > 0 && (
        <div className="card animate-fade-in stagger-3">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Treatment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-[10px]">Site</th>
                  <th className="text-center px-3 py-3 text-[10px]">Pre Risk</th>
                  <th className="text-center px-3 py-3 text-[10px]">Post Risk</th>
                  <th className="text-center px-3 py-3 text-[10px]">Reduction</th>
                  <th className="text-center px-3 py-3 text-[10px]">Acres</th>
                  <th className="text-center px-3 py-3 text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{a.siteId}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]">{a.preFireRiskScore}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]">{a.postFireRiskScore}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--compliant)' }}>{a.riskReductionPercent}%</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px] font-medium">{a.verifiedAcres}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`pill ${a.tokenAction === 'mint_wrc' ? 'pill-compliant' : 'pill-warning'}`}>
                        {a.tokenAction === 'mint_wrc' ? 'WRC Minted' : a.tokenAction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
