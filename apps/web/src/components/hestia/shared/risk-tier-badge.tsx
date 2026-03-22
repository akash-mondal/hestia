'use client';

import { getRiskTier } from '@/lib/hestia-constants';

interface RiskTierBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskTierBadge({ score, size = 'md' }: RiskTierBadgeProps) {
  const tier = getRiskTier(Number(score));
  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-3 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded font-mono font-semibold ${sizes[size]}`}
      style={{ color: tier.color, background: tier.bg }}>
      {score} <span className="font-sans font-medium opacity-80">{tier.label}</span>
    </span>
  );
}
