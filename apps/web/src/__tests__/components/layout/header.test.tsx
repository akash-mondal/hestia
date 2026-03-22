import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/header';

const mockUsePathname = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Header', () => {
  it('shows System Overview for /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Header />);
    expect(screen.getByText('System Overview')).toBeInTheDocument();
  });

  it('shows Facility Registry for /facilities', () => {
    mockUsePathname.mockReturnValue('/facilities');
    render(<Header />);
    expect(screen.getByText('Facility Registry')).toBeInTheDocument();
  });

  it('shows Compliance Matrix for /compliance', () => {
    mockUsePathname.mockReturnValue('/compliance');
    render(<Header />);
    expect(screen.getByText('Compliance Matrix')).toBeInTheDocument();
  });

  it('shows Trust Chain Explorer for /trust-chain', () => {
    mockUsePathname.mockReturnValue('/trust-chain');
    render(<Header />);
    expect(screen.getByText('Trust Chain Explorer')).toBeInTheDocument();
  });

  it('shows Satellite Validation for /satellite', () => {
    mockUsePathname.mockReturnValue('/satellite');
    render(<Header />);
    expect(screen.getByText('Satellite Validation')).toBeInTheDocument();
  });

  it('shows Facility Detail for /facilities/GPI-UP-001', () => {
    mockUsePathname.mockReturnValue('/facilities/GPI-UP-001');
    render(<Header />);
    expect(screen.getByText('Facility Detail')).toBeInTheDocument();
  });

  it('shows default title for unknown path', () => {
    mockUsePathname.mockReturnValue('/unknown');
    render(<Header />);
    expect(screen.getByText('Zeno dMRV')).toBeInTheDocument();
  });

  it('shows subtitle text', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Header />);
    expect(screen.getByText('CPCB Schedule-VI Effluent Compliance Monitoring')).toBeInTheDocument();
  });

  it('renders HashScan link', () => {
    render(<Header />);
    const link = screen.getByText('HashScan');
    expect(link.closest('a')).toHaveAttribute('href', 'https://hashscan.io/testnet');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('renders Testnet badge', () => {
    render(<Header />);
    expect(screen.getByText('Testnet')).toBeInTheDocument();
  });

  it('renders header element', () => {
    const { container } = render(<Header />);
    expect(container.querySelector('header')).toBeInTheDocument();
  });
});
