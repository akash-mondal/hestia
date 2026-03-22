'use client';

import { useState } from 'react';
import { Flame, RefreshCw, TrendingDown, Calculator, Send, ExternalLink, AlertTriangle, Shield } from 'lucide-react';
import { HASHSCAN_BASE, WRC_TOKEN_ID, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS, INSTANCE_TOPIC_ID, getRiskTier, DISCOUNT_TIERS, TAGS } from '@/lib/hestia-constants';
import { useGuardianSubmit } from '@/components/hestia/shared/use-guardian-submit';
import HashScanProof from '@/components/hestia/shared/hashscan-proof';
import RiskTierBadge from '@/components/hestia/shared/risk-tier-badge';
import DanielFrameworkBanner from '@/components/hestia/shared/daniel-framework-banner';
import type { RiskAssessment } from '@/types/hestia';

interface SatelliteWorkspaceProps {
  initialAssessments: RiskAssessment[];
  wrcSupply: number;
}

interface VegData { pre_ndvi: number; post_ndvi: number; pre_nbr: number; post_nbr: number; dnbr: number; burn_severity: string; source: string; }
interface FireData { count: number; fires: { latitude: number; longitude: number; brightness: number; confidence: string; frp: number; acq_date: string; acq_time: string }[]; source: string; }
interface RiskData { total: number; category: string; components: Record<string, number>; }

export default function SatelliteWorkspace({ initialAssessments, wrcSupply }: SatelliteWorkspaceProps) {
  // Shared state across sections
  const [fires, setFires] = useState<FireData | null>(null);
  const [vegData, setVegData] = useState<VegData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [firesLoading, setFiresLoading] = useState(false);
  const [vegLoading, setVegLoading] = useState(false);

  // Risk calculator inputs
  const [riskInputs, setRiskInputs] = useState({ fuel: 20, slope: 12, wui: 16, access: 8, historical: 8, weather: 14 });
  const [postRiskInputs, setPostRiskInputs] = useState({ fuel: 8, slope: 12, wui: 10, access: 4, historical: 3, weather: 4 });

  // Assessment form
  const [siteId, setSiteId] = useState('TD-001');
  const [verifiedAcres, setVerifiedAcres] = useState(118.5);
  const [tokenAction, setTokenAction] = useState('mint_wrc');
  const assessSubmit = useGuardianSubmit(TAGS.RISK_INTAKE, 'satellite');

  // ── Fetch Handlers ──
  const fetchFires = async () => {
    setFiresLoading(true);
    try {
      const res = await fetch('/api/hestia/satellite/fires?bbox=-122,37,-118,41&days=7');
      setFires(await res.json());
    } catch { setFires(null); }
    setFiresLoading(false);
  };

  const fetchVegetation = async () => {
    setVegLoading(true);
    try {
      const res = await fetch(`/api/hestia/satellite/vegetation?lat=39.3406&lon=-120.2346&pre_date=2025-06-01&post_date=2026-03-01`);
      setVegData(await res.json());
    } catch { setVegData(null); }
    setVegLoading(false);
  };

  const calculateRisk = () => {
    const pre = Object.values(riskInputs).reduce((a, b) => a + b, 0);
    const post = Object.values(postRiskInputs).reduce((a, b) => a + b, 0);
    setRiskData({
      total: pre,
      category: pre > 75 ? 'Extreme' : pre > 50 ? 'High' : pre > 25 ? 'Moderate' : 'Low',
      components: { pre, post, reduction: Math.round((pre - post) / pre * 100) },
    });
  };

  // ── Submit Assessment (THE POWER ACTION) ──
  const submitAssessment = () => {
    const preScore = riskData?.components.pre ?? Object.values(riskInputs).reduce((a, b) => a + b, 0);
    const postScore = riskData?.components.post ?? Object.values(postRiskInputs).reduce((a, b) => a + b, 0);
    const reduction = preScore > 0 ? ((preScore - postScore) / preScore * 100).toFixed(1) : '0';
    const veg = vegData || { pre_ndvi: 0.72, post_ndvi: 0.38, dnbr: 0.34 };

    assessSubmit.submit({
      field0: `RA-${siteId}-${Date.now().toString(36).slice(-6)}`,
      field1: siteId,
      field2: new Date().toISOString(),
      field3: preScore,
      field4: postScore,
      field5: Number(reduction),
      field6: veg.pre_ndvi,
      field7: veg.post_ndvi,
      field8: veg.dnbr,
      field9: fires?.count ?? 0,
      field10: riskInputs.weather / 20,
      field11: riskInputs.slope / 15,
      field12: riskInputs.wui / 20,
      field13: verifiedAcres,
      field14: 'FIRMS,Sentinel-2,LANDFIRE,NOAA',
      field15: new Date().toISOString().split('T')[0],
      field16: true,
      field17: tokenAction,
    });
  };

  const preTotal = Object.values(riskInputs).reduce((a, b) => a + b, 0);
  const postTotal = Object.values(postRiskInputs).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <DanielFrameworkBanner />

      {/* ── Section 1: FIRMS Fire Feed ── */}
      <div className="card animate-fade-in stagger-1">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>NASA FIRMS Active Fire Detection</h3>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>
              {fires?.source === 'demo_fallback' ? 'DEMO' : 'LIVE'} · VIIRS SNPP
            </span>
          </div>
          <button onClick={fetchFires} disabled={firesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
            style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
            <RefreshCw size={12} className={firesLoading ? 'animate-spin' : ''} />
            {firesLoading ? 'Loading...' : fires ? 'Refresh' : 'Fetch Fires'}
          </button>
        </div>
        {fires && fires.fires.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {fires.fires.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="font-mono w-40" style={{ color: 'var(--text-primary)' }}>{f.latitude.toFixed(2)}°N, {Math.abs(f.longitude).toFixed(2)}°W</span>
                <span className="font-mono w-20" style={{ color: '#DC2626' }}>{f.brightness}K</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${f.confidence === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{f.confidence}</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{f.frp} MW</span>
                <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)' }}>{f.acq_date} {f.acq_time}</span>
              </div>
            ))}
          </div>
        ) : !fires ? (
          <div className="px-5 py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Click "Fetch Fires" to load NASA FIRMS data for California
          </div>
        ) : (
          <div className="px-5 py-6 text-center text-[11px]" style={{ color: 'var(--compliant)' }}>No active fires detected</div>
        )}
      </div>

      {/* ── Section 2: Vegetation + Risk Calculator ── */}
      <div className="grid grid-cols-5 gap-6">
        {/* Vegetation Analyzer */}
        <div className="col-span-3 card p-5 animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sentinel-2 Vegetation Change</h3>
            </div>
            <button onClick={fetchVegetation} disabled={vegLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium"
              style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              {vegLoading ? 'Analyzing...' : vegData ? 'Re-analyze' : 'Analyze Tahoe Donner'}
            </button>
          </div>
          {vegData ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>NDVI (Vegetation)</div>
                {[{ label: 'Pre-treatment', val: vegData.pre_ndvi, color: '#059669' }, { label: 'Post-treatment', val: vegData.post_ndvi, color: '#D97706' }].map(bar => (
                  <div key={bar.label} className="mb-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>{bar.label}</span>
                      <span className="font-mono font-medium" style={{ color: bar.color }}>{bar.val}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar.val * 100}%`, background: bar.color }} />
                    </div>
                  </div>
                ))}
                <div className="text-[10px] font-mono text-center mt-2" style={{ color: 'var(--accent)' }}>dNDVI: {vegData.dnbr.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>NBR (Burn Ratio)</div>
                {[{ label: 'Pre-treatment', val: vegData.pre_nbr, color: '#059669' }, { label: 'Post-treatment', val: vegData.post_nbr, color: '#EA580C' }].map(bar => (
                  <div key={bar.label} className="mb-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>{bar.label}</span>
                      <span className="font-mono font-medium" style={{ color: bar.color }}>{bar.val}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar.val * 100}%`, background: bar.color }} />
                    </div>
                  </div>
                ))}
                <div className="mt-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium" style={{ color: '#D97706', background: 'rgba(217,119,6,0.1)' }}>
                    {vegData.burn_severity}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Click "Analyze Tahoe Donner" to fetch Sentinel-2 NDVI/NBR data
            </div>
          )}
        </div>

        {/* Risk Calculator */}
        <div className="col-span-2 card p-5 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Risk Calculator</h3>
          </div>
          <div className="space-y-2">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pre-treatment</div>
            {Object.entries(riskInputs).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] w-16 capitalize" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                <input type="number" value={val} onChange={e => setRiskInputs(p => ({ ...p, [key]: Number(e.target.value) }))}
                  className="w-14 px-1.5 py-0.5 rounded text-[10px] font-mono text-center border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pre: <RiskTierBadge score={preTotal} /></span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Post: <RiskTierBadge score={postTotal} /></span>
            </div>
            <div className="text-center pt-1">
              <span className="text-lg font-mono font-bold" style={{ color: 'var(--compliant)' }}>
                {preTotal > 0 ? Math.round((preTotal - postTotal) / preTotal * 100) : 0}% reduction
              </span>
            </div>
            <a href={`${HASHSCAN_BASE}/contract/${RISK_ORACLE_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] font-mono justify-center" style={{ color: 'var(--accent)' }}>
              RiskScoreOracle on HashScan <ExternalLink size={8} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Section 3: Assessment Builder (THE POWER ACTION) ── */}
      <div className="card animate-fade-in stagger-4" style={{ border: '2px solid var(--accent-border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-bg)' }}>
          <div className="flex items-center gap-2">
            <Send size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Submit Risk Assessment</h3>
            <span className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ color: '#DC2626', background: 'rgba(220,38,38,0.08)' }}>
              Triggers WRC Minting on Hedera
            </span>
          </div>
          {vegData && (
            <button onClick={() => { calculateRisk(); }} className="text-[10px] font-mono px-2 py-1 rounded"
              style={{ color: 'var(--accent)', background: 'var(--bg-card)', border: '1px solid var(--accent-border)' }}>
              Populate from Analysis
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Site ID</label>
              <input value={siteId} onChange={e => setSiteId(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-xs font-mono border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Verified Acres (= WRC Mint Amount)</label>
              <input type="number" step="0.1" value={verifiedAcres} onChange={e => setVerifiedAcres(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md text-xs font-mono border font-bold" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)', color: 'var(--accent)' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>Risk Scores</label>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <RiskTierBadge score={preTotal} size="sm" /> → <RiskTierBadge score={postTotal} size="sm" />
              </div>
            </div>
          </div>

          {/* Token Action Selector */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>Token Action</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'mint_wrc', label: 'Mint WRC', desc: 'Triggers real token minting on Hedera', color: '#059669', accent: true },
                { value: 'pending_review', label: 'Pending Review', desc: 'Submit for manual review', color: '#D97706', accent: false },
                { value: 'none', label: 'None', desc: 'Record only, no minting', color: '#6B7280', accent: false },
              ].map(opt => (
                <button key={opt.value} onClick={() => setTokenAction(opt.value)}
                  className={`p-3 rounded-lg text-left transition-all ${tokenAction === opt.value ? 'ring-2' : ''}`}
                  style={{
                    background: tokenAction === opt.value ? `${opt.color}10` : 'var(--bg-muted)',
                    borderColor: opt.color,
                    outline: tokenAction === opt.value ? `2px solid ${opt.color}` : 'none',
                    border: `1px solid ${tokenAction === opt.value ? opt.color : 'var(--border-subtle)'}`,
                  }}>
                  <div className="text-[11px] font-semibold" style={{ color: tokenAction === opt.value ? opt.color : 'var(--text-secondary)' }}>{opt.label}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <HashScanProof
            loading={assessSubmit.loading}
            success={assessSubmit.success}
            error={assessSubmit.error}
            hashScanLink={assessSubmit.hashScanLink}
            label="Risk Assessment submitted to Hedera"
            mintAmount={tokenAction === 'mint_wrc' ? verifiedAcres : undefined}
          />

          {!assessSubmit.success && (
            <button onClick={submitAssessment} disabled={assessSubmit.loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: tokenAction === 'mint_wrc' ? 'linear-gradient(135deg, #059669, #34D399)' : 'var(--accent-gradient)' }}>
              <Send size={14} />
              {tokenAction === 'mint_wrc' ? `Submit & Mint ${verifiedAcres} WRC on Hedera` : 'Submit Risk Assessment'}
            </button>
          )}
        </div>
      </div>

      {/* ── Section 4: Insurance Tiers ── */}
      <div className="card p-5 animate-fade-in stagger-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Insurance Discount Tiers</h3>
          </div>
          <a href={`${HASHSCAN_BASE}/contract/${INSURANCE_CALC_ADDRESS}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] font-mono" style={{ color: 'var(--accent)' }}>
            InsurancePremiumCalculator <ExternalLink size={8} />
          </a>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DISCOUNT_TIERS.map(tier => (
            <div key={tier.name} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-muted)' }}>
              <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{tier.name}</div>
              <div className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{tier.discount}%</div>
              <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{tier.minWrc} WRC/acre</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: Assessment History ── */}
      {initialAssessments.length > 0 && (
        <div className="card animate-fade-in">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Assessment History</h3>
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
                  <th className="text-center px-3 py-3 text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {initialAssessments.map((a, i) => (
                  <tr key={i} style={a.tokenAction === 'mint_wrc' ? { background: 'rgba(5,150,105,0.03)' } : {}}>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{a.siteId}</td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.preFireRiskScore)} size="sm" /></td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.postFireRiskScore)} size="sm" /></td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--compliant)' }}>{a.riskReductionPercent}%</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px] font-medium">{a.verifiedAcres}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`pill ${a.tokenAction === 'mint_wrc' ? 'pill-compliant' : 'pill-warning'}`}>
                        {a.tokenAction === 'mint_wrc' ? 'WRC' : a.tokenAction}
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
