'use client';

import { Activity, ShieldCheck, Coins, XCircle, Building2, CheckCircle2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { SensorReading, ComplianceEvaluation, FacilityRegistration } from '@/types';

interface RecentActivityProps {
  readings: SensorReading[];
  evaluations: ComplianceEvaluation[];
  registrations: FacilityRegistration[];
}

interface Event {
  id: string;
  type: 'reading' | 'compliant' | 'violation' | 'registration';
  timestamp: string;
  facilityId: string;
  summary: string;
}

const ICONS = {
  reading: Activity,
  compliant: Coins,
  violation: XCircle,
  registration: Building2,
};

const COLORS = {
  reading: 'var(--accent)',
  compliant: 'var(--compliant)',
  violation: 'var(--violation)',
  registration: 'var(--warning)',
};

export default function RecentActivity({ readings, evaluations, registrations }: RecentActivityProps) {
  // Build a unified event feed from all data sources
  const events: Event[] = [];

  readings.forEach((r, i) => {
    events.push({
      id: `r-${i}`,
      type: 'reading',
      timestamp: r.timestamp,
      facilityId: r.facilityId,
      summary: `pH ${r.pH.toFixed(1)} | BOD ${r.BOD_mgL.toFixed(0)} | COD ${r.COD_mgL.toFixed(0)} mg/L`,
    });
  });

  evaluations.forEach((e, i) => {
    events.push({
      id: `e-${i}`,
      type: e.overallCompliant ? 'compliant' : 'violation',
      timestamp: e.evaluatedAt,
      facilityId: e.facilityId,
      summary: e.overallCompliant
        ? `All parameters compliant — GGCC credit minted`
        : `${e.violationCount} violation${e.violationCount !== 1 ? 's' : ''} — ${e.tokenAction === 'mint_violation_nft' ? 'ZVIOL NFT issued' : 'pending review'}`,
    });
  });

  registrations.forEach((f, i) => {
    events.push({
      id: `f-${i}`,
      type: 'registration',
      timestamp: new Date().toISOString(),
      facilityId: f.facilityId,
      summary: `${f.facilityName} registered (${f.industryCategory})`,
    });
  });

  // Sort by timestamp descending, take latest 12
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recent = events.slice(0, 12);

  return (
    <div className="card overflow-hidden animate-fade-in stagger-5">
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Recent Activity
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
          {events.length} events
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {recent.map((event) => {
          const Icon = ICONS[event.type];
          const color = COLORS[event.type];
          return (
            <div key={event.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[var(--bg-hover)]">
              <div
                className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon size={12} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold font-mono" style={{ color: 'var(--accent)' }}>
                    {event.facilityId}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {event.summary}
                </p>
              </div>
            </div>
          );
        })}

        {recent.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No activity yet. Run the Guardian dry-run to populate data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
