'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getRiskTier } from '@/lib/hestia-constants';
import type { RiskAssessment } from '@/types/hestia';

interface RiskComparisonChartProps {
  assessments: RiskAssessment[];
}

export default function RiskComparisonChart({ assessments }: RiskComparisonChartProps) {
  const data = assessments.map(a => ({
    site: a.siteId,
    pre: Number(a.preFireRiskScore),
    post: Number(a.postFireRiskScore),
    reduction: Number(a.riskReductionPercent),
  }));

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center animate-fade-in stagger-2">
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No risk assessments yet</p>
      </div>
    );
  }

  return (
    <div className="card p-5 animate-fade-in stagger-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Risk Reduction by Site
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pre-treatment (amber) vs post-treatment (green) wildfire risk scores
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: '#EA580C' }} /> Pre-treatment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: '#059669' }} /> Post-treatment
          </span>
        </div>
      </div>

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="site"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              formatter={(value, name) => {
                const v = Number(value);
                const tier = getRiskTier(v);
                return [`${v}/100 (${tier.label})`, String(name) === 'pre' ? 'Pre-treatment' : 'Post-treatment'];
              }}
            />
            <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="5 5" label={{ value: 'Moderate threshold', position: 'right', fontSize: 9, fill: 'var(--text-muted)' }} />
            <Bar dataKey="pre" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="post" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
