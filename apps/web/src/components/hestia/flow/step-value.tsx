'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, ArrowRight, Loader2, CheckCircle2, ExternalLink, Shield, TrendingUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID, DISCOUNT_TIERS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFD700', Platinum: '#E5E4E2',
};

export default function StepValue({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.insurance);
  const [premium, setPremium] = useState(285000);
  const [acreage, setAcreage] = useState(640);
  const [wrcBalance, setWrcBalance] = useState(118);
  const [apiResult, setApiResult] = useState<{ tierName: string; discountPercent: number; estimatedSavings: number } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute local fallback values
  const localTier = DISCOUNT_TIERS.filter(t => t.discount > 0).reverse().find(t => wrcBalance * 100 >= t.minWrc) || DISCOUNT_TIERS[0];
  const discountPct = apiResult?.discountPercent ?? localTier.discount;
  const tierName = apiResult?.tierName ?? localTier.name;
  const savings = apiResult?.estimatedSavings ?? Math.round(premium * (discountPct / 100));

  const fetchInsurance = useCallback(async (wrc: number, ac: number, prem: number) => {
    setApiLoading(true);
    try {
      const res = await fetch(`/api/hestia/contracts/insurance?wrc=${wrc * 100}&acreage=${ac}&premium=${prem}`);
      if (res.ok) {
        const data = await res.json();
        setApiResult({
          tierName: data.tierName ?? data.tier ?? localTier.name,
          discountPercent: data.discountPercent ?? data.discount ?? localTier.discount,
          estimatedSavings: data.estimatedSavings ?? data.savings ?? Math.round(prem * ((data.discountPercent ?? localTier.discount) / 100)),
        });
      }
    } catch {
      // Use local fallback
      setApiResult(null);
    }
    setApiLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced API call on slider changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchInsurance(wrcBalance, acreage, premium);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [wrcBalance, acreage, premium, fetchInsurance]);

  // Tier progression: position marker on bar
  const activeTiers = DISCOUNT_TIERS.filter(t => t.discount > 0);
  const tierIndex = activeTiers.findIndex(t => t.name === tierName);
  const tierProgressPct = tierIndex >= 0 ? ((tierIndex + 0.5) / activeTiers.length) * 100 : 25;

  // Bar chart data
  const barData = [
    { label: 'Without WRC', premium: premium, savings: 0 },
    { label: 'With WRC', premium: premium - savings, savings: savings },
  ];

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
            field3: premium,
            field4: discountPct,
            field5: savings,
            field6: tierName,
            field7: wrcBalance,
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
            data: { premium, discount: discountPct, savings, tier: tierName } as unknown as Record<string, unknown>,
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

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-16">
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

        {/* Interactive sliders */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <DollarSign size={14} className="text-amber-400" />
            <span className="text-white/85 text-[13px] font-semibold">Adjust Parameters</span>
            {apiLoading && <Loader2 size={12} className="text-amber-400/50 animate-spin ml-auto" />}
          </div>
          <div className="p-6 space-y-6">
            {/* Annual Premium slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Annual Premium</span>
                <span className="text-[14px] font-mono font-bold text-white/80">${premium.toLocaleString()}</span>
              </div>
              <input type="range" min="50000" max="500000" step="5000" value={premium}
                onChange={(e) => setPremium(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#D97706' }} />
              <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>$50K</span><span>$500K</span>
              </div>
            </div>

            {/* Site Acreage slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Site Acreage</span>
                <span className="text-[14px] font-mono font-bold text-white/80">{acreage.toLocaleString()} acres</span>
              </div>
              <input type="range" min="100" max="2000" step="10" value={acreage}
                onChange={(e) => setAcreage(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#D97706' }} />
              <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>100</span><span>2,000</span>
              </div>
            </div>

            {/* WRC Balance slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>WRC Balance</span>
                <span className="text-[14px] font-mono font-bold text-emerald-400">{wrcBalance} WRC</span>
              </div>
              <input type="range" min="0" max="500" step="1" value={wrcBalance}
                onChange={(e) => setWrcBalance(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#059669' }} />
              <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <span>0</span><span>500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column: Tiers + Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Insurance tier visualization + tier progression bar */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Shield size={14} className="text-amber-400" />
              <span className="text-white/85 text-[13px] font-semibold">WRC Discount Tier</span>
            </div>
            <div className="p-6">
              {/* Tier progression bar */}
              <div className="mb-6">
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {activeTiers.map((t, i) => (
                    <div key={t.name} className="absolute top-0 h-full" style={{
                      left: `${(i / activeTiers.length) * 100}%`,
                      width: `${100 / activeTiers.length}%`,
                      background: t.name === tierName ? `${TIER_COLORS[t.name]}30` : 'transparent',
                      borderRight: i < activeTiers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }} />
                  ))}
                  {/* Marker */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300" style={{
                    left: `${tierProgressPct}%`,
                    transform: `translate(-50%, -50%)`,
                    background: TIER_COLORS[tierName] || '#888',
                    borderColor: 'white',
                    boxShadow: `0 0 8px ${TIER_COLORS[tierName] || '#888'}80`,
                  }} />
                </div>
                <div className="flex justify-between mt-2">
                  {activeTiers.map(t => (
                    <span key={t.name} className="text-[9px] font-mono" style={{ color: t.name === tierName ? TIER_COLORS[t.name] : 'rgba(255,255,255,0.2)' }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tier cards */}
              <div className="grid grid-cols-2 gap-2">
                {activeTiers.map(t => {
                  const isActive = t.name === tierName;
                  const color = TIER_COLORS[t.name] || '#888';
                  return (
                    <div key={t.name} className="relative rounded-xl p-4 text-center transition-all"
                      style={{
                        background: isActive ? `${color}10` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? `${color}40` : 'rgba(255,255,255,0.04)'}`,
                      }}>
                      {isActive && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                          Current
                        </div>
                      )}
                      <div className="text-xl font-mono font-bold mb-0.5" style={{ color }}>{t.discount}%</div>
                      <div className="text-[10px] font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>
                        {t.name}
                      </div>
                      <div className="text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {t.minWrc}+ WRC
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bar Chart: Without WRC vs With WRC */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-white/85 text-[13px] font-semibold">Premium Comparison</span>
            </div>
            <div className="p-6" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={40}>
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                  <Bar dataKey="premium" stackId="a" radius={[0, 0, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-premium-${index}`} fill={index === 0 ? '#DC2626' : '#D97706'} fillOpacity={0.6} />
                    ))}
                  </Bar>
                  <Bar dataKey="savings" stackId="a" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-savings-${index}`} fill={index === 0 ? 'transparent' : '#059669'} fillOpacity={index === 0 ? 0 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="px-6 pb-4 flex items-center justify-center gap-4 text-[9px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#DC2626' }} /> Full Premium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#D97706' }} /> Discounted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#059669' }} /> Savings</span>
            </div>
          </div>
        </div>

        {/* Premium calculation */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <DollarSign size={14} className="text-emerald-400" />
            <span className="text-white/85 text-[13px] font-semibold">Premium Calculation</span>
          </div>
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-4 text-xl font-mono">
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Annual Premium</div>
                <span className="text-white/70">${premium.toLocaleString()}</span>
              </div>
              <span className="text-white/20 text-2xl">x</span>
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Discount</div>
                <span className="text-amber-400">{discountPct}%</span>
              </div>
              <span className="text-white/20 text-2xl">=</span>
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(5,150,105,0.6)' }}>Saved / Year</div>
                <span className="text-emerald-400 font-bold text-2xl">${savings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parametric trigger */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-4" style={{
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
        <div className="rounded-xl overflow-hidden mb-8 animate-fade-in stagger-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <TrendingUp size={14} className="text-blue-400" />
            <span className="text-white/85 text-[13px] font-semibold">SEEA Ecosystem Accounting</span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              {[
                { label: 'Stock', desc: 'Forest extent', value: `${acreage} acres mixed conifer`, color: '#059669' },
                { label: 'Flow', desc: 'Risk change', value: '78 → 41 (-47%)', color: '#D97706' },
                { label: 'Monetary', desc: 'Premium value', value: `$${savings.toLocaleString()}/yr`, color: '#FB923C' },
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
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                {submitting ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <DollarSign size={16} />}
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
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              View Trust Chain <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
