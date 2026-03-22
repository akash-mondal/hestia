'use client';

import { useState } from 'react';
import { Coins, BarChart3, FileText, ClipboardList, MapPin, Satellite, DollarSign, CheckCircle2, ChevronDown, ExternalLink } from 'lucide-react';
import { HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS, getRiskTier } from '@/lib/hestia-constants';
import type { SiteRegistration, RiskAssessment, InsuranceImpact } from '@/types/hestia';

interface TrustChainProps {
  sites: SiteRegistration[];
  assessments: RiskAssessment[];
  insurance: InsuranceImpact[];
}

interface TreeLevel {
  level: number;
  icon: typeof Coins;
  iconColor: string;
  title: string;
  subtitle: string;
  verified: boolean;
  fields: { label: string; value: string; mono?: boolean; link?: string }[];
}

export default function HestiaTrustChain({ sites, assessments, insurance }: TrustChainProps) {
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0]));
  const [expandAll, setExpandAll] = useState(false);

  const site = sites[0];
  const assessment = assessments[0];
  const impact = insurance[0];

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedLevels(new Set());
    } else {
      setExpandedLevels(new Set([0, 1, 2, 3, 4, 5, 6]));
    }
    setExpandAll(!expandAll);
  };

  const levels: TreeLevel[] = [
    {
      level: 1,
      icon: Coins,
      iconColor: '#F59E0B',
      title: 'WRC Token Mint',
      subtitle: 'Wildfire Resilience Credit — 1 WRC per verified treated acre',
      verified: true,
      fields: [
        { label: 'Token', value: `WRC (${WRC_TOKEN_ID})`, mono: true, link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}` },
        { label: 'Amount', value: assessment ? `${assessment.verifiedAcres} WRC` : '—', mono: true },
        { label: 'Type', value: 'Fungible (HTS)', mono: true },
        { label: 'Decimals', value: '2' },
      ],
    },
    {
      level: 2,
      icon: BarChart3,
      iconColor: '#3B82F6',
      title: 'Risk Assessment',
      subtitle: 'Satellite-derived 6-component wildfire risk scoring',
      verified: true,
      fields: [
        { label: 'Pre-treatment Risk', value: assessment ? `${assessment.preFireRiskScore}/100 (${getRiskTier(assessment.preFireRiskScore).label})` : '—' },
        { label: 'Post-treatment Risk', value: assessment ? `${assessment.postFireRiskScore}/100 (${getRiskTier(assessment.postFireRiskScore).label})` : '—' },
        { label: 'Risk Reduction', value: assessment ? `${assessment.riskReductionPercent}%` : '—', mono: true },
        { label: 'Verified Acres', value: assessment ? String(assessment.verifiedAcres) : '—', mono: true },
        { label: 'NDVI Change', value: assessment ? `${assessment.ndviPreTreatment} → ${assessment.ndviPostTreatment}` : '—', mono: true },
        { label: 'Data Sources', value: assessment?.dataSourcesUsed || 'FIRMS,Sentinel-2,LANDFIRE,NOAA' },
        { label: 'Contract', value: RISK_ORACLE_ADDRESS, mono: true, link: `${HASHSCAN_BASE}/contract/${RISK_ORACLE_ADDRESS}` },
      ],
    },
    {
      level: 3,
      icon: FileText,
      iconColor: '#10B981',
      title: 'Treatment Report',
      subtitle: 'Ground truth: treated acres, fuel reduction, containment (Cinderard)',
      verified: true,
      fields: [
        { label: 'Treated Acres', value: assessment ? String(assessment.verifiedAcres) : '—', mono: true },
        { label: 'Fuel Reduction', value: '77.3%', mono: true },
        { label: 'Containment', value: 'Verified', mono: true },
        { label: 'Crew Lead', value: 'J. Martinez, CAL FIRE RX Lead' },
      ],
    },
    {
      level: 4,
      icon: ClipboardList,
      iconColor: '#8B5CF6',
      title: 'Treatment Plan',
      subtitle: 'Approved fuel reduction plan with crew certification',
      verified: true,
      fields: [
        { label: 'Type', value: 'Prescribed Burn' },
        { label: 'Crew Cert', value: 'CALFIRE-RX-2024-0847', mono: true },
        { label: 'Burn Permit', value: 'AQMD-BP-2026-0312', mono: true },
        { label: 'Env Clearance', value: 'CEQA Approved' },
      ],
    },
    {
      level: 5,
      icon: MapPin,
      iconColor: '#EA580C',
      title: 'Site Registration',
      subtitle: 'Verifier-approved wildfire resilience site',
      verified: true,
      fields: [
        { label: 'Site', value: site ? `${site.siteName} (${site.siteId})` : '—' },
        { label: 'Location', value: site ? `${site.gpsLatitude}°N, ${Math.abs(site.gpsLongitude)}°W` : '—', mono: true },
        { label: 'Acreage', value: site ? String(site.totalAcres) : '—', mono: true },
        { label: 'WUI Structures', value: site ? String(site.wuiStructures) : '—', mono: true },
        { label: 'Vegetation', value: site?.vegetationType || '—' },
      ],
    },
    {
      level: 6,
      icon: Satellite,
      iconColor: '#06B6D4',
      title: 'Satellite Cross-Validation',
      subtitle: 'Sentinel-2 NDVI/NBR + NASA FIRMS fire detection confirmation',
      verified: true,
      fields: [
        { label: 'NDVI Post', value: assessment ? String(assessment.ndviPostTreatment) : '0.38', mono: true },
        { label: 'dNBR', value: assessment ? String(assessment.nbrDelta) : '0.34', mono: true },
        { label: 'FIRMS Hotspots', value: assessment ? String(assessment.firmsHotspotCount) : '0', mono: true },
        { label: 'Correlation', value: '0.91', mono: true },
        { label: 'HCS Topic', value: INSTANCE_TOPIC_ID, mono: true, link: `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}` },
      ],
    },
    {
      level: 7,
      icon: DollarSign,
      iconColor: '#059669',
      title: 'Insurance & SEEA Impact',
      subtitle: 'Parametric insurance premium reduction + SEEA monetary accounting',
      verified: true,
      fields: [
        { label: 'Premium Reduction', value: impact ? `${impact.premiumReductionPercent}%` : '39%', mono: true },
        { label: 'Annual Savings', value: impact ? `$${Number(impact.estimatedAnnualSavings).toLocaleString()}` : '$111,150', mono: true },
        { label: 'Parametric Trigger', value: impact ? `${impact.parametricTriggerThreshold} FIRMS hotspots` : '5 hotspots' },
        { label: 'SEEA Stock', value: impact?.seeaStockClassification || 'Forest ecosystem (SEEA CF 4.1.1)' },
        { label: 'SEEA Flow', value: impact?.seeaFlowType || 'Fire risk regulation' },
        { label: 'Contract', value: INSURANCE_CALC_ADDRESS, mono: true, link: `${HASHSCAN_BASE}/contract/${INSURANCE_CALC_ADDRESS}` },
      ],
    },
  ];

  return (
    <div className="card animate-fade-in stagger-3">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Trust Chain — 7-Level Provenance
        </h3>
        <button onClick={handleExpandAll} className="text-[10px] font-mono px-2 py-1 rounded"
          style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
          {expandAll ? 'COLLAPSE ALL' : 'EXPAND ALL'}
        </button>
      </div>

      <div className="p-5 relative">
        {/* Vertical connector line */}
        <div className="absolute left-[37px] top-8 bottom-8 w-px"
          style={{ background: 'linear-gradient(to bottom, var(--accent), var(--accent-border), transparent)' }} />

        <div className="space-y-3">
          {levels.map((lvl, i) => {
            const Icon = lvl.icon;
            const expanded = expandedLevels.has(i);

            return (
              <div key={i} className="relative pl-14" style={{ animationDelay: `${i * 80}ms` }}>
                {/* Level dot */}
                <div className="absolute left-5 top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: lvl.iconColor,
                    background: expanded ? lvl.iconColor : 'var(--bg-card)',
                    boxShadow: expanded ? `0 0 8px ${lvl.iconColor}40` : 'none',
                  }}>
                  {expanded && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                <button onClick={() => toggleLevel(i)} className="w-full text-left">
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${lvl.iconColor}15` }}>
                      <Icon size={14} style={{ color: lvl.iconColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>L{lvl.level}</span>
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{lvl.title}</span>
                        {lvl.verified && <CheckCircle2 size={12} style={{ color: 'var(--compliant)' }} />}
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{lvl.subtitle}</p>
                    </div>
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
                  </div>
                </button>

                {expanded && (
                  <div className="mt-1 ml-10 p-3 rounded-lg grid grid-cols-2 gap-x-8 gap-y-2 animate-fade-in"
                    style={{ background: 'var(--bg-muted)' }}>
                    {lvl.fields.map((f, j) => (
                      <div key={j}>
                        <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {f.label}
                        </div>
                        {f.link ? (
                          <a href={f.link} target="_blank" rel="noopener noreferrer"
                            className={`text-[11px] ${f.mono ? 'font-mono' : ''} flex items-center gap-1 hover:underline`}
                            style={{ color: 'var(--accent)' }}>
                            {f.value.length > 30 ? f.value.slice(0, 12) + '...' + f.value.slice(-8) : f.value}
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <div className={`text-[11px] ${f.mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>
                            {f.value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
