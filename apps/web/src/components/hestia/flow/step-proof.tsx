'use client';

import { useState } from 'react';
import { Satellite, ArrowRight, Loader2, CheckCircle2, ExternalLink, Zap, TrendingDown } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID, WRC_TOKEN_ID, RISK_COMPONENTS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const RISK_BEFORE = { fuel: 20, slope: 12, wui: 16, access: 8, historical: 8, weather: 14 };
const RISK_AFTER  = { fuel: 8,  slope: 12, wui: 10, access: 4, historical: 3, weather: 4  };
const TOTAL_PRE = Object.values(RISK_BEFORE).reduce((a, b) => a + b, 0); // 78
const TOTAL_POST = Object.values(RISK_AFTER).reduce((a, b) => a + b, 0); // 41

const SAT_DATA = {
  ndviBefore: 0.72,
  ndviAfter: 0.38,
  dNBR: 0.34,
  firmsHotspots: 0,
};

const VERIFIED_ACRES = 118.5;

export default function StepProof({ state, updateState, goToStep, pollHcs, pollWrc }: StepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.assessment);
  const [mintStatus, setMintStatus] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setMintStatus('Submitting risk assessment to Guardian...');
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.RISK_INTAKE,
          role: 'satellite',
          data: {
            field0: 'RA-' + Date.now().toString(36).slice(-6),  // assessmentId
            field1: 'TD-001',                                    // siteId
            field2: new Date().toISOString(),                    // assessedAt
            field3: TOTAL_PRE,                                   // preFireRiskScore
            field4: TOTAL_POST,                                  // postFireRiskScore
            field5: Math.round((1 - TOTAL_POST / TOTAL_PRE) * 1000) / 10, // riskReductionPercent
            field6: SAT_DATA.ndviBefore,                         // ndviPreTreatment
            field7: SAT_DATA.ndviAfter,                          // ndviPostTreatment
            field8: SAT_DATA.dNBR,                               // nbrDelta
            field9: SAT_DATA.firmsHotspots,                      // firmsHotspotCount
            field10: RISK_BEFORE.weather / 20,                   // weatherRiskFactor (0-1)
            field11: RISK_BEFORE.slope / 15,                     // slopeRiskFactor (0-1)
            field12: RISK_BEFORE.wui / 20,                       // wuiDensityFactor (0-1)
            field13: VERIFIED_ACRES,                             // verifiedAcres = WRC MINT AMOUNT
            field14: 'FIRMS,Sentinel-2,LANDFIRE,NOAA',           // dataSourcesUsed
            field15: new Date().toISOString().split('T')[0],     // sentinelTileDate
            field16: true,                                       // overallCompliant
            field17: 'mint_wrc',                                 // tokenAction → TRIGGERS MINTING
          },
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({
          assessment: {
            data: { ...RISK_BEFORE, ...SAT_DATA, totalPre: TOTAL_PRE, totalPost: TOTAL_POST } as unknown as Record<string, unknown>,
            hashScanLink: link,
            mintAmount: VERIFIED_ACRES,
          },
        });
        setSuccess(true);
        setMintStatus('Minting WRC tokens...');
        await pollHcs();
        setMintStatus('Waiting for token supply update...');
        await pollWrc();
        setMintStatus('');
      }
    } catch { /* handled */ }
    setSubmitting(false);
  };

  const supplyBefore = state.wrcBefore;
  const supplyAfter = state.wrcAfter;
  const supplyChanged = supplyAfter > supplyBefore;

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #070C0A 0%, #0A1A12 40%, #0D2318 60%, #070C0A 100%)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-emerald-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 6 of 8 · Risk Assessment + WRC Minting
          </p>
          <h1 className="text-white text-4xl font-extralight mb-3" style={{ letterSpacing: '-0.03em' }}>The Proof</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-xl">
            Sentinel-2 confirms the treatment from orbit. NDVI dropped — vegetation was removed as planned. dNBR shows moderate severity. Zero active FIRMS hotspots. The risk score drops from Extreme to Moderate. Every verified acre becomes a Wildfire Resilience Credit.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Satellite Analyst
            </span>
            <span className="font-mono">fresh_sate</span>
          </div>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left: Satellite data */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Satellite size={14} className="text-blue-400" />
              <span className="text-white/85 text-[13px] font-semibold">Satellite Validation</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded ml-auto" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
                Sentinel-2 L2A
              </span>
            </div>
            <div className="p-5 space-y-5">
              {/* NDVI */}
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>NDVI (Vegetation Index)</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Before</span>
                      <span className="font-mono text-emerald-400">{SAT_DATA.ndviBefore}</span>
                    </div>
                    <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded" style={{ width: `${SAT_DATA.ndviBefore * 100}%`, background: '#059669' }} />
                    </div>
                  </div>
                  <TrendingDown size={14} className="text-orange-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>After</span>
                      <span className="font-mono text-orange-400">{SAT_DATA.ndviAfter}</span>
                    </div>
                    <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded" style={{ width: `${SAT_DATA.ndviAfter * 100}%`, background: '#EA580C' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* dNBR */}
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>dNBR (Burn Severity)</div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-bold text-orange-400">{SAT_DATA.dNBR}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Moderate severity — consistent with prescribed burn</span>
                </div>
              </div>

              {/* FIRMS */}
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>FIRMS Active Hotspots</div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-bold text-emerald-400">{SAT_DATA.firmsHotspots}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No active fire detected — burn fully contained</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Risk breakdown */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Zap size={14} className="text-amber-400" />
              <span className="text-white/85 text-[13px] font-semibold">6-Component Risk Score</span>
            </div>
            <div className="p-5 space-y-3">
              {RISK_COMPONENTS.map(c => {
                const pre = RISK_BEFORE[c.key as keyof typeof RISK_BEFORE];
                const post = RISK_AFTER[c.key as keyof typeof RISK_AFTER];
                const changed = pre !== post;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                      <div className="font-mono">
                        <span className="text-red-400">{pre}</span>
                        {changed && <><span className="text-white/20 mx-1">→</span><span className="text-emerald-400">{post}</span></>}
                        <span className="text-white/15 ml-1">/{c.max}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded transition-all duration-700" style={{
                        width: `${(post / c.max) * 100}%`,
                        background: post <= c.max * 0.4 ? '#059669' : post <= c.max * 0.7 ? '#D97706' : '#DC2626',
                      }} />
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/60 text-[11px] font-medium">Total Risk Score</span>
                <div className="font-mono text-lg">
                  <span className="text-red-400 font-bold">{TOTAL_PRE}</span>
                  <span className="text-white/20 mx-2">→</span>
                  <span className="text-emerald-400 font-bold">{TOTAL_POST}</span>
                  <span className="text-emerald-400/50 text-[11px] ml-2">(-{Math.round((1 - TOTAL_POST / TOTAL_PRE) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Acres / Mint amount — THE HERO */}
        <div className="rounded-xl overflow-hidden mb-8 animate-fade-in stagger-3" style={{
          background: 'rgba(5,150,105,0.04)',
          border: '1px solid rgba(5,150,105,0.15)',
        }}>
          <div className="p-8 text-center">
            <div className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(5,150,105,0.6)' }}>
              Verified Treatment Acres = WRC Mint Amount
            </div>
            <div className="text-5xl font-mono font-bold text-emerald-400 mb-2" style={{ textShadow: '0 0 40px rgba(5,150,105,0.3)' }}>
              {VERIFIED_ACRES}
            </div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Wildfire Resilience Credits to mint on Hedera Token Service
            </div>

            {/* Token info */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <span>Token: {WRC_TOKEN_ID}</span>
              <span>|</span>
              <span>Type: HTS Fungible</span>
              <span>|</span>
              <span>1 WRC = 1 treated acre</span>
            </div>
          </div>
        </div>

        {/* Submit / Mint button */}
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-6">
            {success ? (
              <div className="space-y-4">
                {/* Celebration header */}
                <div className="text-center py-6 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.12), rgba(52,211,153,0.06))',
                  border: '1px solid rgba(5,150,105,0.2)',
                  boxShadow: '0 0 60px rgba(5,150,105,0.08)',
                }}>
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
                  <div className="text-emerald-400 text-xl font-semibold mb-1">{VERIFIED_ACRES} WRC Minted</div>
                  <div className="text-white/40 text-[12px]">Wildfire Resilience Credits now live on Hedera</div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[12px] font-medium">Verified on Hedera Consensus Service</span>
                  <a href={state.assessment?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                    View on HashScan <ExternalLink size={10} />
                  </a>
                </div>

                {/* WRC Supply change */}
                <div className="text-center py-4 rounded-lg" style={{
                  background: supplyChanged ? 'rgba(5,150,105,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${supplyChanged ? 'rgba(5,150,105,0.1)' : 'rgba(255,255,255,0.04)'}`,
                }}>
                  <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>WRC Total Supply</div>
                  <div className="font-mono text-lg">
                    <span className="text-white/50">{supplyBefore}</span>
                    <span className="text-white/20 mx-2">→</span>
                    <span className="text-emerald-400 font-bold">{supplyAfter}</span>
                    {supplyChanged && (
                      <span className="text-emerald-400/70 text-sm ml-2">(+{supplyAfter - supplyBefore})</span>
                    )}
                  </div>
                  <a href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono text-orange-400/60 hover:text-orange-400">
                    View token on HashScan <ExternalLink size={9} />
                  </a>
                </div>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl text-base font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: submitting ? 'rgba(5,150,105,0.3)' : '#059669', boxShadow: submitting ? 'none' : '0 0 30px rgba(5,150,105,0.2)' }}>
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin motion-reduce:animate-none" />
                    {mintStatus || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Mint {VERIFIED_ACRES} WRC on Hedera
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Credits minted. Now see what they're worth.</p>
            <button onClick={() => goToStep(6)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              See the Impact <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
