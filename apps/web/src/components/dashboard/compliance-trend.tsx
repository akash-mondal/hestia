'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { ComplianceEvaluation } from '@/types';

interface ComplianceTrendProps {
  evaluations: ComplianceEvaluation[];
}

export default function ComplianceTrend({ evaluations }: ComplianceTrendProps) {
  // Group evaluations by timestamp and compute cumulative compliance rate
  const sorted = [...evaluations].sort(
    (a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime()
  );

  let totalCompliant = 0;
  const data = sorted.map((e, i) => {
    if (e.overallCompliant) totalCompliant++;
    const rate = ((totalCompliant / (i + 1)) * 100);
    return {
      timestamp: new Date(e.evaluatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      rate: Math.round(rate),
      violations: e.violationCount,
      facility: e.facilityId,
    };
  });

  return (
    <div className="card p-5 animate-fade-in stagger-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Compliance Rate Trend
        </span>
        {data.length > 0 && (
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--compliant)' }}>
            {data[data.length - 1].rate}%
          </span>
        )}
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <ReferenceLine y={100} stroke="#10B981" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#complianceGrad)"
              name="Compliance %"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No evaluation data available
          </span>
        </div>
      )}
    </div>
  );
}
