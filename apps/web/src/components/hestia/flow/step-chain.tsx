'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Copy, CheckCircle2, Coins, ShieldCheck, Flame, TreePine, MapPin, Satellite, DollarSign, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { HASHSCAN_BASE, INSTANCE_TOPIC_ID, WRC_TOKEN_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

interface ChainLevel {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  details: { label: string; value: string }[];
  link?: string;
}

interface LiveData {
  consensusTimestamp: string;
  sequenceNumber: number;
}

export default function StepChain({ state }: StepProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });
  const [copied, setCopied] = useState(false);
  const [liveData, setLiveData] = useState<Record<number, LiveData>>({});
  const [liveLoading, setLiveLoading] = useState<Record<number, boolean>>({});

  const topicLink = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
  const tokenLink = `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`;

  const chain: ChainLevel[] = [
    {
      icon: Coins,
      title: 'WRC Token Mint',
      subtitle: `${state.assessment?.mintAmount || 118.5} Wildfire Resilience Credits minted on Hedera Token Service`,
      color: '#059669',
      details: [
        { label: 'Token ID', value: WRC_TOKEN_ID },
        { label: 'Amount', value: `${state.assessment?.mintAmount || 118.5} WRC` },
        { label: 'Supply Before', value: String(state.wrcBefore) },
        { label: 'Supply After', value: String(state.wrcAfter) },
      ],
      link: tokenLink,
    },
    {
      icon: ShieldCheck,
      title: 'Risk Assessment',
      subtitle: 'Pre 78 → Post 41, 47% risk reduction verified by satellite + 6-component model',
      color: '#D97706',
      details: [
        { label: 'Risk Pre', value: '78/100 (Extreme)' },
        { label: 'Risk Post', value: '41/100 (Moderate)' },
        { label: 'Reduction', value: '47%' },
        { label: 'Verified Acres', value: '118.5' },
      ],
      link: state.assessment?.hashScanLink || topicLink,
    },
    {
      icon: Flame,
      title: 'Treatment Report',
      subtitle: '118.5 acres treated, 77.3% fuel reduction, containment verified',
      color: '#EA580C',
      details: [
        { label: 'Treated Acres', value: '118.5 of 120 (98.75%)' },
        { label: 'Fuel Load', value: '18.5 → 4.2 tons/acre' },
        { label: 'Reduction', value: '77.3%' },
        { label: 'Containment', value: 'Verified — 0 hotspots at 48h' },
        { label: 'Crew Lead', value: 'J. Martinez, CAL FIRE RX Lead' },
      ],
      link: state.report?.hashScanLink || topicLink,
    },
    {
      icon: TreePine,
      title: 'Treatment Plan',
      subtitle: 'Prescribed burn, CALFIRE-RX-2024-0847 certified, AQMD permitted',
      color: '#D97706',
      details: [
        { label: 'Type', value: 'Prescribed Burn' },
        { label: 'Planned Acres', value: '120' },
        { label: 'Crew Cert', value: 'CALFIRE-RX-2024-0847' },
        { label: 'Burn Permit', value: 'AQMD-BP-2026-0312' },
        { label: 'Env Clearance', value: 'Approved' },
      ],
      link: state.plan?.hashScanLink || topicLink,
    },
    {
      icon: MapPin,
      title: 'Site Registration',
      subtitle: 'Tahoe Donner Unit 7, 640 acres, 187 structures in WUI',
      color: '#FB923C',
      details: [
        { label: 'Site', value: 'Tahoe Donner Unit 7' },
        { label: 'Owner', value: 'Tahoe Donner Association' },
        { label: 'Acreage', value: '640 acres' },
        { label: 'WUI Structures', value: '187 homes' },
        { label: 'Vegetation', value: 'Mixed conifer' },
      ],
      link: state.site?.hashScanLink || topicLink,
    },
    {
      icon: Satellite,
      title: 'Satellite Validation',
      subtitle: 'NDVI 0.72 → 0.38, dNBR 0.34, 0 FIRMS hotspots',
      color: '#3B82F6',
      details: [
        { label: 'NDVI Before', value: '0.72' },
        { label: 'NDVI After', value: '0.38' },
        { label: 'dNBR', value: '0.34 (moderate severity)' },
        { label: 'FIRMS Hotspots', value: '0 (fully contained)' },
        { label: 'Source', value: 'Sentinel-2 L2A + NASA FIRMS VIIRS' },
      ],
      link: state.assessment?.hashScanLink || topicLink,
    },
    {
      icon: DollarSign,
      title: 'Insurance Impact',
      subtitle: '39% premium reduction, $111,150 annual savings, parametric trigger set',
      color: '#059669',
      details: [
        { label: 'Insurer', value: 'Swiss Re' },
        { label: 'Tier', value: 'Gold (39% discount)' },
        { label: 'Premium', value: '$285,000/year' },
        { label: 'Savings', value: '$111,150/year' },
        { label: 'Parametric Trigger', value: '5+ FIRMS hotspots → $2.5M auto-payout' },
      ],
      link: state.insurance?.hashScanLink || topicLink,
    },
  ];

  const allLinks = chain.map(c => c.link).filter(Boolean) as string[];
  const uniqueLinks = [...new Set(allLinks)];

  const copyAllLinks = () => {
    const text = uniqueLinks.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchLiveData = useCallback(async (index: number) => {
    if (liveData[index] || liveLoading[index]) return;
    setLiveLoading(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch(`/api/mirror?path=/topics/${INSTANCE_TOPIC_ID}/messages?limit=1&order=desc`);
      if (res.ok) {
        const data = await res.json();
        const msg = data.messages?.[0];
        if (msg) {
          setLiveData(prev => ({
            ...prev,
            [index]: {
              consensusTimestamp: String(msg.consensus_timestamp),
              sequenceNumber: Number(msg.sequence_number),
            },
          }));
        }
      }
    } catch { /* ignore */ }
    setLiveLoading(prev => ({ ...prev, [index]: false }));
  }, [liveData, liveLoading]);

  const toggle = (i: number) => {
    const willOpen = !expanded[i];
    setExpanded(prev => ({ ...prev, [i]: willOpen }));
    if (willOpen) {
      fetchLiveData(i);
    }
  };

  // WRC supply chart data
  const supplyChartData = [
    { label: 'Before', supply: state.wrcBefore },
    { label: 'After', supply: state.wrcAfter },
  ];

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0A0A0C 0%, #14151C 35%, #1A1714 65%, #0A0A0C 100%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-12 text-center animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 8 of 8 · Trust Chain
          </p>
          <h1 className="text-white text-5xl font-extralight mb-4" style={{ letterSpacing: '-0.04em' }}>The Chain</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-lg mx-auto">
            Every step you just took is now on Hedera. Seven levels of provenance — from satellite orbit to insurance premium — each one a Verifiable Credential anchored to an immutable topic.
          </p>
        </div>

        {/* WRC supply with AreaChart */}
        <div className="mb-8 animate-fade-in stagger-1">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Coins size={14} className="text-emerald-400" />
              <span className="text-white/85 text-[13px] font-semibold">WRC Total Supply</span>
              <a href={tokenLink} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-orange-400/50 hover:text-orange-400">
                <ExternalLink size={14} />
              </a>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Before</div>
                  <div className="font-mono text-lg text-white/40">{state.wrcBefore}</div>
                </div>
                <div className="text-white/15 text-xl">{'->'}</div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(5,150,105,0.6)' }}>After</div>
                  <div className="font-mono text-lg text-emerald-400 font-bold">{state.wrcAfter}</div>
                </div>
                {state.wrcAfter > state.wrcBefore && (
                  <span className="text-emerald-400/70 text-sm font-mono">(+{state.wrcAfter - state.wrcBefore})</span>
                )}
              </div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={supplyChartData}>
                    <defs>
                      <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                    <Area type="monotone" dataKey="supply" stroke="#059669" strokeWidth={2} fill="url(#supplyGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Trust chain */}
        <div className="relative animate-fade-in stagger-2">
          {/* Vertical connector line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="space-y-3">
            {chain.map((level, i) => {
              const Icon = level.icon;
              const isOpen = expanded[i];
              const live = liveData[i];
              const isLiveLoading = liveLoading[i];
              return (
                <div key={i} className="relative">
                  {/* Node dot */}
                  <div className="absolute left-[16px] top-[18px] w-[15px] h-[15px] rounded-full z-10"
                    style={{ background: level.color, boxShadow: `0 0 12px ${level.color}40` }} />

                  {/* Card */}
                  <div className="ml-12 rounded-xl overflow-hidden transition-all"
                    style={{
                      background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                    <button onClick={() => toggle(i)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      <Icon size={16} style={{ color: level.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white/80 text-[13px] font-medium">{level.title}</div>
                        <div className="text-white/30 text-[10px] truncate">{level.subtitle}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)' }}>
                          Level {i + 1}
                        </span>
                        {isOpen ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="pt-3 grid grid-cols-2 gap-3">
                          {level.details.map(d => (
                            <div key={d.label}>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>{d.label}</div>
                              <div className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{d.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Live Mirror Node data */}
                        {isLiveLoading && (
                          <div className="flex items-center gap-2 mt-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <Loader2 size={10} className="animate-spin" />
                            <span>Fetching live data from Mirror Node...</span>
                          </div>
                        )}
                        {live && (
                          <div className="mt-3 pt-3 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(5,150,105,0.5)' }}>Consensus Timestamp</div>
                              <div className="text-[11px] font-mono mt-0.5 text-emerald-400/80">{live.consensusTimestamp}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(5,150,105,0.5)' }}>Sequence Number</div>
                              <div className="text-[11px] font-mono mt-0.5 text-emerald-400/80">#{live.sequenceNumber}</div>
                            </div>
                          </div>
                        )}

                        {level.link && (
                          <a href={level.link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors">
                            View on HashScan <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Copy all links */}
        <div className="mt-8 text-center animate-fade-in stagger-3">
          <button onClick={copyAllLinks}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-medium transition-all"
            style={{ color: copied ? '#059669' : 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy All Proof Links'}
          </button>
        </div>

        {/* Daniel's framework */}
        <div className="mt-12 rounded-xl p-8 text-center animate-fade-in stagger-4" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            The Framework
          </div>
          <div className="flex items-center justify-center gap-3 text-[13px] font-medium">
            {[
              { label: 'Nature', color: '#059669' },
              { label: 'Measured Outcome', color: '#D97706' },
              { label: 'Tradable Unit', color: '#FB923C' },
              { label: 'Financial Value', color: '#DC2626' },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <span style={{ color: item.color }}>{item.label}</span>
                {i < 3 && <span className="text-white/10">{'->'}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Final message */}
        <div className="mt-12 text-center animate-fade-in stagger-5">
          <p className="text-white/80 text-2xl font-extralight" style={{ letterSpacing: '-0.02em' }}>
            This is what a fire ledger looks like.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
            <span>Hedera Consensus Service</span>
            <span>|</span>
            <span>Hedera Token Service</span>
            <span>|</span>
            <span>Guardian Policy Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
