'use client';

import { useState } from 'react';
import { Flame, TreePine, Shovel, ArrowRight, ExternalLink, Send, CheckCircle2 } from 'lucide-react';
import { HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, TAGS, getRiskTier } from '@/lib/hestia-constants';
import { useGuardianSubmit } from '@/components/hestia/shared/use-guardian-submit';
import HashScanProof from '@/components/hestia/shared/hashscan-proof';
import RiskTierBadge from '@/components/hestia/shared/risk-tier-badge';
import DanielFrameworkBanner from '@/components/hestia/shared/daniel-framework-banner';
import type { TreatmentPlan, TreatmentReport, RiskAssessment } from '@/types/hestia';

interface OperatorWorkspaceProps {
  plans: TreatmentPlan[];
  reports: TreatmentReport[];
  assessments: RiskAssessment[];
}

const TREATMENT_TYPES = [
  { value: 'prescribed_burn', label: 'Prescribed Burn', icon: Flame, color: '#EA580C' },
  { value: 'mechanical_thinning', label: 'Mechanical Thinning', icon: TreePine, color: '#059669' },
  { value: 'defensible_space', label: 'Defensible Space', icon: Shovel, color: '#3B82F6' },
  { value: 'fuel_break', label: 'Fuel Break', icon: ArrowRight, color: '#D97706' },
];

const PIPELINE = [
  { label: 'Plan Submitted', color: '#D97706' },
  { label: 'Approved', color: '#6366F1' },
  { label: 'Treatment Done', color: '#059669' },
  { label: 'Risk Assessed', color: '#3B82F6' },
  { label: 'WRC Minted', color: '#EA580C' },
];

export default function OperatorWorkspace({ plans, reports, assessments }: OperatorWorkspaceProps) {
  const [selectedType, setSelectedType] = useState('prescribed_burn');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const planSubmit = useGuardianSubmit(TAGS.PLAN_FORM, 'operator');
  const reportSubmit = useGuardianSubmit(TAGS.REPORT_FORM, 'operator');

  const [planForm, setPlanForm] = useState({
    planId: `TP-TD-001-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    siteId: 'TD-001', acres: 120, start: '2026-04-01T08:00:00Z', end: '2026-04-05T17:00:00Z',
    fuelPre: 18.5, crewCert: 'CALFIRE-RX-2024-0847', permit: 'AQMD-BP-2026-0312', envClear: true,
  });

  const [reportForm, setReportForm] = useState({
    reportId: `TR-TD-001-${String(reports.length + 1).padStart(3, '0')}`,
    planId: plans[0]?.planId || 'TP-TD-001-Q1', siteId: 'TD-001',
    start: '2026-04-01T08:00:00Z', end: '2026-04-04T16:30:00Z',
    acres: 118.5, fuelPost: 4.2, reduction: 77.3, containment: true,
    temps: '[{"temp":95}]', photoHash: '', crewLead: 'J. Martinez',
  });

  const totalAcres = assessments.reduce((s, a) => s + Number(a.verifiedAcres), 0);
  const avgReduction = assessments.length > 0 ? (assessments.reduce((s, a) => s + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(0) : '0';
  const wrcCount = assessments.filter(a => a.tokenAction === 'mint_wrc').length;

  // Pipeline counts
  const pipelineCounts = [
    plans.length + assessments.length, // submitted
    assessments.length, // approved (assessed = was approved)
    reports.length, // treatment complete
    assessments.length, // risk assessed
    wrcCount, // minted
  ];

  return (
    <div className="space-y-6">
      <DanielFrameworkBanner />

      {/* ── Pipeline ── */}
      <div className="card p-5 animate-fade-in stagger-1">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Treatment Pipeline</h3>
        <div className="flex items-center gap-1">
          {PIPELINE.map((stage, i) => (
            <div key={stage.label} className="flex items-center flex-1">
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: `${stage.color}08`, border: `1px solid ${stage.color}20` }}>
                <div className="text-2xl font-bold font-mono" style={{ color: stage.color }}>{pipelineCounts[i]}</div>
                <div className="text-[8px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{stage.label}</div>
              </div>
              {i < PIPELINE.length - 1 && <ArrowRight size={12} className="shrink-0 mx-1" style={{ color: 'var(--text-muted)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Stats + Fuel Impact ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 card p-5 animate-fade-in stagger-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Crew Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Acres Treated</span>
                <span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{totalAcres.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Avg Fuel Reduction</span>
                <span className="font-mono font-medium" style={{ color: 'var(--compliant)' }}>{avgReduction}%</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>WRC Credits Earned</span>
                <a href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer"
                  className="font-mono font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  {wrcCount} <ExternalLink size={8} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 card p-5 animate-fade-in stagger-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Fuel Load Impact</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Before Treatment</span>
                <span className="font-mono font-medium" style={{ color: '#EA580C' }}>18.5 tons/acre</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                <div className="h-full rounded-full" style={{ width: '74%', background: 'linear-gradient(90deg, #EA580C, #FB923C)' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'var(--text-muted)' }}>After Treatment</span>
                <span className="font-mono font-medium" style={{ color: '#059669' }}>4.2 tons/acre</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                <div className="h-full rounded-full" style={{ width: '17%', background: 'linear-gradient(90deg, #059669, #34D399)' }} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Reduction</span>
              <span className="text-2xl font-mono font-bold" style={{ color: 'var(--compliant)' }}>77.3%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Treatment Type Selector + Plan Form ── */}
      <div className="card animate-fade-in stagger-4">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Treatment Plan</h3>
          <button onClick={() => setShowPlanForm(!showPlanForm)} className="text-[10px] font-mono px-2 py-1 rounded"
            style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
            {showPlanForm ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>
        {showPlanForm && (
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {TREATMENT_TYPES.map(tt => {
                const Icon = tt.icon;
                const active = selectedType === tt.value;
                return (
                  <button key={tt.value} onClick={() => setSelectedType(tt.value)}
                    className={`p-3 rounded-lg text-center transition-all ${active ? 'ring-2' : ''}`}
                    style={{ background: active ? `${tt.color}10` : 'var(--bg-muted)', outline: active ? `2px solid ${tt.color}` : 'none' }}>
                    <Icon size={18} className="mx-auto mb-1" style={{ color: active ? tt.color : 'var(--text-muted)' }} />
                    <div className="text-[10px] font-medium" style={{ color: active ? tt.color : 'var(--text-secondary)' }}>{tt.label}</div>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'siteId', label: 'Site ID' }, { key: 'acres', label: 'Planned Acres', type: 'number' },
                { key: 'crewCert', label: 'Crew Certification' }, { key: 'permit', label: 'Burn Permit' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                  <input type={f.type || 'text'} step="any" value={String((planForm as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setPlanForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <HashScanProof {...planSubmit} label="Treatment plan submitted to Hedera" />
              {!planSubmit.success && (
                <button onClick={() => planSubmit.submit({
                  field0: planForm.planId, field1: planForm.siteId, field2: selectedType,
                  field3: planForm.acres, field4: planForm.start, field5: planForm.end,
                  field6: planForm.fuelPre, field7: planForm.crewCert, field8: planForm.permit, field9: planForm.envClear,
                })} disabled={planSubmit.loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white mt-2 disabled:opacity-50"
                  style={{ background: 'var(--accent-gradient)' }}>
                  <Send size={14} /> Submit Treatment Plan to Guardian
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Completion Report ── */}
      <div className="card animate-fade-in stagger-5">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Completion Report</h3>
          <button onClick={() => setShowReportForm(!showReportForm)} className="text-[10px] font-mono px-2 py-1 rounded"
            style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
            {showReportForm ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>
        {showReportForm && (
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { key: 'siteId', label: 'Site ID' }, { key: 'acres', label: 'Treated Acres', type: 'number' },
                { key: 'reduction', label: 'Fuel Reduction %', type: 'number' },
                { key: 'fuelPost', label: 'Fuel Post (t/ac)', type: 'number' },
                { key: 'crewLead', label: 'Crew Lead' },
                { key: 'planId', label: 'Plan ID' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                  <input type={f.type || 'text'} step="any" value={String((reportForm as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setReportForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
                </div>
              ))}
            </div>

            {/* Containment Toggle (Cinderard concept) */}
            <div className="p-3 rounded-lg mb-3" style={{ background: reportForm.containment ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)', border: `1px solid ${reportForm.containment ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)'}` }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reportForm.containment} onChange={e => setReportForm(p => ({ ...p, containment: e.target.checked }))}
                  className="w-5 h-5 rounded accent-emerald-600" />
                <div>
                  <div className="text-xs font-semibold" style={{ color: reportForm.containment ? 'var(--compliant)' : 'var(--violation)' }}>
                    {reportForm.containment ? '✓ Containment Verified' : '✗ Containment NOT Verified'}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    Cinderard ground temperature confirmation — prescribed burn fully contained
                  </div>
                </div>
              </label>
            </div>

            <HashScanProof {...reportSubmit} label="Treatment report submitted to Hedera" />
            {!reportSubmit.success && (
              <button onClick={() => reportSubmit.submit({
                field0: reportForm.reportId, field1: reportForm.planId, field2: reportForm.siteId,
                field3: reportForm.start, field4: reportForm.end, field5: reportForm.acres,
                field6: reportForm.fuelPost, field7: reportForm.reduction, field8: reportForm.containment,
                field9: reportForm.temps, field10: reportForm.photoHash, field11: reportForm.crewLead,
              })} disabled={reportSubmit.loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--accent-gradient)' }}>
                <Send size={14} /> Submit Completion Report
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Treatment Results ── */}
      {assessments.length > 0 && (
        <div className="card animate-fade-in">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Treatment Results</h3>
            <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
              View all on HashScan <ExternalLink size={9} />
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
                  <th className="text-center px-3 py-3 text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={i} style={a.tokenAction === 'mint_wrc' ? { background: 'rgba(5,150,105,0.03)' } : {}}>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{a.siteId}</td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.preFireRiskScore)} size="sm" /></td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.postFireRiskScore)} size="sm" /></td>
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
