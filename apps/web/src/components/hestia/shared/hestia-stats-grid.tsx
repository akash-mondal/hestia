'use client';

import { ExternalLink } from 'lucide-react';
import type { HestiaStatCard } from '@/types/hestia';

interface HestiaStatsGridProps {
  stats: HestiaStatCard[];
}

const GLOW_MAP: Record<string, string> = {
  green: 'stat-glow-green',
  amber: 'stat-glow-amber',
  teal: 'stat-glow-teal',
  red: 'stat-glow-red',
  orange: 'stat-glow-amber',
};

export default function HestiaStatsGrid({ stats }: HestiaStatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const glowClass = GLOW_MAP[stat.glow] || '';
        const isLinked = !!stat.link;

        const content = (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </span>
              <Icon size={16} style={{ color: 'var(--accent)', opacity: 0.6 }} />
            </div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${isLinked ? 'flex items-center gap-2' : ''}`}
              style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
              {stat.value}
              {isLinked && <ExternalLink size={14} style={{ opacity: 0.5 }} />}
            </div>
            {stat.subtitle && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {stat.subtitle}
              </div>
            )}
          </>
        );

        if (isLinked) {
          return (
            <a key={i} href={stat.link} target="_blank" rel="noopener noreferrer"
              className={`card p-5 animate-fade-in stagger-${i + 1} ${glowClass} hover:shadow-lg transition-shadow`}>
              {content}
            </a>
          );
        }

        return (
          <div key={i} className={`card p-5 animate-fade-in stagger-${i + 1} ${glowClass}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
