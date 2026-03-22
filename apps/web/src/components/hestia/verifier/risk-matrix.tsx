'use client';

import { getRiskTier, RISK_COMPONENTS } from '@/lib/hestia-constants';
import type { SiteRegistration, RiskAssessment } from '@/types/hestia';

interface RiskMatrixProps {
  sites: SiteRegistration[];
  assessments: RiskAssessment[];
}

export default function RiskMatrix({ sites, assessments }: RiskMatrixProps) {
  // Build lookup: siteId → latest assessment
  const assessmentMap = new Map<string, RiskAssessment>();
  assessments.forEach(a => assessmentMap.set(a.siteId, a));

  if (sites.length === 0 && assessments.length === 0) {
    return (
      <div className="card animate-fade-in stagger-4 p-8 text-center">
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No risk data available yet</p>
      </div>
    );
  }

  // Use assessments directly if sites are empty
  const rows = assessments.length > 0 ? assessments : [];

  return (
    <div className="card animate-fade-in stagger-4">
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Risk Assessment Matrix
        </h3>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          6-component wildfire risk scoring across all assessed sites
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-[10px]">Site</th>
              <th className="text-center px-3 py-3 text-[10px]">Pre</th>
              <th className="text-center px-3 py-3 text-[10px]">Post</th>
              <th className="text-center px-3 py-3 text-[10px]">Reduction</th>
              <th className="text-center px-3 py-3 text-[10px]">NDVI</th>
              <th className="text-center px-3 py-3 text-[10px]">FIRMS</th>
              <th className="text-center px-3 py-3 text-[10px]">Acres</th>
              <th className="text-center px-3 py-3 text-[10px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const preTier = getRiskTier(Number(a.preFireRiskScore));
              const postTier = getRiskTier(Number(a.postFireRiskScore));
              return (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{a.siteId}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{ color: preTier.color, background: preTier.bg }}>
                      {a.preFireRiskScore}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                      style={{ color: postTier.color, background: postTier.bg }}>
                      {a.postFireRiskScore}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--compliant)' }}>
                    {a.riskReductionPercent}%
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                    {a.ndviPreTreatment} → {a.ndviPostTreatment}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                    {a.firmsHotspotCount}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] font-medium">
                    {a.verifiedAcres}
                  </td>
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
  );
}
