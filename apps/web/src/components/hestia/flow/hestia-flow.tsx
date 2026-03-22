'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Satellite, Users, ShieldCheck, Pickaxe, ArrowRight } from 'lucide-react';
import FlowNav from './flow-nav';
import FlowFeed from './flow-feed';
import StepLandscape from './step-landscape';
import StepCommunity from './step-community';
import StepInspection from './step-inspection';
import StepPlan from './step-plan';
import StepWork from './step-work';
import StepProof from './step-proof';
import StepValue from './step-value';
import StepChain from './step-chain';
import { HASHSCAN_BASE, INSTANCE_TOPIC_ID, WRC_TOKEN_ID } from '@/lib/hestia-constants';

/* ── Types ──────────────────────────────────────────────── */

export interface HcsMessage {
  seq: number;
  timestamp: string;
  link: string;
}

export interface FlowState {
  step: number;
  satellite: { fires: unknown; vegetation: unknown } | null;
  site: { data: Record<string, unknown>; hashScanLink: string } | null;
  siteApproval: { hashScanLink: string; docId: string } | null;
  plan: { data: Record<string, unknown>; hashScanLink: string } | null;
  planApproval: { hashScanLink: string } | null;
  report: { data: Record<string, unknown>; hashScanLink: string } | null;
  assessment: { data: Record<string, unknown>; hashScanLink: string; mintAmount: number } | null;
  insurance: { data: Record<string, unknown>; hashScanLink: string } | null;
  hcsMessages: HcsMessage[];
  wrcBefore: number;
  wrcAfter: number;
  // Guided tour state
  introShown: Record<number, boolean>;
  guidePhase: Record<number, number>;
  stepComplete: Record<number, boolean>;
}

export type StepProps = {
  state: FlowState;
  updateState: (updates: Partial<FlowState>) => void;
  goToStep: (step: number) => void;
  pollHcs: () => Promise<string>;
  pollWrc: () => Promise<void>;
  guidePhase: number;
  advanceGuide: () => void;
  completeStep: () => void;
};

/* ── Characters ─────────────────────────────────────────── */

const CHARACTERS: {
  name: string;
  role: string;
  org: string;
  mission: string;
  icon: typeof Satellite;
  color: string;
}[] = [
  { name: 'Raj Patel', role: 'Satellite Analyst', org: 'USGS Remote Sensing', mission: 'Survey the Tahoe region — find the fires, assess the terrain, identify the treatment site.', icon: Satellite, color: '#818CF8' },
  { name: 'Maria Chen', role: 'Board President', org: 'Tahoe Donner HOA', mission: 'Your community\'s wildfire insurance just tripled. Register your 640-acre site on the blockchain.', icon: Users, color: '#FB923C' },
  { name: 'Jennifer Torres', role: 'Battalion Chief', org: 'CAL FIRE Division 5', mission: 'A new site registration just came in. Verify the details and approve.', icon: ShieldCheck, color: '#10B981' },
  { name: 'Carlos Martinez', role: 'RX Crew Leader', org: 'CAL FIRE Prescribed Fire', mission: 'The site is approved. Plan the prescribed burn — pick the treatment, draw the area, submit.', icon: Pickaxe, color: '#F59E0B' },
  { name: 'Carlos Martinez', role: 'RX Crew Leader', org: 'CAL FIRE Prescribed Fire', mission: 'Three days of controlled burn, 118.5 acres cleared. Report what happened on the ground.', icon: Pickaxe, color: '#F59E0B' },
  { name: 'Raj Patel', role: 'Satellite Analyst', org: 'USGS Remote Sensing', mission: 'Carlos says they burned 118 acres. Check from orbit — run the risk model, mint the credits.', icon: Satellite, color: '#818CF8' },
  { name: 'Maria Chen', role: 'Board President', org: 'Tahoe Donner HOA', mission: 'The credits are minted. Swiss Re sees the risk dropped 47%. What does this mean for your insurance?', icon: Users, color: '#FB923C' },
  { name: 'The Team', role: 'Raj · Maria · Jennifer · Carlos', org: 'Four people, seven credentials', mission: 'One chain of proof — all on Hedera.', icon: Flame, color: '#FB923C' },
];

/* ── Steps ──────────────────────────────────────────────── */

const STEPS = [
  { id: 'landscape', label: 'Landscape', short: 'Satellite' },
  { id: 'community', label: 'Community', short: 'Register' },
  { id: 'inspection', label: 'Inspection', short: 'Approve' },
  { id: 'plan', label: 'Plan', short: 'Plan' },
  { id: 'work', label: 'Work', short: 'Report' },
  { id: 'proof', label: 'Proof', short: 'Assess' },
  { id: 'value', label: 'Value', short: 'Impact' },
  { id: 'chain', label: 'Chain', short: 'Results' },
];

const STEP_TITLES = ['The Landscape', 'The Community', 'The Inspection', 'The Plan', 'The Work', 'The Proof', 'The Value', 'The Chain'];

/* ── StepIntro overlay ──────────────────────────────────── */

function StepIntro({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  const char = CHARACTERS[step];
  const Icon = char.icon;
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanDismiss(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(6,4,10,0.92)', backdropFilter: 'blur(24px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="text-center max-w-md px-8"
      >
        {/* Step indicator */}
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Step {step + 1} of 8 · {STEP_TITLES[step]}
        </div>

        {/* Character icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: `${char.color}15`, border: `1px solid ${char.color}30` }}>
          <Icon size={28} style={{ color: char.color }} />
        </div>

        {/* Character info */}
        <h2 className="text-white text-2xl font-light mb-1" style={{ letterSpacing: '-0.02em' }}>{char.name}</h2>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: `${char.color}15`, color: char.color, border: `1px solid ${char.color}25` }}>
            {char.role}
          </span>
          <span className="text-[11px] text-white/25">{char.org}</span>
        </div>

        {/* Mission */}
        <p className="text-white/45 text-[14px] leading-relaxed mb-8 max-w-sm mx-auto">
          {char.mission}
        </p>

        {/* Begin button */}
        <button
          onClick={() => canDismiss && onDismiss()}
          disabled={!canDismiss}
          className="flex items-center gap-2 mx-auto px-8 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-30"
          style={{ background: `${char.color}20`, border: `1px solid ${char.color}35`, color: char.color }}
        >
          Begin <ArrowRight size={14} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

interface HestiaFlowProps {
  initialWrcSupply: number;
  initialHcsCount: number;
}

export default function HestiaFlow({ initialWrcSupply, initialHcsCount }: HestiaFlowProps) {
  const [state, setState] = useState<FlowState>({
    step: 0,
    satellite: null,
    site: null,
    siteApproval: null,
    plan: null,
    planApproval: null,
    report: null,
    assessment: null,
    insurance: null,
    hcsMessages: [],
    wrcBefore: initialWrcSupply,
    wrcAfter: initialWrcSupply,
    introShown: {},
    guidePhase: {},
    stepComplete: {},
  });

  const goToStep = useCallback((step: number) => {
    setState(s => ({ ...s, step }));
  }, []);

  const updateState = useCallback((updates: Partial<FlowState>) => {
    setState(s => ({ ...s, ...updates }));
  }, []);

  const dismissIntro = useCallback(() => {
    setState(s => ({
      ...s,
      introShown: { ...s.introShown, [s.step]: true },
      guidePhase: { ...s.guidePhase, [s.step]: s.guidePhase[s.step] ?? 1 },
    }));
  }, []);

  const advanceGuide = useCallback(() => {
    setState(s => ({
      ...s,
      guidePhase: { ...s.guidePhase, [s.step]: (s.guidePhase[s.step] ?? 1) + 1 },
    }));
  }, []);

  const completeStep = useCallback(() => {
    setState(s => ({
      ...s,
      stepComplete: { ...s.stepComplete, [s.step]: true },
    }));
  }, []);

  const pollHcs = useCallback(async (): Promise<string> => {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`/api/mirror?path=/topics/${INSTANCE_TOPIC_ID}/messages?limit=3&order=desc`);
      if (res.ok) {
        const data = await res.json();
        const rawMsgs = data.messages || [];
        const msgs = rawMsgs.map((m: Record<string, unknown>) => ({
          seq: Number(m.sequence_number),
          timestamp: String(m.consensus_timestamp),
          link: `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`,
        }));
        setState(s => ({ ...s, hcsMessages: msgs }));

        // Resolve the latest message to a transaction-specific HashScan URL
        if (rawMsgs.length > 0) {
          const ts = String(rawMsgs[0].consensus_timestamp);
          try {
            const txRes = await fetch(`/api/mirror?path=/transactions?timestamp=${ts}&limit=1`);
            if (txRes.ok) {
              const txData = await txRes.json();
              const txns = txData.transactions || [];
              if (txns.length > 0 && txns[0].transaction_id) {
                return `${HASHSCAN_BASE}/transaction/${txns[0].transaction_id}`;
              }
            }
          } catch { /* fall through to topic link */ }
          // Fallback: link to topic with sequence number
          return `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        }
      }
    } catch { /* ignore */ }
    return `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
  }, []);

  const pollWrc = useCallback(async () => {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(`/api/mirror?path=/tokens/${WRC_TOKEN_ID}`);
      if (res.ok) {
        const data = await res.json();
        const supply = Number(data.total_supply || 0);
        setState(s => ({ ...s, wrcAfter: supply }));
      }
    } catch { /* ignore */ }
  }, []);

  const stepProps: StepProps = {
    state,
    updateState,
    goToStep,
    pollHcs,
    pollWrc,
    guidePhase: state.guidePhase[state.step] ?? 0,
    advanceGuide,
    completeStep,
  };

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const motionVariants = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  const showIntro = !state.introShown[state.step];

  return (
    <div className="min-h-screen" style={{ background: '#0a0810' }} role="application" aria-label="Hestia Wildfire Resilience Credit Flow">
      <nav aria-label="Flow steps">
        <FlowNav
          steps={STEPS}
          currentStep={state.step}
          onStepClick={goToStep}
          stepComplete={state.stepComplete}
        />
      </nav>

      <main className="relative">
        {state.hcsMessages.length > 0 && (
          <FlowFeed messages={state.hcsMessages} wrcBefore={state.wrcBefore} wrcAfter={state.wrcAfter} />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            {...motionVariants}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="h-[calc(100vh-56px)] overflow-hidden"
          >
            {state.step === 0 && <StepLandscape {...stepProps} />}
            {state.step === 1 && <StepCommunity {...stepProps} />}
            {state.step === 2 && <StepInspection {...stepProps} />}
            {state.step === 3 && <StepPlan {...stepProps} />}
            {state.step === 4 && <StepWork {...stepProps} />}
            {state.step === 5 && <StepProof {...stepProps} />}
            {state.step === 6 && <StepValue {...stepProps} />}
            {state.step === 7 && <StepChain {...stepProps} />}
          </motion.div>
        </AnimatePresence>

        {/* Step intro overlay */}
        <AnimatePresence>
          {showIntro && <StepIntro step={state.step} onDismiss={dismissIntro} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
