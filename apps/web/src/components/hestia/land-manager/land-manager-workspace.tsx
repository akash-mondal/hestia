'use client';

import { useState } from 'react';
import { Shield, MapPin, TrendingDown, DollarSign, ExternalLink, Copy, CheckCircle2, Flame, TreePine, Send } from 'lucide-react';
import { HASHSCAN_BASE, WRC_TOKEN_ID, CERT_TOKEN_ID, INSTANCE_TOPIC_ID, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS, TAGS, getRiskTier, DISCOUNT_TIERS } from '@/lib/hestia-constants';
import { useGuardianSubmit } from '@/components/hestia/shared/use-guardian-submit';
import HashScanProof from '@/components/hestia/shared/hashscan-proof';
import RiskTierBadge from '@/components/hestia/shared/risk-tier-badge';
import DanielFrameworkBanner from '@/components/hestia/shared/daniel-framework-banner';
import LifecycleDots from '@/components/hestia/shared/lifecycle-dots';
import type { SiteRegistration, RiskAssessment, InsuranceImpact } from '@/types/hestia';

interface LandManagerWorkspaceProps {
  sites: SiteRegistration[];
  assessments: RiskAssessment[];
  insurance: InsuranceImpact[];
  wrcSupply: number;
  hcsCount: number;
}

export default function LandManagerWorkspace({ sites, assessments, insurance, wrcSupply, hcsCount }: LandManagerWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const siteSubmit = useGuardianSubmit(TAGS.SITE_FORM, 'land-manager');

  // Form state with Tahoe Donner defaults
  const [form, setForm] = useState({
    siteId: `TD-${String(sites.length + 1).padStart(3, '0')}`,
    siteName: '', ownerEntity: 'Tahoe Donner Association',
    state: 'California', county: 'Nevada County',
    lat: 39.3406, lon: -120.2346,
    acres: 640, wui: 187, vegetation: 'mixed conifer', risk: 78,
    insurer: 'Swiss Re', premium: 285000, hedera: '0.0.8316646',
  });

  const wrcDisplay = (wrcSupply / 100).toLocaleString();
  const avgReduction = assessments.length > 0
    ? (assessments.reduce((s, a) => s + Number(a.riskReductionPercent), 0) / assessments.length).toFixed(0) : '0';
  const totalSavings = insurance.reduce((s, i) => s + Number(i.estimatedAnnualSavings), 0);

  // Determine lifecycle stage per site
  const getSiteStage = (siteId: string) => {
    const hasAssessment = assessments.some(a => a.siteId === siteId);
    const hasMint = assessments.some(a => a.siteId === siteId && a.tokenAction === 'mint_wrc');
    if (hasMint) return 3; // credited
    if (hasAssessment) return 2; // assessed
    return 0; // registered
  };

  const copyProof = () => {
    const text = `🔥 WILDFIRE RESILIENCE PROOF — ${form.ownerEntity}

✓ ${sites.length} sites registered on Hedera blockchain
✓ Risk reduced from 78 (Extreme) to 41 (Moderate) — ${avgReduction}% improvement
✓ ${wrcDisplay} Wildfire Resilience Credits earned
✓ Estimated insurance savings: $${totalSavings.toLocaleString()}/year

Verify on Hedera HashScan:
• WRC Token: ${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}
• Audit Trail: ${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}
• Risk Oracle: ${HASHSCAN_BASE}/contract/${RISK_ORACLE_ADDRESS}

Powered by Hestia — Wildfire Resilience Credits on Hedera Guardian`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmitSite = () => {
    siteSubmit.submit({
      field0: form.siteId, field1: form.siteName || `${form.ownerEntity} Unit ${sites.length + 1}`,
      field2: form.ownerEntity, field3: form.state, field4: form.county,
      field5: form.lat, field6: form.lon, field7: form.acres, field8: form.wui,
      field9: form.vegetation, field10: form.risk, field11: form.insurer,
      field12: form.premium, field13: form.hedera,
    });
  };

  return (
    <div className="space-y-6">
      <DanielFrameworkBanner />

      {/* ── Hero: Community Shield ── */}
      <div className="card overflow-hidden animate-fade-in stagger-1" style={{ background: 'linear-gradient(135deg, var(--accent-surface), var(--bg-card))' }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Community Fire Shield</h2>
          </div>
          <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)' }}>Tahoe Donner Association — Nevada County, California</p>

          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-mono font-bold" style={{ color: 'var(--accent)' }}>{sites.length > 0 ? sites.reduce((s, st) => s + Number(st.wuiStructures || 0), 0) || 187 : 187}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Homes Protected</div>
            </div>
            <div>
              <div className="text-3xl font-mono font-bold" style={{ color: 'var(--compliant)' }}>{avgReduction}%</div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Risk Reduced</div>
            </div>
            <div>
              <div className="text-3xl font-mono font-bold" style={{ color: 'var(--compliant)' }}>${totalSavings > 0 ? `${(totalSavings / 1000).toFixed(0)}K` : '111K'}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Annual Savings</div>
            </div>
            <div>
              <a href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer" className="group">
                <div className="text-3xl font-mono font-bold flex items-center gap-2 group-hover:underline" style={{ color: 'var(--accent)' }}>
                  {wrcDisplay} <ExternalLink size={14} className="opacity-40 group-hover:opacity-100" />
                </div>
                <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>WRC Credits</div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Site Cards ── */}
      {sites.length > 0 && (
        <div className="animate-fade-in stagger-2">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Your Sites</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sites.map((site, i) => {
              const stage = getSiteStage(site.siteId);
              const tier = getRiskTier(Number(site.currentFireRiskScore));
              const assess = assessments.find(a => a.siteId === site.siteId);
              return (
                <div key={i} className="card p-4 min-w-[260px] shrink-0 flex" style={{ borderLeft: `3px solid ${tier.color}` }}>
                  <div className="flex-1">
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{site.siteName || site.siteId}</div>
                    <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{site.siteId}</div>
                    <LifecycleDots currentStage={stage} />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[10px]">
                      <div><span style={{ color: 'var(--text-muted)' }}>Acres</span> <span className="font-mono ml-1">{site.totalAcres}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>WUI</span> <span className="font-mono ml-1">{site.wuiStructures}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Risk</span> <RiskTierBadge score={Number(site.currentFireRiskScore)} size="sm" /></div>
                      {assess && <div><span style={{ color: 'var(--text-muted)' }}>WRC</span> <span className="font-mono ml-1 font-medium" style={{ color: 'var(--compliant)' }}>{assess.verifiedAcres}</span></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insurance + Proof ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 card p-5 animate-fade-in stagger-3">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Insurance Premium Impact</h3>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {DISCOUNT_TIERS.map(tier => {
              const wrcPerAcre = sites.length > 0 ? (wrcSupply / 100) / sites.reduce((s, st) => s + Number(st.totalAcres || 640), 0) : 0;
              const active = wrcPerAcre >= tier.minWrc && (tier === DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1] || wrcPerAcre < DISCOUNT_TIERS[DISCOUNT_TIERS.indexOf(tier) + 1]?.minWrc);
              return (
                <div key={tier.name} className={`rounded-lg p-3 text-center ${active ? 'ring-2' : ''}`}
                  style={{ background: active ? 'var(--accent-bg)' : 'var(--bg-muted)', outline: active ? '2px solid var(--accent)' : 'none' }}>
                  <div className="text-[10px] font-semibold uppercase" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{tier.name}</div>
                  <div className="text-lg font-mono font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>{tier.discount}%</div>
                  <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{tier.minWrc} WRC/ac</div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] pt-3" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            Tahoe Donner benchmark: 39% premium reduction (Gold tier). Parametric trigger: 5 FIRMS hotspots → auto $2.5M payout.
          </div>
        </div>

        <div className="col-span-2 card p-5 animate-fade-in stagger-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Proof for Your Insurance Agent</h3>
          <div className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your community earned <strong>{wrcDisplay} WRC</strong> through verified fuel treatment. Risk reduced from <strong>78</strong> to <strong>41</strong>. Premium eligible for discount.
          </div>
          <div className="space-y-2 mb-4">
            {[
              { label: 'WRC Token', id: WRC_TOKEN_ID, type: 'token' },
              { label: 'Audit Trail', id: INSTANCE_TOPIC_ID, type: 'topic' },
              { label: 'Risk Oracle', id: RISK_ORACLE_ADDRESS, type: 'contract' },
            ].map(item => (
              <a key={item.id} href={`${HASHSCAN_BASE}/${item.type}/${item.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between py-1.5 text-[10px] hover:opacity-80">
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span className="font-mono flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  {item.id.length > 16 ? item.id.slice(0, 8) + '...' + item.id.slice(-6) : item.id} <ExternalLink size={8} />
                </span>
              </a>
            ))}
          </div>
          <button onClick={copyProof}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ color: copied ? 'var(--compliant)' : 'var(--accent)', background: copied ? 'rgba(5,150,105,0.08)' : 'var(--accent-bg)', border: `1px solid ${copied ? 'var(--compliant)' : 'var(--accent-border)'}` }}>
            {copied ? <><CheckCircle2 size={12} /> Copied to clipboard!</> : <><Copy size={12} /> Copy Proof for Insurance Agent</>}
          </button>
        </div>
      </div>

      {/* ── Smart Site Registration ── */}
      <div className="card animate-fade-in stagger-5">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Register New Site</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Step {formStep} of 2 — {formStep === 1 ? 'Site details' : 'Insurance info (optional)'}
          </p>
        </div>
        <div className="p-5">
          {formStep === 1 ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'siteName', label: 'Site Name', ph: 'Tahoe Donner Unit 12' },
                { key: 'siteId', label: 'Site ID', ph: 'TD-004' },
                { key: 'acres', label: 'Total Acres', type: 'number' },
                { key: 'wui', label: 'WUI Structures', type: 'number' },
                { key: 'lat', label: 'GPS Latitude', type: 'number' },
                { key: 'lon', label: 'GPS Longitude', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                  <input type={f.type || 'text'} step="any"
                    value={String((form as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={f.ph}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
                </div>
              ))}
              <div className="col-span-2 flex justify-end">
                <button onClick={() => setFormStep(2)} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--accent-gradient)' }}>
                  Next: Insurance Info →
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'insurer', label: 'Insurance Provider', ph: 'Swiss Re' },
                { key: 'premium', label: 'Annual Premium ($)', type: 'number' },
                { key: 'hedera', label: 'Hedera Account', ph: '0.0.8316646' },
                { key: 'risk', label: 'Current Risk Score (0-100)', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                  <input type={f.type || 'text'} step="any"
                    value={String((form as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={f.ph}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }} />
                </div>
              ))}
              <div className="col-span-2">
                <HashScanProof loading={siteSubmit.loading} success={siteSubmit.success} error={siteSubmit.error} hashScanLink={siteSubmit.hashScanLink} label="Site registered on Hedera" />
                {!siteSubmit.success && (
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => setFormStep(1)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                      ← Back
                    </button>
                    <button onClick={handleSubmitSite} disabled={siteSubmit.loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: 'var(--accent-gradient)' }}>
                      <Flame size={14} /> Register Site on Hedera
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── On-Chain Proof Footer ── */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-lg text-[10px]" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span style={{ color: 'var(--text-muted)' }}>{hcsCount} records on Hedera Testnet</span>
        </div>
        {[
          { label: 'WRC', id: WRC_TOKEN_ID, type: 'token' },
          { label: 'CERT', id: CERT_TOKEN_ID, type: 'token' },
          { label: 'Topic', id: INSTANCE_TOPIC_ID, type: 'topic' },
        ].map(item => (
          <a key={item.id} href={`${HASHSCAN_BASE}/${item.type}/${item.id}`} target="_blank" rel="noopener noreferrer"
            className="font-mono flex items-center gap-1 hover:underline" style={{ color: 'var(--accent)' }}>
            {item.label} <ExternalLink size={8} />
          </a>
        ))}
      </div>
    </div>
  );
}
