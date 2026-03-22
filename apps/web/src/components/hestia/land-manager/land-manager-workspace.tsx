'use client';

import { useState } from 'react';
import { Shield, ExternalLink, Copy, CheckCircle2, Flame, TreePine, Home, TrendingDown, ArrowRight } from 'lucide-react';
import { HASHSCAN_BASE, WRC_TOKEN_ID, CERT_TOKEN_ID, INSTANCE_TOPIC_ID, RISK_ORACLE_ADDRESS, INSURANCE_CALC_ADDRESS, TAGS, getRiskTier, DISCOUNT_TIERS } from '@/lib/hestia-constants';
import { useGuardianSubmit } from '@/components/hestia/shared/use-guardian-submit';
import HashScanProof from '@/components/hestia/shared/hashscan-proof';
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
  const [formOpen, setFormOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const siteSubmit = useGuardianSubmit(TAGS.SITE_FORM, 'land-manager');

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
  const totalHomes = sites.length > 0 ? sites.reduce((s, st) => s + Number(st.wuiStructures || 0), 0) || 187 : 187;

  const getSiteStage = (siteId: string) => {
    const hasMint = assessments.some(a => a.siteId === siteId && a.tokenAction === 'mint_wrc');
    if (hasMint) return 3;
    if (assessments.some(a => a.siteId === siteId)) return 2;
    return 0;
  };

  const copyProof = () => {
    const text = `WILDFIRE RESILIENCE PROOF — Tahoe Donner Association\n\n${sites.length} sites registered on Hedera blockchain\nRisk reduced ${avgReduction}%\n${wrcDisplay} WRC earned\nEstimated savings: $${totalSavings.toLocaleString()}/yr\n\nVerify:\n${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}\n${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
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

  const STAGES = ['Registered', 'Treated', 'Assessed', 'Credited'];

  return (
    <div className="space-y-8">

      {/* ═══ HERO — Dark banner with key numbers ═══ */}
      <div className="rounded-xl overflow-hidden animate-fade-in" style={{
        background: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)',
      }}>
        <div className="px-8 py-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234, 88, 12, 0.15)' }}>
              <Shield size={20} style={{ color: '#FB923C' }} />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>Tahoe Donner Association</h2>
              <p className="text-white/40 text-[11px]">Nevada County, California · {sites.length} registered sites</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/30 text-[10px] font-mono">{hcsCount} on-chain records</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-8">
            {[
              { value: totalHomes.toLocaleString(), label: 'Homes Protected', icon: Home, color: '#E2E8F0' },
              { value: `${avgReduction}%`, label: 'Risk Reduced', icon: TrendingDown, color: '#34D399' },
              { value: `$${totalSavings > 0 ? `${(totalSavings / 1000).toFixed(0)}K` : '111K'}`, label: 'Annual Savings', icon: Shield, color: '#34D399' },
              { value: wrcDisplay, label: 'WRC Credits', icon: Flame, color: '#FB923C', link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}` },
            ].map((stat, i) => {
              const Icon = stat.icon;
              const inner = (
                <div key={i} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-semibold" style={{ color: stat.color, letterSpacing: '-0.02em' }}>
                      {stat.value}
                    </span>
                    {stat.link && <ExternalLink size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                  </div>
                </div>
              );
              return stat.link ? (
                <a key={i} href={stat.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">{inner}</a>
              ) : <div key={i}>{inner}</div>;
            })}
          </div>
        </div>
      </div>

      {/* ═══ SITES — Horizontal scroll of site cards ═══ */}
      {sites.length > 0 && (
        <div className="animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Your Sites</h3>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{sites.length} registered</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
            {sites.map((site, i) => {
              const stage = getSiteStage(site.siteId);
              const tier = getRiskTier(Number(site.currentFireRiskScore));
              const assess = assessments.find(a => a.siteId === site.siteId);
              return (
                <div key={i} className="card p-0 min-w-[280px] shrink-0 overflow-hidden">
                  {/* Thin top accent bar */}
                  <div className="h-1" style={{ background: stage >= 3 ? '#059669' : stage >= 2 ? '#3B82F6' : tier.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{site.siteName || site.siteId}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{site.siteId}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium" style={{ color: tier.color, background: tier.bg }}>
                        {site.currentFireRiskScore}
                      </span>
                    </div>

                    {/* Lifecycle progress bar */}
                    <div className="mb-3">
                      <div className="flex gap-0.5 mb-1.5">
                        {STAGES.map((s, si) => (
                          <div key={s} className="flex-1 h-1.5 rounded-full" style={{
                            background: si <= stage ? (stage >= 3 ? '#059669' : stage >= 2 ? '#3B82F6' : '#D97706') : '#E5E7EB',
                          }} />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        {STAGES.map((s, si) => (
                          <span key={s} className="text-[8px]" style={{ color: si <= stage ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-[10px]">
                      <div>
                        <span className="block" style={{ color: 'var(--text-muted)' }}>Acres</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{site.totalAcres}</span>
                      </div>
                      <div>
                        <span className="block" style={{ color: 'var(--text-muted)' }}>Structures</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{site.wuiStructures}</span>
                      </div>
                      {assess ? (
                        <div>
                          <span className="block" style={{ color: 'var(--text-muted)' }}>WRC Earned</span>
                          <span className="font-mono font-semibold" style={{ color: '#059669' }}>{assess.verifiedAcres}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="block" style={{ color: 'var(--text-muted)' }}>Vegetation</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{site.vegetationType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TWO-COLUMN: Insurance + Proof ═══ */}
      <div className="grid grid-cols-5 gap-6">
        {/* Insurance Tiers */}
        <div className="col-span-3 card p-6 animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Insurance Premium Discount</h3>
            <a href={`${HASHSCAN_BASE}/contract/${INSURANCE_CALC_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-[9px] font-mono flex items-center gap-1 hover:underline" style={{ color: 'var(--text-muted)' }}>
              On-chain contract <ExternalLink size={8} />
            </a>
          </div>

          {/* Tier bar — horizontal progression */}
          <div className="flex items-stretch gap-1 mb-5">
            {DISCOUNT_TIERS.filter(t => t.discount > 0).map((tier, i) => {
              const isGold = tier.name === 'Gold';
              return (
                <div key={tier.name} className="flex-1 rounded-lg p-3 text-center relative transition-all"
                  style={{
                    background: isGold ? '#292524' : 'var(--bg-muted)',
                    border: isGold ? '1px solid rgba(234,88,12,0.3)' : '1px solid transparent',
                  }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: isGold ? '#FB923C' : 'var(--text-muted)' }}>{tier.name}</div>
                  <div className="text-xl font-mono font-bold mb-0.5"
                    style={{ color: isGold ? '#FFFFFF' : 'var(--text-tertiary)' }}>{tier.discount}%</div>
                  <div className="text-[8px]" style={{ color: isGold ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)' }}>
                    ≥{tier.minWrc} WRC/acre
                  </div>
                  {isGold && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider"
                      style={{ background: '#EA580C', color: 'white' }}>
                      Tahoe Benchmark
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Tahoe Donner HOA secured a <strong style={{ color: 'var(--text-secondary)' }}>39% premium reduction</strong> through 20+ years of verified forest management — the first parametric wildfire insurance policy of its kind. Hestia builds the infrastructure to make this scalable.
          </div>
        </div>

        {/* Proof Card */}
        <div className="col-span-2 card p-6 animate-fade-in stagger-4 flex flex-col">
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Share with Your Insurer</h3>
          <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {wrcDisplay} Wildfire Resilience Credits earned. Risk reduced from <strong>78</strong> (Extreme) to <strong>41</strong> (Moderate). All records independently verifiable on Hedera.
          </p>

          <div className="space-y-0 mb-4 flex-1">
            {[
              { label: 'WRC Token', id: WRC_TOKEN_ID, type: 'token' },
              { label: 'Audit Trail', id: INSTANCE_TOPIC_ID, type: 'topic' },
              { label: 'Risk Contract', id: RISK_ORACLE_ADDRESS, type: 'contract' },
            ].map(item => (
              <a key={item.id} href={`${HASHSCAN_BASE}/${item.type}/${item.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 border-b hover:bg-black/[0.02] transition-colors px-1"
                style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span className="font-mono text-[10px] flex items-center gap-1.5" style={{ color: '#1D4ED8' }}>
                  {item.id.length > 16 ? item.id.slice(0, 10) + '…' + item.id.slice(-6) : item.id}
                  <ExternalLink size={9} style={{ opacity: 0.5 }} />
                </span>
              </a>
            ))}
          </div>

          <button onClick={copyProof}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              color: copied ? 'white' : 'var(--text-primary)',
              background: copied ? '#059669' : 'var(--bg-muted)',
              border: copied ? 'none' : '1px solid var(--border-default)',
            }}>
            {copied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy Proof for Insurance Agent</>}
          </button>
        </div>
      </div>

      {/* ═══ REGISTER SITE ═══ */}
      <div className="card overflow-hidden animate-fade-in stagger-5">
        <button onClick={() => setFormOpen(!formOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-black/[0.01] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
              <TreePine size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Register New Site</h3>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Add a wildfire resilience site to the Hedera blockchain</p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--text-muted)', transform: formOpen ? 'rotate(90deg)' : '', transition: 'transform 200ms' }} />
        </button>

        {formOpen && (
          <div className="border-t px-6 py-5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-muted)' }}>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: formStep >= s ? '#292524' : 'var(--bg-card)',
                      color: formStep >= s ? 'white' : 'var(--text-muted)',
                      border: formStep >= s ? 'none' : '1px solid var(--border-default)',
                    }}>{s}</div>
                  <span className="text-[10px] font-medium" style={{ color: formStep >= s ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {s === 1 ? 'Site Details' : 'Insurance'}
                  </span>
                  {s === 1 && <div className="w-8 h-px mx-1" style={{ background: formStep >= 2 ? '#292524' : 'var(--border-default)' }} />}
                </div>
              ))}
            </div>

            {formStep === 1 ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'siteName', label: 'Site Name', ph: 'Tahoe Donner Unit 12' },
                  { key: 'siteId', label: 'Site ID', ph: 'TD-004' },
                  { key: 'acres', label: 'Acres', type: 'number' },
                  { key: 'wui', label: 'Structures at Risk', type: 'number' },
                  { key: 'lat', label: 'Latitude', type: 'number' },
                  { key: 'lon', label: 'Longitude', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input type={f.type || 'text'} step="any"
                      value={String((form as Record<string, unknown>)[f.key] ?? '')}
                      onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      placeholder={f.ph}
                      className="w-full px-3 py-2.5 rounded-lg text-[12px] font-mono border-0 focus:ring-2 focus:ring-offset-1"
                      style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', color: 'var(--text-primary)' }} />
                  </div>
                ))}
                <div className="col-span-2 flex justify-end pt-2">
                  <button onClick={() => setFormStep(2)} className="px-5 py-2.5 rounded-lg text-[11px] font-semibold text-white"
                    style={{ background: '#292524' }}>
                    Next →
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'insurer', label: 'Insurance Provider', ph: 'Swiss Re' },
                  { key: 'premium', label: 'Annual Premium ($)', type: 'number' },
                  { key: 'hedera', label: 'Hedera Account', ph: '0.0.8316646' },
                  { key: 'risk', label: 'Risk Score (0-100)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input type={f.type || 'text'} step="any"
                      value={String((form as Record<string, unknown>)[f.key] ?? '')}
                      onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      placeholder={f.ph}
                      className="w-full px-3 py-2.5 rounded-lg text-[12px] font-mono border-0"
                      style={{ background: 'var(--bg-card)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', color: 'var(--text-primary)' }} />
                  </div>
                ))}
                <div className="col-span-2">
                  <HashScanProof loading={siteSubmit.loading} success={siteSubmit.success} error={siteSubmit.error} hashScanLink={siteSubmit.hashScanLink} label="Site registered on Hedera" />
                  {!siteSubmit.success && (
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setFormStep(1)} className="px-4 py-2.5 rounded-lg text-[11px] font-medium"
                        style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                        ← Back
                      </button>
                      <button onClick={handleSubmitSite} disabled={siteSubmit.loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
                        style={{ background: '#EA580C' }}>
                        <Flame size={13} /> Register on Hedera
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ FOOTER — Blockchain proof bar ═══ */}
      <div className="flex items-center gap-6 px-5 py-3.5 rounded-lg text-[10px]"
        style={{ background: '#FAFAF9', border: '1px solid #E7E5E4' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span style={{ color: '#78716C' }}>Hedera Testnet · {hcsCount} records</span>
        </div>
        <div className="flex-1" />
        {[
          { label: 'WRC Token', id: WRC_TOKEN_ID, type: 'token' },
          { label: 'CERT NFT', id: CERT_TOKEN_ID, type: 'token' },
          { label: 'HCS Topic', id: INSTANCE_TOPIC_ID, type: 'topic' },
        ].map(item => (
          <a key={item.id} href={`${HASHSCAN_BASE}/${item.type}/${item.id}`} target="_blank" rel="noopener noreferrer"
            className="font-mono flex items-center gap-1 hover:underline" style={{ color: '#78716C' }}>
            {item.label} <ExternalLink size={8} />
          </a>
        ))}
      </div>
    </div>
  );
}
