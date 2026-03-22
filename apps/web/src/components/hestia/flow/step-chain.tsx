'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Copy, CheckCircle2, Coins, ShieldCheck, Flame, TreePine, MapPin, Satellite, DollarSign } from 'lucide-react';
import { HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const CHAIN = [
  { icon: Coins,       title: 'WRC Token Mint',    sub: 'Fungible token on HTS',           color: '#818CF8', key: 'assessment' },
  { icon: Satellite,   title: 'Risk Assessment',   sub: '6-component dMRV score',          color: '#818CF8', key: 'assessment' },
  { icon: Flame,       title: 'Treatment Report',  sub: 'Fuel reduction + containment',    color: '#F59E0B', key: 'report' },
  { icon: TreePine,    title: 'Treatment Plan',    sub: 'Prescribed burn approved',        color: '#F59E0B', key: 'plan' },
  { icon: MapPin,      title: 'Site Registration', sub: 'Tahoe Donner on-chain',           color: '#FB923C', key: 'site' },
  { icon: ShieldCheck, title: 'Verifier Approval', sub: 'CAL FIRE inspector approved',     color: '#10B981', key: 'siteApproval' },
  { icon: DollarSign,  title: 'Insurance Impact',  sub: 'Premium reduction recorded',      color: '#FB923C', key: 'insurance' },
];

export default function StepChain({ state, completeStep }: StepProps) {
  const [revealed, setRevealed] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timers = CHAIN.map((_, i) => setTimeout(() => {
      setRevealed(p => Math.max(p, i + 1));
      if (i === CHAIN.length - 1) completeStep();
    }, (i + 1) * 400));
    return () => timers.forEach(clearTimeout);
  }, [completeStep]);

  const getLink = (key: string) => (state[key as keyof typeof state] as { hashScanLink?: string } | null)?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(CHAIN.map(l => `${l.title}: ${getLink(l.key)}`).join('\n'));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [state]);

  const wrcDelta = state.wrcAfter - state.wrcBefore;
  const vcCount = CHAIN.filter(l => !!(state[l.key as keyof typeof state])).length;
  const savings = Number((state.insurance?.data as Record<string, unknown>)?.savings) || 0;

  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0810' }}>
      <div className="w-full max-w-2xl px-10">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-[12px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(251,146,60,0.4)' }}>Step 8 · Trust Chain</span>
          <h1 className="text-white mt-2" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 100, letterSpacing: '-0.04em' }}>
            The Chain
          </h1>
        </div>

        {/* Summary stats */}
        <div className="flex items-center justify-center gap-8 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { label: 'Credentials', value: String(vcCount) },
            { label: 'HCS Messages', value: String(state.hcsMessages.length || '—') },
            { label: 'WRC Minted', value: state.assessment?.mintAmount ? String(state.assessment.mintAmount) : '—', accent: '#818CF8' },
            { label: 'Annual Savings', value: savings > 0 ? `$${savings.toLocaleString()}` : '—', accent: '#10B981' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-mono" style={{ color: s.accent || 'rgba(255,255,255,0.6)', fontWeight: 300 }}>{s.value}</div>
              <div className="text-[11px] text-white/65 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chain nodes */}
        <div className="space-y-1 mb-5">
          {CHAIN.map((level, i) => {
            const Icon = level.icon;
            const show = i < revealed;
            const hasData = !!(state[level.key as keyof typeof state]);

            if (!show) return <div key={i} className="h-10" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 6 }} />;

            return (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 animate-fade-in" style={{ borderRadius: 6, background: hasData ? `${level.color}05` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <Icon size={14} style={{ color: level.color, opacity: 0.6 }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-white/60">{level.title}</span>
                  <span className="text-[11px] text-white/65 ml-2">{level.sub}</span>
                </div>
                {hasData && <CheckCircle2 size={12} className="text-emerald-400/60 shrink-0" />}
                <a href={getLink(level.key)} target="_blank" rel="noopener noreferrer" className="text-[12px] font-mono text-white/65 hover:text-orange-400 flex items-center gap-1 shrink-0">
                  HashScan <ExternalLink size={8} />
                </a>
              </div>
            );
          })}
        </div>

        {/* Copy */}
        <button onClick={copyAll} className="w-full py-2.5 text-[11px] font-medium transition-all mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: copied ? '#10B981' : 'rgba(255,255,255,0.4)' }}>
          {copied ? <span className="flex items-center justify-center gap-1"><CheckCircle2 size={11} /> Copied</span> : <span className="flex items-center justify-center gap-1"><Copy size={11} /> Copy All Proof Links</span>}
        </button>

        {/* Daniel's framework with real data */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Nature', color: '#10B981', data: `640 acres · ${(state.satellite?.fires as { count?: number })?.count || 18} FIRMS` },
            { label: 'Outcome', color: '#3B82F6', data: `Risk ${String(state.assessment?.data?.preTotal ?? 78)} → ${String(state.assessment?.data?.postTotal ?? 41)}` },
            { label: 'Unit', color: '#818CF8', data: `${state.assessment?.mintAmount || '—'} WRC` },
            { label: 'Value', color: '#FB923C', data: savings > 0 ? `$${savings.toLocaleString()}/yr` : '—' },
          ].map(item => (
            <div key={item.label} className="text-center py-3" style={{ borderTop: `2px solid ${item.color}30` }}>
              <div className="text-[12px] uppercase tracking-wider mb-1" style={{ color: `${item.color}60` }}>{item.label}</div>
              <div className="text-[12px] font-mono text-white/60">{item.data}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-white/60 italic">This is what a fire ledger looks like.</p>
      </div>
    </div>
  );
}
