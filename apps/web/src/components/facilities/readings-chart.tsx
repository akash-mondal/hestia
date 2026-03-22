'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DISCHARGE_LIMITS, PARAMETER_LABELS } from '@/lib/constants';
import { formatValue, truncateHash } from '@/lib/utils';
import type { SensorReading } from '@/types';

const PARAMETERS = ['pH', 'BOD_mgL', 'COD_mgL', 'TSS_mgL', 'temperature_C', 'totalChromium_mgL'] as const;

interface ReadingsChartProps {
  readings: SensorReading[];
}

export default function ReadingsChart({ readings }: ReadingsChartProps) {
  const [selected, setSelected] = useState<typeof PARAMETERS[number]>('COD_mgL');

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const limit = DISCHARGE_LIMITS[selected as keyof typeof DISCHARGE_LIMITS];
  const threshold = 'max' in limit ? limit.max : undefined;

  const data = sorted.map((r, i) => ({
    index: i + 1,
    time: new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    value: r[selected] as number,
    status: r.sensorStatus,
  }));

  return (
    <div className="space-y-4">
      {/* Parameter Selector */}
      <div className="flex items-center gap-2">
        {PARAMETERS.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={{
              background: selected === p ? 'var(--accent-bg)' : 'transparent',
              color: selected === p ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${selected === p ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
            }}
          >
            {PARAMETER_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              {threshold !== undefined && (
                <ReferenceLine
                  y={threshold}
                  stroke="#EF4444"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Limit: ${threshold}`,
                    position: 'right',
                    fill: '#EF4444',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#06B6D4', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#06B6D4', stroke: '#0B1120', strokeWidth: 2 }}
                name={PARAMETER_LABELS[selected]}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No readings recorded</span>
          </div>
        )}
      </div>

      {/* Readings Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>pH</th>
              <th>BOD</th>
              <th>COD</th>
              <th>TSS</th>
              <th>Temp</th>
              <th>Cr</th>
              <th>Status</th>
              <th>KMS Sig</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td style={{ color: r.pH >= 5.5 && r.pH <= 9.0 ? 'var(--compliant)' : 'var(--violation)' }}>
                  {formatValue(r.pH)}
                </td>
                <td style={{ color: r.BOD_mgL <= 30 ? 'var(--compliant)' : 'var(--violation)' }}>
                  {formatValue(r.BOD_mgL, 0)}
                </td>
                <td style={{ color: r.COD_mgL <= 250 ? 'var(--compliant)' : 'var(--violation)' }}>
                  {formatValue(r.COD_mgL, 0)}
                </td>
                <td style={{ color: r.TSS_mgL <= 100 ? 'var(--compliant)' : 'var(--violation)' }}>
                  {formatValue(r.TSS_mgL, 0)}
                </td>
                <td>{formatValue(r.temperature_C)}</td>
                <td style={{ color: r.totalChromium_mgL <= 2.0 ? 'var(--compliant)' : 'var(--violation)' }}>
                  {formatValue(r.totalChromium_mgL, 2)}
                </td>
                <td>
                  <span className="pill pill-compliant">{r.sensorStatus}</span>
                </td>
                <td style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
                  {truncateHash(r.kmsSigHash, 4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
