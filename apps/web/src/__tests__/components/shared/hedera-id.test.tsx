import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HederaId from '@/components/shared/hedera-id';

describe('HederaId', () => {
  it('displays the full id', () => {
    render(<HederaId id="0.0.12345" />);
    expect(screen.getByText('0.0.12345')).toBeInTheDocument();
  });

  it('truncates id when truncate=true', () => {
    render(<HederaId id="0xabcdef1234567890abcdef1234567890" truncate />);
    expect(screen.getByText('0xabcdef...567890')).toBeInTheDocument();
  });

  it('does not truncate short id even with truncate=true', () => {
    render(<HederaId id="0.0.123" truncate />);
    expect(screen.getByText('0.0.123')).toBeInTheDocument();
  });

  it('shows copy button', () => {
    render(<HederaId id="0.0.123" />);
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('copies to clipboard on click', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy, readText: vi.fn() },
      writable: true,
      configurable: true,
    });
    render(<HederaId id="0.0.12345" />);
    // Use fireEvent instead of userEvent to avoid clipboard override
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByTitle('Copy'));
    // Wait for async clipboard operation
    await vi.waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('0.0.12345');
    });
  });

  it('shows HashScan link by default', () => {
    render(<HederaId id="0.0.123" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/account/0.0.123');
  });

  it('hides HashScan link when showLink=false', () => {
    render(<HederaId id="0.0.123" showLink={false} />);
    expect(screen.queryByTitle('View on HashScan')).not.toBeInTheDocument();
  });

  it('uses correct type for link URL', () => {
    render(<HederaId id="0.0.456" type="token" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/token/0.0.456');
  });

  it('link opens in new tab', () => {
    render(<HederaId id="0.0.123" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('defaults type to account', () => {
    render(<HederaId id="0.0.123" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link.getAttribute('href')).toContain('/account/');
  });

  it('renders with font-mono class', () => {
    const { container } = render(<HederaId id="0.0.123" />);
    expect(container.querySelector('.font-mono')).toBeInTheDocument();
  });

  it('uses accent color for display text', () => {
    render(<HederaId id="0.0.123" />);
    const displayEl = screen.getByText('0.0.123');
    expect(displayEl.style.color).toBe('var(--accent)');
  });

  it('renders contract type link correctly', () => {
    render(<HederaId id="0x1234" type="contract" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/contract/0x1234');
  });

  it('renders topic type link correctly', () => {
    render(<HederaId id="0.0.789" type="topic" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/topic/0.0.789');
  });

  it('renders transaction type link correctly', () => {
    render(<HederaId id="0.0.111@123" type="transaction" />);
    const link = screen.getByTitle('View on HashScan');
    expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/transaction/0.0.111@123');
  });
});
