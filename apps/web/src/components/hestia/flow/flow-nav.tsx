'use client';

import { Flame, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FlowNavProps {
  steps: { id: string; label: string; short: string }[];
  currentStep: number;
  onStepClick: (step: number) => void;
  stepComplete: Record<number, boolean>;
}

export default function FlowNav({ steps, currentStep, onStepClick, stepComplete }: FlowNavProps) {
  const canAdvance = stepComplete[currentStep] && currentStep < steps.length - 1;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 px-5 py-2.5"
      style={{ background: 'rgba(10, 8, 14, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56 }}>

      <Link href="/hestia" className="flex items-center gap-2 mr-3 hover:opacity-80 transition-opacity">
        <Flame size={18} style={{ color: '#FB923C' }} />
        <span className="text-white font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>HESTIA</span>
      </Link>

      <div className="flex-1 flex items-center gap-0.5">
        {steps.map((step, i) => {
          const isComplete = stepComplete[i];
          const isCurrent = i === currentStep;
          // Can click: current step, completed steps, or the step right after a completed one
          const isClickable = isCurrent || isComplete || (i > 0 && stepComplete[i - 1]) || i < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all disabled:cursor-default disabled:opacity-30"
                style={{
                  color: isCurrent ? '#FB923C' : isComplete ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                  background: isCurrent ? 'rgba(234, 88, 12, 0.1)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(234, 88, 12, 0.2)' : '1px solid transparent',
                }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: isComplete ? '#059669' : isCurrent ? '#FB923C' : 'rgba(255,255,255,0.06)',
                    color: isComplete || isCurrent ? 'white' : 'rgba(255,255,255,0.25)',
                    fontSize: isComplete ? '8px' : '9px',
                  }}>
                  {isComplete ? '✓' : i + 1}
                </span>
                <span className="hidden xl:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className="w-2 h-px mx-0.5" style={{ background: isComplete ? '#059669' : 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Next Step button */}
      {currentStep < steps.length - 1 && (
        <button
          onClick={() => canAdvance && onStepClick(currentStep + 1)}
          disabled={!canAdvance}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-20 disabled:cursor-default"
          style={{
            background: canAdvance ? 'rgba(234, 88, 12, 0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${canAdvance ? 'rgba(234, 88, 12, 0.4)' : 'rgba(255,255,255,0.05)'}`,
            color: canAdvance ? '#FB923C' : 'rgba(255,255,255,0.15)',
            animation: canAdvance ? 'pulse-border 2s ease-in-out infinite' : 'none',
          }}
        >
          Next Step <ArrowRight size={12} />
        </button>
      )}

      <div className="flex items-center gap-1.5 text-[10px] ml-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
        <span className="hidden sm:inline">Hedera Testnet</span>
      </div>

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
          50% { box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.15); }
        }
      `}</style>
    </div>
  );
}
