'use client';

import { ShieldCheck, AlertTriangle, Factory, Coins, ExternalLink } from 'lucide-react';
import type { DashboardStats } from '@/types';
import { HASHSCAN_BASE, GGCC_TOKEN_ID } from '@/lib/constants';

interface StatsGridProps {
  stats: DashboardStats;
}

function complianceColor(rate: number) {
  if (rate >= 80) return 'var(--compliant)';
  if (rate >= 60) return 'var(--warning)';
  return 'var(--violation)';
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 1. HERO STAT — Compliance Rate */}
      <div className="card p-5 animate-fade-in stagger-1 stat-glow-green">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Compliance Rate
          </span>
          <ShieldCheck size={16} style={{ color: complianceColor(stats.complianceRate), opacity: 0.6 }} />
        </div>
        <div className="text-3xl font-bold font-mono tracking-tight" style={{ color: complianceColor(stats.complianceRate) }}>
          {stats.complianceRate.toFixed(0)}%
        </div>
        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {stats.complianceRate >= 80 ? 'Above target threshold' : 'Below 80% target'}
        </div>
      </div>

      {/* 2. VIOLATIONS — red glow, creates narrative tension */}
      <div className={`card p-5 animate-fade-in stagger-2 ${stats.violationNFTs > 0 ? 'stat-glow-red' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Active Violations
          </span>
          <AlertTriangle size={16} style={{ color: 'var(--violation)', opacity: 0.6 }} />
        </div>
        <div className={`text-2xl font-bold font-mono tracking-tight ${stats.violationNFTs > 0 ? 'animate-pulse-ring' : ''}`} style={{ color: stats.violationNFTs > 0 ? 'var(--violation)' : 'var(--text-tertiary)' }}>
          {stats.violationNFTs}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          ZVIOL NFTs minted
        </div>
      </div>

      {/* 3. FACILITIES — shows scale */}
      <div className="card p-5 animate-fade-in stagger-3 stat-glow-teal">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Registered GPIs
          </span>
          <Factory size={16} style={{ color: 'var(--accent)', opacity: 0.6 }} />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: 'var(--accent)' }}>
          {stats.facilityCount}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {stats.readingCount.toLocaleString()} sensor readings
        </div>
      </div>

      {/* 4. BLOCKCHAIN RECORDS — with HashScan link + Hedera badge */}
      <div className="card p-5 animate-fade-in stagger-4 stat-glow-green">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Blockchain Records
          </span>
          <Coins size={16} style={{ color: 'var(--compliant)', opacity: 0.6 }} />
        </div>
        <a
          href={`${HASHSCAN_BASE}/token/${GGCC_TOKEN_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl font-bold font-mono tracking-tight hover:underline flex items-center gap-2"
          style={{ color: 'var(--compliant)' }}
        >
          {stats.tokensMinted}
          <ExternalLink size={14} style={{ opacity: 0.5 }} />
        </a>
        <div className="mt-1.5">
          <span className="pill pill-accent text-[9px]" style={{ padding: '1px 6px' }}>
            ✓ Verified on Hedera
          </span>
        </div>
      </div>
    </div>
  );
}
