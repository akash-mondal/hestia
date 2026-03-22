'use client';

import Link from 'next/link';
import StatusPill from '@/components/shared/status-pill';
import { DISCHARGE_LIMITS } from '@/lib/constants';
import type { FacilityRegistration, SensorReading, ComplianceEvaluation } from '@/types';

interface ComplianceMatrixProps {
  facilities: FacilityRegistration[];
  readings: SensorReading[];
  evaluations: ComplianceEvaluation[];
}

const PARAMS = [
  { key: 'pH', label: 'pH', evalKey: 'pH_compliant', valueKey: 'pH_value' },
  { key: 'BOD', label: 'BOD', evalKey: 'BOD_compliant', valueKey: 'BOD_value' },
  { key: 'COD', label: 'COD', evalKey: 'COD_compliant', valueKey: 'COD_value' },
  { key: 'TSS', label: 'TSS', evalKey: 'TSS_compliant', valueKey: 'TSS_value' },
  { key: 'Temp', label: 'Temp', evalKey: 'temp_compliant', valueKey: 'temp_value' },
  { key: 'Cr', label: 'Cr', evalKey: 'chromium_compliant', valueKey: 'chromium_value' },
] as const;

export default function ComplianceMatrix({ facilities, readings, evaluations }: ComplianceMatrixProps) {
  // Get latest evaluation per facility
  const latestEval = new Map<string, ComplianceEvaluation>();
  const sorted = [...evaluations].sort(
    (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
  );
  for (const e of sorted) {
    if (!latestEval.has(e.facilityId)) {
      latestEval.set(e.facilityId, e);
    }
  }

  // Compute per-parameter compliance rates across all facilities
  const paramRates: Record<string, { compliant: number; total: number }> = {};
  for (const p of PARAMS) {
    paramRates[p.key] = { compliant: 0, total: 0 };
  }
  for (const e of evaluations) {
    for (const p of PARAMS) {
      paramRates[p.key].total++;
      if (e[p.evalKey as keyof ComplianceEvaluation]) paramRates[p.key].compliant++;
    }
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          CPCB Schedule-VI Compliance Matrix
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
          {facilities.length} facilities &times; {PARAMS.length} parameters
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Facility</th>
              <th>Industry</th>
              {PARAMS.map(p => (
                <th key={p.key} className="text-center">{p.label}</th>
              ))}
              <th className="text-center">Overall</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => {
              const eval_ = latestEval.get(f.facilityId);
              return (
                <tr key={f.facilityId}>
                  <td>
                    <Link href={`/facilities/${f.facilityId}`} className="hover:underline"
                      style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>
                      {f.facilityId}
                    </Link>
                    <div className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-disabled)' }}>
                      {f.facilityName}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}>
                    {f.industryCategory}
                  </td>
                  {PARAMS.map(p => {
                    if (!eval_) {
                      return (
                        <td key={p.key} className="text-center">
                          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>—</span>
                        </td>
                      );
                    }
                    const compliant = eval_[p.evalKey as keyof ComplianceEvaluation] as boolean;
                    const value = eval_[p.valueKey as keyof ComplianceEvaluation] as number;
                    return (
                      <td key={p.key} className="text-center">
                        <div
                          className="inline-flex items-center justify-center w-14 h-7 rounded-md text-[11px] font-mono font-bold"
                          style={{
                            background: compliant ? 'var(--compliant-bg)' : 'var(--violation-bg)',
                            color: compliant ? 'var(--compliant)' : 'var(--violation)',
                            border: `1px solid ${compliant ? 'var(--compliant-border)' : 'var(--violation-border)'}`,
                          }}
                        >
                          {value.toFixed(p.key === 'pH' || p.key === 'Cr' ? 1 : 0)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-center">
                    {eval_ ? (
                      <StatusPill status={eval_.overallCompliant ? 'compliant' : 'violation'} />
                    ) : (
                      <StatusPill status="pending" />
                    )}
                  </td>
                  <td className="text-center">
                    {eval_?.tokenAction === 'mint_ggcc' && <span className="pill pill-compliant">GGCC</span>}
                    {eval_?.tokenAction === 'mint_violation_nft' && <span className="pill pill-violation">ZVIOL</span>}
                    {eval_?.tokenAction === 'pending_review' && <span className="pill pill-warning">Review</span>}
                    {!eval_ && <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary row */}
          {evaluations.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)' }}>
                  Parameter Compliance Rate
                </td>
                {PARAMS.map(p => {
                  const { compliant, total } = paramRates[p.key];
                  const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
                  return (
                    <td key={p.key} className="text-center text-[11px] font-mono font-bold"
                      style={{ color: rate >= 80 ? 'var(--compliant)' : rate >= 50 ? 'var(--warning)' : 'var(--violation)' }}>
                      {rate}%
                    </td>
                  );
                })}
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
