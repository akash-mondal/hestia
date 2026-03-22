'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TAGS, HASHSCAN_BASE, DISCOUNT_TIERS, INSURANCE_CALC_ADDRESS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

export default function StepValue({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs }: StepProps) {
  const [premium, setPremium] = useState(285000);
  const [acreage, setAcreage] = useState(640);
  const [wrcBal, setWrcBal] = useState(Math.round(state.assessment?.mintAmount || 118));
  const [discount, setDiscount] = useState<{ tier: string; discount: number; savings: number; parametricTriggered?: boolean; source?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.insurance);
  const [impactId] = useState(() => 'INS-' + Date.now().toString(36).slice(-4));

  const fetchDiscount = useCallback(async () => {
    try {
      const firmsCount = (state.satellite?.fires as { count?: number })?.count || 0;
      const res = await fetch(`/api/hestia/contracts/insurance?premium=${premium}&acreage=${acreage}&wrc=${wrcBal * 100}&firms=${firmsCount}`);
      if (res.ok) { const d = await res.json(); setDiscount(d); }
    } catch {
      const tier = [...DISCOUNT_TIERS].reverse().find(t => wrcBal >= t.minWrc) || DISCOUNT_TIERS[0];
      setDiscount({ tier: tier.name, discount: tier.discount, savings: Math.round(premium * tier.discount / 100) });
    }
  }, [premium, acreage, wrcBal, state.satellite]);

  useEffect(() => { fetchDiscount(); }, [fetchDiscount]);

  const tierIdx = DISCOUNT_TIERS.findIndex(t => t.name === discount?.tier);
  const wrcPerAcre = acreage > 0 ? (wrcBal / acreage).toFixed(2) : '0';
  const chartData = [{ name: 'Without WRC', value: premium, fill: '#DC2626' }, { name: 'With WRC', value: premium - (discount?.savings || 0), fill: '#10B981' }];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.INSURANCE_INTAKE, role: 'satellite',
          data: { field0: impactId, field1: 'TD-DEMO', field2: new Date().toISOString(), field3: 78, field4: 41,
            field5: discount?.discount || 39, field6: discount?.savings || 111150, field7: 5, field8: 2500000,
            field9: 'Forest Extent', field10: 'Risk Reduction', field11: discount?.savings || 111150 },
        }),
      });
      if (res.ok) { setSuccess(true); const link = await pollHcs(); updateState({ insurance: { data: { tier: discount?.tier, savings: discount?.savings }, hashScanLink: link } }); completeStep(); }
    } catch {}
    setSubmitting(false);
  };

  const pulse = (a: boolean) => a ? { animation: 'gp 2s ease-in-out infinite' } : {};

  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,0)}50%{box-shadow:0 0 0 6px rgba(251,146,60,0.2)}}`}</style>

      <div className="w-full max-w-5xl px-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(251,146,60,0.5)' }}>Step 7 · Insurance Impact</span>
          <span className="px-2 py-0.5 text-[9px] font-medium" style={{ background: 'rgba(251,146,60,0.08)', color: '#FB923C', borderRadius: 4 }}>Land Manager</span>
        </div>

        {/* Hero — savings amount */}
        <div className="flex items-end gap-6 mb-6">
          <div>
            <div style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 100, lineHeight: 0.85, letterSpacing: '-0.05em', color: '#10B981' }}>
              ${(discount?.savings || 0).toLocaleString()}
            </div>
            <div className="text-[13px] text-white/25 mt-1" style={{ fontWeight: 300 }}>annual premium savings</div>
          </div>
          <div className="pb-1 flex gap-6">
            <div>
              <div className="text-[10px] text-white/15 uppercase tracking-wider">Tier</div>
              <div className="text-lg font-mono text-orange-400" style={{ fontWeight: 300 }}>{discount?.tier || '...'}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/15 uppercase tracking-wider">Discount</div>
              <div className="text-lg font-mono text-emerald-400" style={{ fontWeight: 300 }}>{discount?.discount || 0}%</div>
            </div>
            <div>
              <div className="text-[10px] text-white/15 uppercase tracking-wider">WRC/Acre</div>
              <div className="text-lg font-mono text-white/50" style={{ fontWeight: 300 }}>{wrcPerAcre}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left — tier + sliders */}
          <div>
            {/* Tier progression */}
            <div className="mb-5">
              <div className="flex gap-1 mb-2">
                {DISCOUNT_TIERS.map((t, i) => (
                  <div key={t.name} className="flex-1">
                    <div className="h-1.5 mb-1" style={{
                      background: i <= tierIdx ? (i === tierIdx ? '#FB923C' : '#059669') : 'rgba(255,255,255,0.04)',
                      borderRadius: 2,
                      boxShadow: i === tierIdx ? '0 0 8px rgba(251,146,60,0.3)' : 'none',
                    }} />
                    <div className="text-[9px] text-center" style={{ color: i === tierIdx ? '#FB923C' : i < tierIdx ? '#059669' : 'rgba(255,255,255,0.15)' }}>
                      {t.name} <span className="text-white/10">{t.discount}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[7px] font-mono text-white/10">
                  <a href={`${HASHSCAN_BASE}/contract/${INSURANCE_CALC_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400/40">
                    {INSURANCE_CALC_ADDRESS.slice(0, 10)}... · {discount?.source === 'hedera_testnet' ? 'on-chain' : 'fallback'}
                  </a>
                </span>
                {discount && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5" style={{
                    background: discount.parametricTriggered ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.06)',
                    color: discount.parametricTriggered ? '#EF4444' : '#10B981',
                    borderRadius: 3,
                  }}>
                    Parametric: {discount.parametricTriggered ? 'TRIGGERED' : 'SAFE'} ({(state.satellite?.fires as { count?: number })?.count || 0}/5)
                  </span>
                )}
              </div>
            </div>

            {guidePhase === 1 && !success && (
              <button onClick={advanceGuide} className="w-full py-2.5 mb-4 text-[11px] font-medium text-white/50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(true) }}>
                Got it
              </button>
            )}

            {/* Sliders (phase 2+) */}
            {guidePhase >= 2 && (
              <div className="space-y-4">
                {[
                  { label: 'Annual Premium', value: premium, set: setPremium, min: 50000, max: 500000, fmt: (v: number) => `$${(v / 1000).toFixed(0)}K` },
                  { label: 'Site Acreage', value: acreage, set: setAcreage, min: 100, max: 2000, fmt: (v: number) => `${v} ac` },
                  { label: 'WRC Balance', value: wrcBal, set: setWrcBal, min: 0, max: 500, fmt: (v: number) => `${v}` },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-white/20">{s.label}</span><span className="font-mono text-white/40">{s.fmt(s.value)}</span></div>
                    <input type="range" min={s.min} max={s.max} value={s.value} onChange={e => s.set(Number(e.target.value))} className="w-full h-1 rounded-full appearance-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                ))}
                {guidePhase === 2 && !success && (
                  <button onClick={advanceGuide} className="w-full py-2.5 text-[11px] font-medium text-white/50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(true) }}>Lock Parameters</button>
                )}
              </div>
            )}
          </div>

          {/* Right — chart + SEEA */}
          <div>
            <div className="mb-4" style={{ height: 180 }}>
              <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Premium Comparison</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>{chartData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.6} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SEEA */}
            {discount && (
              <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="text-[9px] text-white/15 uppercase tracking-wider mb-2">UN SEEA Ecosystem Accounting</div>
                {[
                  ['Stock', '640 acres mixed conifer forest'],
                  ['Flow', `Risk ${String(state.assessment?.data?.preTotal ?? 78)} → ${String(state.assessment?.data?.postTotal ?? 41)} (${String(state.assessment?.data?.reductionPct ?? 47)}% reduction)`],
                  ['Monetary', `$${discount.savings.toLocaleString()}/yr premium savings`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-white/15">{k}</span>
                    <span className="font-mono text-white/30">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-5">
          {guidePhase >= 3 && !success && (
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: '#EA580C', borderRadius: 8, ...pulse(!submitting) }}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Recording...</span> : 'Record Insurance Impact on Hedera'}
            </button>
          )}
          {success && (
            <div className="flex items-center justify-between py-3 px-4" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.1)', borderRadius: 8 }}>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-400" /><span className="text-orange-400 text-[12px]">Insurance impact recorded</span></div>
              <a href={state.insurance?.hashScanLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-orange-400/50 hover:text-orange-400 flex items-center gap-1">HashScan <ExternalLink size={9} /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
