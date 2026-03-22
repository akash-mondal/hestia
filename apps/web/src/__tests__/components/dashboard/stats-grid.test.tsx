import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsGrid from '@/components/dashboard/stats-grid';
import { createStats } from '../../mocks/factories';

describe('StatsGrid', () => {
  it('renders 4 stat cards', () => {
    const { container } = render(<StatsGrid stats={createStats()} />);
    expect(container.querySelectorAll('.card')).toHaveLength(4);
  });

  it('shows facility count label', () => {
    render(<StatsGrid stats={createStats({ facilityCount: 7 })} />);
    expect(screen.getByText('Registered Facilities')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows reading count label', () => {
    render(<StatsGrid stats={createStats({ readingCount: 25 })} />);
    expect(screen.getByText('Sensor Readings')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('shows compliance rate with percent', () => {
    render(<StatsGrid stats={createStats({ complianceRate: 80 })} />);
    expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows tokens minted label', () => {
    render(<StatsGrid stats={createStats({ tokensMinted: 20 })} />);
    expect(screen.getByText('GGCC Credits Minted')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('shows violation text when violationNFTs > 0', () => {
    render(<StatsGrid stats={createStats({ violationNFTs: 3 })} />);
    expect(screen.getByText('3 violations recorded')).toBeInTheDocument();
  });

  it('shows singular violation text for 1 NFT', () => {
    render(<StatsGrid stats={createStats({ violationNFTs: 1 })} />);
    expect(screen.getByText('1 violation recorded')).toBeInTheDocument();
  });

  it('does not show violation text when violationNFTs is 0', () => {
    render(<StatsGrid stats={createStats({ violationNFTs: 0 })} />);
    expect(screen.queryByText(/violations? recorded/)).not.toBeInTheDocument();
  });

  it('renders SVG icons', () => {
    const { container } = render(<StatsGrid stats={createStats()} />);
    expect(container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('handles zero values', () => {
    render(<StatsGrid stats={createStats({ facilityCount: 0, readingCount: 0, complianceRate: 0, tokensMinted: 0, violationNFTs: 0 })} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('applies glow classes', () => {
    const { container } = render(<StatsGrid stats={createStats()} />);
    expect(container.querySelector('.stat-glow-teal')).toBeInTheDocument();
    expect(container.querySelector('.stat-glow-amber')).toBeInTheDocument();
    expect(container.querySelector('.stat-glow-green')).toBeInTheDocument();
  });

  it('uses grid-cols-4 layout', () => {
    const { container } = render(<StatsGrid stats={createStats()} />);
    expect(container.querySelector('.grid-cols-4')).toBeInTheDocument();
  });

  it('formats readingCount with locale', () => {
    render(<StatsGrid stats={createStats({ readingCount: 1234 })} />);
    // toLocaleString might produce "1,234"
    expect(screen.getByText(/1.?234/)).toBeInTheDocument();
  });

  it('renders compliance rate as integer (no decimals)', () => {
    render(<StatsGrid stats={createStats({ complianceRate: 87.5 })} />);
    expect(screen.getByText('88%')).toBeInTheDocument();
  });
});
