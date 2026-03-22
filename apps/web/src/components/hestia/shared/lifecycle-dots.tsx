'use client';

const STAGES = ['Registered', 'Treated', 'Assessed', 'Credited'];
const COLORS = ['#6366F1', '#059669', '#3B82F6', '#EA580C'];

interface LifecycleDotsProps {
  currentStage: number; // 0=registered, 1=treated, 2=assessed, 3=credited
}

export default function LifecycleDots({ currentStage }: LifecycleDotsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((stage, i) => {
        const done = i <= currentStage;
        return (
          <div key={stage} className="flex items-center gap-0.5">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full transition-all" style={{
                background: done ? COLORS[i] : 'var(--border-default)',
                boxShadow: done ? `0 0 4px ${COLORS[i]}40` : 'none',
              }} />
              <span className="text-[7px] mt-0.5 whitespace-nowrap" style={{ color: done ? COLORS[i] : 'var(--text-muted)' }}>
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="w-4 h-px mt-[-8px]" style={{ background: done ? COLORS[i] : 'var(--border-subtle)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
