'use client';

import { DISCHARGE_LIMITS, PARAMETER_LABELS } from '@/lib/constants';
import { formatValue } from '@/lib/utils';

interface ParameterBarProps {
  parameter: string;
  value: number;
  compact?: boolean;
}

export default function ParameterBar({ parameter, value, compact = false }: ParameterBarProps) {
  const limitEntry = DISCHARGE_LIMITS[parameter as keyof typeof DISCHARGE_LIMITS];
  if (!limitEntry) return null;

  const label = PARAMETER_LABELS[parameter] ?? parameter;
  const unit = limitEntry.unit;

  // For pH, check range; for others, check max
  let threshold: number;
  let compliant: boolean;
  if ('min' in limitEntry) {
    threshold = limitEntry.max;
    compliant = value >= limitEntry.min && value <= limitEntry.max;
  } else {
    threshold = limitEntry.max;
    compliant = value <= threshold;
  }

  const pct = Math.min((value / (threshold * 1.5)) * 100, 100);

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className={`font-mono ${compact ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: compliant ? 'var(--compliant)' : 'var(--violation)' }}>
          {formatValue(value)} {unit && <span style={{ color: 'var(--text-muted)' }}>{unit}</span>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: `${(threshold / (threshold * 1.5)) * 100}%`,
            background: 'var(--text-muted)',
            opacity: 0.5,
          }}
        />
        {/* Value bar */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: compliant
              ? 'linear-gradient(90deg, var(--compliant), #34D399)'
              : 'linear-gradient(90deg, var(--violation), #F87171)',
          }}
        />
      </div>
    </div>
  );
}
