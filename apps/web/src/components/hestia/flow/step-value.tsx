'use client';

import { useState } from 'react';
import { DollarSign, ArrowRight, Loader2, CheckCircle2, ExternalLink, Shield, TrendingUp, Zap } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID, DISCOUNT_TIERS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const PREMIUM = 285000;
const DISCOUNT_PCT = 39;
const SAVINGS = Math.round(PREMIUM * (DISCOUNT_PCT / 100));
const ACTIVE_TIER = 'Gold';

export default function StepValue({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.insurance);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.INSURANCE_INTAKE,
          role: 'satellite',
          data: {
            field0: 'INS-' + Date.now().toString(36).slice(-4),
            field1: 'TD-001',
            field2: 'Swiss Re',
            field3: PREMIUM,
            field4: DISCOUNT_PCT,
            field5: SAVINGS,
            field6: ACTIVE_TIER,
            field7: 118.5,
            field8: 'parametric',
            field9: 5,
            field10: 2500000,
            field11: 'FIRMS_hotspot_count',
            field12: 'SEEA_EA_v2025',
          },
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({
          insurance: {
            data: { premium: PREMIUM, discount: DISCOUNT_PCT, savings: SAVINGS, tier: ACTIVE_TIER } as unknown as Record<string, unknown>,
            hashScanLink: link,
          },
        });
        setSuccess(true);
        await pollHcs();
      }
    } catch { /* handled */ }
    setSubmitting(false);
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0C0A05 0%, #1A1508 50%, #0C0A05 100%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-amber-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 7 of 8 · Insurance Impact
          </p>
          <h1 className="text-white text-4xl font-extralight mb-3" style={{ letterSpacing: '-0.03em' }}>The Value</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-xl">
            Wildfire resilience isn't just about nature — it's about money. Swiss Re sees the treatment, the satellite proof, and the risk score drop. They offer Maria a premium discount. The forest's reduced risk has a dollar value now.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Satellite Analyst
            </span>
            <span className="font-mono">fresh_sate</span>
          </div>
        </div>

        {/* Insurance tier visualization */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Shield size={14} className="text-amber-400" />
            <span className="text-white/85 text-[13px] font-semibold">WRC Insurance Discount Tiers</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-3">
              {DISCOUNT_TIERS.filter(t => t.discount > 0).map(t => {
                const isActive = t.name === ACTIVE_TIER;
                const tierColors: Record<string, string> = {
                  Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700', Platinum: '#E5E4E2',
                };
                const color = tierColors[t.name] || '#888';
                return (
                  <div key={t.name} className="relative rounded-xl p-5 text-center transition-all"
                    style={{
                      background: isActive ? `rgba(255,215,0,0.06)` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.04)'}`,
                      boxShadow: isActive ? '0 0 30px rgba(255,215,0,0.08)' : 'none',
                    }}>
                    {isActive && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
                        Tahoe Benchmark
                      </div>
                    )}
                    <div className="text-2xl font-mono font-bold mb-1" style={{ color }}>{t.discount}%</div>
                    <div className="text-[11px] font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>
                      {t.name}
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {t.minWrc}+ WRC
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Premium calculation */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <DollarSign size={14} className="text-emerald-400" />
            <span className="text-white/85 text-[13px] font-semibold">Premium Calculation</span>
          </div>
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-4 text-xl font-mono">
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Annual Premium</div>
                <span className="text-white/70">${PREMIUM.toLocaleString()}</span>
              </div>
              <span className="text-white/20 text-2xl">x</span>
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Discount</div>
                <span className="text-amber-400">{DISCOUNT_PCT}%</span>
              </div>
              <span className="text-white/20 text-2xl">=</span>
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(5,150,105,0.6)' }}>Saved / Year</div>
                <span className="text-emerald-400 font-bold text-2xl">${SAVINGS.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parametric trigger */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-3" style={{
          background: 'rgba(234,88,12,0.04)',
          border: '1px solid rgba(234,88,12,0.12)',
        }}>
          <div className="p-6 flex items-start gap-4">
            <Zap size={20} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-white/80 text-sm font-medium mb-1">Parametric Trigger</div>
              <p className="text-white/40 text-[12px] leading-relaxed">
                If 5+ FIRMS hotspots detected within the treatment boundary — automatic <span className="text-orange-400 font-mono font-medium">$2.5M</span> payout.
                No claims process. No adjuster. Satellite data triggers the smart contract directly.
              </p>
              <div className="mt-2 flex items-center gap-3 text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>Oracle: FIRMS VIIRS</span>
                <span>|</span>
                <span>Threshold: 5 hotspots</span>
                <span>|</span>
                <span>Settlement: &lt; 24h</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEEA accounting */}
        <div className="rounded-xl overflow-hidden mb-8 animate-fade-in stagger-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <TrendingUp size={14} className="text-blue-400" />
            <span className="text-white/85 text-[13px] font-semibold">SEEA Ecosystem Accounting</span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              {[
                { label: 'Stock', desc: 'Forest extent', value: '640 acres mixed conifer', color: '#059669' },
                { label: 'Flow', desc: 'Risk change', value: '78 → 41 (-47%)', color: '#D97706' },
                { label: 'Monetary', desc: 'Premium value', value: `$${SAVINGS.toLocaleString()}/yr`, color: '#FB923C' },
              ].map((item, i) => (
                <div key={item.label} className="flex-1 flex items-center gap-3">
                  <div className="flex-1 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: item.color }}>{item.label}</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
                    <div className="text-[12px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.value}</div>
                  </div>
                  {i < 2 && <ArrowRight size={12} className="text-white/10 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-6">
            {success ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-[12px] font-medium">Insurance impact recorded on Hedera</span>
                <a href={state.insurance?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                  View on HashScan <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#EA580C' }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                {submitting ? 'Recording insurance impact...' : 'Record Insurance Impact on Hedera'}
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">The value is proven. See the complete chain of evidence.</p>
            <button onClick={() => goToStep(7)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              View Trust Chain <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
