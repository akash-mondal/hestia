import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/layout/sidebar';

const mockUsePathname = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

describe('Sidebar', () => {
  it('renders Zeno branding', () => {
    render(<Sidebar />);
    expect(screen.getByText('ZENO')).toBeInTheDocument();
    expect(screen.getByText('dMRV Platform')).toBeInTheDocument();
  });

  it('renders 5 navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Facilities')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Trust Chain')).toBeInTheDocument();
    expect(screen.getByText('Satellite')).toBeInTheDocument();
  });

  it('links have correct hrefs', () => {
    render(<Sidebar />);
    expect(screen.getByText('Overview').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Facilities').closest('a')).toHaveAttribute('href', '/facilities');
    expect(screen.getByText('Compliance').closest('a')).toHaveAttribute('href', '/compliance');
    expect(screen.getByText('Trust Chain').closest('a')).toHaveAttribute('href', '/trust-chain');
    expect(screen.getByText('Satellite').closest('a')).toHaveAttribute('href', '/satellite');
  });

  it('shows Hedera Testnet status', () => {
    render(<Sidebar />);
    expect(screen.getByText('Hedera Testnet')).toBeInTheDocument();
  });

  it('shows Guardian version', () => {
    render(<Sidebar />);
    expect(screen.getByText('Guardian 3.5.0')).toBeInTheDocument();
  });

  it('has pulse indicator for network status', () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders sidebar as aside element', () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('renders nav element', () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector('nav')).toBeInTheDocument();
  });

  it('renders SVG icons for all nav items', () => {
    const { container } = render(<Sidebar />);
    const svgs = container.querySelectorAll('nav svg');
    expect(svgs).toHaveLength(5);
  });
});
