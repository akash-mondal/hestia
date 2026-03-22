'use client';

import StatusPill from '@/components/shared/status-pill';
import ParameterBar from '@/components/shared/parameter-bar';
import { formatDateTime } from '@/lib/utils';
import type { ComplianceEvaluation } from '@/types';

interface ComplianceHistoryProps {
  evaluations: ComplianceEvaluation[];
}

export default function ComplianceHistory({ evaluations }: ComplianceHistoryProps) {
  const sorted = [...evaluations].sort(
    (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sorted.map((e) => {
        const status = e.overallCompliant ? 'compliant' : e.criticalViolationCount > 0 ? 'violation' : 'warning';
        return (
          <div key={e.evaluationId} className="card p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <StatusPill status={status} />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {formatDateTime(e.evaluatedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {e.tokenAction === 'mint_ggcc' && (
                  <span className="pill pill-compliant">GGCC Minted</span>
                )}
                {e.tokenAction === 'mint_violation_nft' && (
                  <span className="pill pill-violation">ZVIOL Issued</span>
                )}
                {e.tokenAction === 'pending_review' && (
                  <span className="pill pill-warning">Pending Review</span>
                )}
              </div>
            </div>

            {/* Per-parameter compliance flags */}
            <div className="grid grid-cols-6 gap-3">
              {[
                { label: 'pH', compliant: e.pH_compliant, value: e.pH_value },
                { label: 'BOD', compliant: e.BOD_compliant, value: e.BOD_value },
                { label: 'COD', compliant: e.COD_compliant, value: e.COD_value },
                { label: 'TSS', compliant: e.TSS_compliant, value: e.TSS_value },
                { label: 'Temp', compliant: e.temp_compliant, value: e.temp_value },
                { label: 'Cr', compliant: e.chromium_compliant, value: e.chromium_value },
              ].map((p) => (
                <div
                  key={p.label}
                  className="text-center p-2 rounded-md border"
                  style={{
                    background: p.compliant ? 'var(--compliant-bg)' : 'var(--violation-bg)',
                    borderColor: p.compliant ? 'var(--compliant-border)' : 'var(--violation-border)',
                  }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: p.compliant ? 'var(--compliant)' : 'var(--violation)' }}>
                    {p.label}
                  </div>
                  <div className="text-sm font-mono font-bold"
                    style={{ color: p.compliant ? 'var(--compliant)' : 'var(--violation)' }}>
                    {p.value.toFixed(p.label === 'pH' || p.label === 'Cr' ? 1 : 0)}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-[11px]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-disabled)' }}>
              <span>Limits: {e.limitsSource.replace('_', ' ')} {e.isZLD ? '(ZLD)' : ''}</span>
              <span>{e.violationCount} violation{e.violationCount !== 1 ? 's' : ''} | {e.criticalViolationCount} critical</span>
              <span className="font-mono">{e.evaluationId.slice(0, 16)}...</span>
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div className="card p-8 text-center">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No compliance evaluations for this facility
          </span>
        </div>
      )}
    </div>
  );
}
