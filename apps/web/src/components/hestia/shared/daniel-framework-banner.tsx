'use client';

import { TreePine, BarChart3, Coins, DollarSign, ArrowRight } from 'lucide-react';

const STAGES = [
  { icon: TreePine, label: 'Nature', color: '#059669', sub: 'Forest ecosystem' },
  { icon: BarChart3, label: 'Measured Outcome', color: '#3B82F6', sub: 'Risk reduction' },
  { icon: Coins, label: 'Tradable Unit', color: '#EA580C', sub: 'WRC token' },
  { icon: DollarSign, label: 'Financial Value', color: '#D97706', sub: 'Premium discount' },
];

export default function DanielFrameworkBanner() {
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
      {STAGES.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ background: `${stage.color}08` }}>
            <stage.icon size={12} style={{ color: stage.color }} />
            <div>
              <div className="text-[9px] font-semibold" style={{ color: stage.color }}>{stage.label}</div>
              <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{stage.sub}</div>
            </div>
          </div>
          {i < STAGES.length - 1 && (
            <ArrowRight size={12} className="mx-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      ))}
    </div>
  );
}
