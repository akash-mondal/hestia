'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import StatusPill from '@/components/shared/status-pill';
import type { FacilityRegistration } from '@/types';

interface FacilityTableProps {
  facilities: FacilityRegistration[];
  complianceMap: Map<string, { compliant: number; total: number }>;
}

export default function FacilityTable({ facilities, complianceMap }: FacilityTableProps) {
  return (
    <div className="card overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Registered Facilities ({facilities.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {facilities.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {facilities.map((f) => {
              const stats = complianceMap.get(f.facilityId);
              const rate = stats ? Math.round((stats.compliant / stats.total) * 100) : null;
              const status = rate === null ? 'pending' : rate >= 80 ? 'compliant' : rate >= 50 ? 'warning' : 'violation';

              return (
                <Link
                  key={f.facilityId}
                  href={`/facilities/${f.facilityId}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors group"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold font-mono" style={{ color: 'var(--accent)' }}>
                        {f.facilityId}
                      </span>
                      <StatusPill status={status} />
                    </div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {f.facilityName}
                    </div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-disabled)' }}>
                      <span>{f.industryCategory}</span>
                      <span>&middot;</span>
                      <span>{f.ctoDischargeMode.toUpperCase()}</span>
                      {rate !== null && (
                        <>
                          <span>&middot;</span>
                          <span className="font-mono">{rate}% compliant</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No facilities registered
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
