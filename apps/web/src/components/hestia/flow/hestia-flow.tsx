'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

interface HestiaFlowProps {
  initialWrcSupply: number;
  initialHcsCount: number;
}

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
  });

  const goToStep = useCallback((step: number) => {
    setState(s => ({ ...s, step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateState = useCallback((updates: Partial<FlowState>) => {
    setState(s => ({ ...s, ...updates }));
  }, []);

  // Poll HCS for new messages after an action
  const pollHcs = useCallback(async () => {
    await new Promise(r => setTimeout(r, 3000)); // wait for Hedera finality
    try {
      const res = await fetch(`/api/mirror?path=/topics/${INSTANCE_TOPIC_ID}/messages?limit=3&order=desc`);
      if (res.ok) {
        const data = await res.json();
        const msgs = (data.messages || []).map((m: Record<string, unknown>) => ({
          seq: Number(m.sequence_number),
          timestamp: String(m.consensus_timestamp),
          link: `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`,
        }));
        setState(s => ({ ...s, hcsMessages: msgs }));
      }
    } catch { /* ignore */ }
  }, []);

  // Poll WRC supply after minting
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

  const stepProps = { state, updateState, goToStep, pollHcs, pollWrc };

  return (
    <div className="min-h-screen" style={{ background: '#0C0A09' }}>
      <FlowNav steps={STEPS} currentStep={state.step} onStepClick={goToStep} />

      <div className="relative">
        {/* On-chain activity feed — fixed right edge */}
        {state.hcsMessages.length > 0 && (
          <FlowFeed
            messages={state.hcsMessages}
            wrcBefore={state.wrcBefore}
            wrcAfter={state.wrcAfter}
          />
        )}

        {/* Step content with page transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 0.4,
              ease: [0.25, 1, 0.5, 1], // ease-out-quart
            }}
            className="min-h-[calc(100vh-56px)]"
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
      </div>
    </div>
  );
}

export type StepProps = {
  state: FlowState;
  updateState: (updates: Partial<FlowState>) => void;
  goToStep: (step: number) => void;
  pollHcs: () => Promise<void>;
  pollWrc: () => Promise<void>;
};
