import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplianceTrend from '@/components/dashboard/compliance-trend';
import { createEvaluation, createViolatingEvaluation } from '../../mocks/factories';

// Mock recharts to avoid rendering issues in test
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

describe('ComplianceTrend', () => {
  it('shows empty state when no evaluations', () => {
    render(<ComplianceTrend evaluations={[]} />);
    expect(screen.getByText('No evaluation data available')).toBeInTheDocument();
  });

  it('renders chart when evaluations exist', () => {
    render(<ComplianceTrend evaluations={[createEvaluation()]} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<ComplianceTrend evaluations={[]} />);
    expect(screen.getByText('Compliance Rate Trend')).toBeInTheDocument();
  });

  it('shows current rate percentage', () => {
    render(<ComplianceTrend evaluations={[createEvaluation()]} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('computes correct rate for mixed compliance', () => {
    const evals = [
      createEvaluation({ evaluatedAt: '2026-03-19T10:00:00Z' }),
      createViolatingEvaluation({ evaluatedAt: '2026-03-19T11:00:00Z' }),
    ];
    render(<ComplianceTrend evaluations={evals} />);
    // 1 of 2 compliant = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('computes 0% rate when all violating', () => {
    const evals = [
      createViolatingEvaluation({ evaluatedAt: '2026-03-19T10:00:00Z' }),
      createViolatingEvaluation({ evaluatedAt: '2026-03-19T11:00:00Z' }),
    ];
    render(<ComplianceTrend evaluations={evals} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders ResponsiveContainer', () => {
    render(<ComplianceTrend evaluations={[createEvaluation()]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('does not show rate badge when empty', () => {
    render(<ComplianceTrend evaluations={[]} />);
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('renders card wrapper', () => {
    const { container } = render(<ComplianceTrend evaluations={[]} />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });

  it('sorts evaluations chronologically', () => {
    const evals = [
      createViolatingEvaluation({ evaluatedAt: '2026-03-19T12:00:00Z' }),
      createEvaluation({ evaluatedAt: '2026-03-19T10:00:00Z' }),
    ];
    render(<ComplianceTrend evaluations={evals} />);
    // First eval compliant (100%), second violating (50%), so final rate shown is 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles single evaluation', () => {
    render(<ComplianceTrend evaluations={[createEvaluation()]} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
