'use client';

import { Flame } from 'lucide-react';
import Link from 'next/link';

interface FlowNavProps {
  steps: { id: string; label: string; short: string }[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function FlowNav({ steps, currentStep, onStepClick }: FlowNavProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center gap-4 px-6 py-3"
      style={{ background: 'rgba(12, 10, 9, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

      <Link href="/hestia" className="flex items-center gap-2 mr-4 hover:opacity-80 transition-opacity">
        <Flame size={18} style={{ color: '#FB923C' }} />
        <span className="text-white font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>HESTIA</span>
      </Link>

      <div className="flex-1 flex items-center gap-1">
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = i <= currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable ? onStepClick(i) : null}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  color: isCurrent ? '#FB923C' : isComplete ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  background: isCurrent ? 'rgba(234, 88, 12, 0.12)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(234, 88, 12, 0.25)' : '1px solid transparent',
                }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    background: isComplete ? '#059669' : isCurrent ? '#FB923C' : 'rgba(255,255,255,0.08)',
                    color: isComplete || isCurrent ? 'white' : 'rgba(255,255,255,0.3)',
                  }}>
                  {isComplete ? '✓' : i + 1}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
                <span className="lg:hidden">{step.short}</span>
              </button>
              {i < steps.length - 1 && (
                <div className="w-3 h-px mx-0.5" style={{ background: isComplete ? '#059669' : 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Hedera Testnet
      </div>
    </div>
  );
}
