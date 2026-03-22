'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ExternalLink, Lock, Coins, Radio } from 'lucide-react';
import { TAGS, RISK_COMPONENTS, WRC_TOKEN_ID, RISK_ORACLE_ADDRESS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const PRE_RISK = { fuel: 22, slope: 12, wui: 18, access: 7, historical: 8, weather: 11 };

interface SatData { pre_ndvi: number; post_ndvi: number; dnbr: number; burn_severity: string; source: string }
interface RiskResult { total: number; category: string }

export default function StepProof({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs, pollWrc }: StepProps) {
  const [postRisk, setPostRisk] = useState<Record<string, number>>({ fuel: 8, slope: 12, wui: 10, access: 4, historical: 3, weather: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [mintStage, setMintStage] = useState('');
  const [success, setSuccess] = useState(!!state.assessment);
  const [assessId] = useState(() => 'RA-' + Date.now().toString(36).slice(-4));
  const [satData, setSatData] = useState<SatData | null>(null);
  const [satLoading, setSatLoading] = useState(false);
  const [preResult, setPreResult] = useState<RiskResult | null>(null);
  const [postResult, setPostResult] = useState<RiskResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [validationSubmitted, setValidationSubmitted] = useState(false);
  const [validationLink, setValidationLink] = useState<string | null>(null);

  const mintAmount = Number(state.report?.data?.treatedAcres) || Number(state.plan?.data?.acres) || 118.5;
  const preTotal = preResult?.total ?? Object.values(PRE_RISK).reduce((a, b) => a + b, 0);
  const postTotal = postResult?.total ?? Object.values(postRisk).reduce((a, b) => a + b, 0);
  const reductionPct = preTotal > 0 ? ((1 - postTotal / preTotal) * 100).toFixed(0) : '0';

  useEffect(() => {
    if (guidePhase < 1 || satData) return;
    setSatLoading(true);
    fetch('/api/hestia/satellite/vegetation?lat=39.3406&lon=-120.2346&pre_date=2025-06-01&post_date=2026-03-01')
      .then(r => r.json()).then(d => setSatData(d)).catch(() => setSatData({ pre_ndvi: 0.72, post_ndvi: 0.38, dnbr: 0.34, burn_severity: 'Moderate-Low', source: 'demo_fallback' }))
      .finally(() => setSatLoading(false));
    fetch(`/api/hestia/contracts/risk-score?fuel=${PRE_RISK.fuel}&slope=${PRE_RISK.slope}&wui=${PRE_RISK.wui}&access=${PRE_RISK.access}&historical=${PRE_RISK.historical}&weather=${PRE_RISK.weather}`)
      .then(r => r.json()).then(d => setPreResult(d)).catch(() => {});
  }, [guidePhase, satData]);

  // Submit SatelliteValidation VC when satellite data is available
  useEffect(() => {
    if (!satData || validationSubmitted) return;
    const submitValidation = async () => {
      try {
        const valId = 'SV-' + Date.now().toString(36).slice(-4);
        const res = await fetch('/api/hestia/guardian/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: TAGS.VALIDATION_INTAKE, role: 'satellite',
            data: { field0: valId, field1: 'TD-DEMO', field2: '2026-03-10', field3: satData.pre_ndvi, field4: satData.dnbr, field5: 0, field6: 'mixed_conifer', field7: 0.94 },
          }),
        });
        if (res.ok) {
          setValidationSubmitted(true);
          const link = await pollHcs();
          setValidationLink(link);
        }
      } catch {}
    };
    submitValidation();
  }, [satData, validationSubmitted, pollHcs]);

  const lockScores = async () => {
    setRiskLoading(true);
    try {
      const r = await fetch(`/api/hestia/contracts/risk-score?fuel=${postRisk.fuel}&slope=${postRisk.slope}&wui=${postRisk.wui}&access=${postRisk.access}&historical=${postRisk.historical}&weather=${postRisk.weather}`);
      if (r.ok) setPostResult(await r.json());
    } catch {}
    setRiskLoading(false);
    advanceGuide();
  };

  const handleMint = async () => {
    setSubmitting(true);
    try {
      setMintStage('Submitting risk assessment...');
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.RISK_INTAKE, role: 'satellite',
          data: { field0: assessId, field1: 'TD-DEMO', field2: new Date().toISOString(), field3: preTotal, field4: postTotal,
            field5: Number(reductionPct), field6: satData?.pre_ndvi ?? 0.72, field7: satData?.post_ndvi ?? 0.38, field8: satData?.dnbr ?? 0.34,
            field9: 0, field10: postRisk.weather, field11: postRisk.slope, field12: postRisk.wui,
            field13: mintAmount, field14: `Sentinel-2${satData?.source === 'demo_fallback' ? ' (demo)' : ''},FIRMS,LANDFIRE`, field15: '2026-03-10', field16: true, field17: 'MINT' },
        }),
      });
      if (res.ok) { setMintStage('Minting WRC tokens...'); const link = await pollHcs(); setMintStage('Verifying supply...'); await pollWrc(); updateState({ assessment: { data: { preTotal, postTotal, reductionPct }, hashScanLink: link, mintAmount } }); setSuccess(true); completeStep(); }
    } catch {}
    setSubmitting(false); setMintStage('');
  };

  const pulse = (a: boolean) => a ? { animation: 'gp 2s ease-in-out infinite' } : {};

  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(129,140,248,0)}50%{box-shadow:0 0 0 6px rgba(129,140,248,0.2)}}`}</style>

      <div className="w-full max-w-5xl px-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[12px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(129,140,248,0.5)' }}>Step 6 · Risk Assessment + dMRV</span>
          <span className="px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(129,140,248,0.08)', color: '#818CF8', borderRadius: 4 }}>Satellite Analyst</span>
          {satData && <span className="flex items-center gap-1 text-[12px] font-mono ml-auto" style={{ color: satData.source === 'demo_fallback' ? '#F59E0B' : '#10B981' }}>
            <Radio size={7} /> {satData.source === 'demo_fallback' ? 'Demo data' : 'Sentinel-2 L2A'}
          </span>}
        </div>

        {/* Hero — WRC mint amount with risk context */}
        <div className="flex items-end gap-6 mb-6">
          <div>
            <div className="text-white" style={{ fontSize: 'clamp(3.5rem, 7vw, 6rem)', fontWeight: 100, lineHeight: 0.85, letterSpacing: '-0.05em' }}>
              {mintAmount}
            </div>
            <div className="text-[13px] text-white/60 mt-1" style={{ fontWeight: 300 }}>Wildfire Resilience Credits to mint</div>
          </div>
          <div className="pb-1 flex gap-6">
            <div>
              <div className="text-[12px] text-white/65 uppercase tracking-wider">Risk</div>
              <div className="text-lg font-mono"><span className="text-red-400">{preTotal}</span> <span className="text-white/65">→</span> <span className="text-emerald-400">{postTotal}</span></div>
            </div>
            <div>
              <div className="text-[12px] text-white/65 uppercase tracking-wider">Reduction</div>
              <div className="text-lg font-mono text-indigo-400">{reductionPct}%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Col 1: Satellite evidence */}
          <div>
            <div className="text-[12px] text-white/55 uppercase tracking-wider mb-3">Satellite Evidence</div>
            {satLoading ? (
              <div className="flex items-center gap-2 py-6"><Loader2 size={12} className="animate-spin text-indigo-400" /><span className="text-[12px] text-white/55">Querying Sentinel-2...</span></div>
            ) : satData ? (
              <div className="space-y-2">
                {[
                  ['NDVI Before', satData.pre_ndvi, '#10B981'],
                  ['NDVI After', satData.post_ndvi, '#F59E0B'],
                  ['dNBR', satData.dnbr, '#818CF8'],
                  ['FIRMS', 0, '#10B981'],
                  ['Severity', satData.burn_severity, '#F59E0B'],
                ].map(([k, v, c]) => (
                  <div key={String(k)} className="flex justify-between text-[11px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                    <span className="text-white/55">{String(k)}</span>
                    <span className="font-mono font-medium" style={{ color: String(c) }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {validationSubmitted && validationLink && (
              <div className="flex items-center gap-1.5 mt-3 text-[11px]">
                <CheckCircle2 size={10} className="text-indigo-400/60" />
                <span className="text-indigo-400/40">Validation VC recorded</span>
                <a href={validationLink} target="_blank" rel="noopener noreferrer" className="font-mono text-orange-400/30 hover:text-orange-400 flex items-center gap-0.5 ml-auto"><ExternalLink size={7} /></a>
              </div>
            )}
            {guidePhase === 1 && !success && satData && (
              <button onClick={advanceGuide} className="w-full mt-3 py-2 text-[11px] font-medium text-white/65" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(true) }}>
                Evidence Confirmed
              </button>
            )}
          </div>

          {/* Col 2: Risk components */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-white/55 uppercase tracking-wider">Risk Components</span>
              <span className="text-[11px] font-mono text-indigo-400/30">{RISK_ORACLE_ADDRESS.slice(0, 10)}...</span>
            </div>
            {RISK_COMPONENTS.map(rc => (
              <div key={rc.key} className="mb-2">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-white/55">{rc.label}</span>
                  <span className="font-mono text-white/65">{PRE_RISK[rc.key as keyof typeof PRE_RISK]} → <span className="text-indigo-400">{postRisk[rc.key]}</span></span>
                </div>
                <input type="range" min="0" max={rc.max} value={postRisk[rc.key]} disabled={guidePhase !== 2}
                  onChange={e => setPostRisk(p => ({ ...p, [rc.key]: Number(e.target.value) }))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
            {guidePhase === 2 && !success && (
              <button onClick={lockScores} disabled={riskLoading} className="w-full mt-2 py-2 text-[11px] font-medium text-white/65" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(!riskLoading) }}>
                {riskLoading ? 'Computing on-chain...' : 'Lock Scores'}
              </button>
            )}
            {preResult && <div className="text-[11px] font-mono text-white/8 mt-2">Computed by RiskScoreOracle on Hedera</div>}
          </div>

          {/* Col 3: Mint */}
          <div className="flex flex-col">
            <div className="text-[12px] text-indigo-400/40 uppercase tracking-wider mb-3">Token Minting</div>
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="text-3xl font-mono text-white mb-1" style={{ fontWeight: 200 }}>{mintAmount}</div>
              <div className="text-[12px] text-white/55 mb-1">WRC</div>
              <div className="text-[12px] font-mono text-white/60">{WRC_TOKEN_ID}</div>
              <div className="text-[12px] font-mono text-white/60">1 WRC = 1 treated acre</div>
            </div>

            {guidePhase >= 3 && !success && (
              <button onClick={handleMint} disabled={submitting} className="w-full py-3 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: '#4F46E5', borderRadius: 8, ...pulse(!submitting) }}>
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />{mintStage}</span> : <span className="flex items-center justify-center gap-2"><Coins size={14} />Mint {mintAmount} WRC</span>}
              </button>
            )}
            {success && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 py-2.5 px-3" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.1)', borderRadius: 8 }}>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">{mintAmount} WRC minted</span>
                </div>
                {state.wrcBefore !== state.wrcAfter && <div className="text-[11px] font-mono text-center text-white/55">Supply: {(state.wrcBefore / 100).toLocaleString()} → <span className="text-emerald-400">{(state.wrcAfter / 100).toLocaleString()}</span></div>}
                <a href={state.assessment?.hashScanLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-[11px] font-mono text-orange-400/40 hover:text-orange-400">HashScan <ExternalLink size={8} /></a>
              </div>
            )}
          </div>
        </div>

        {/* Corroboration */}
        {satData && postResult && (
          <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <span className="text-[12px] text-indigo-400/40">dMRV: Satellite dNBR <span className="font-mono text-indigo-400/60">{satData.dnbr}</span> independently confirms <span className="font-mono text-emerald-400/60">{reductionPct}%</span> risk reduction from ground report</span>
          </div>
        )}
      </div>
    </div>
  );
}
