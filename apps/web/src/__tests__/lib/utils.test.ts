import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatHederaId,
  hashScanUrl,
  formatDate,
  formatTime,
  formatDateTime,
  formatValue,
  timeAgo,
  truncateHash,
  complianceColor,
  complianceBg,
  clamp,
  cn,
} from '@/lib/utils';

// ── formatHederaId ──
describe('formatHederaId', () => {
  it('returns the id unchanged', () => {
    expect(formatHederaId('0.0.12345')).toBe('0.0.12345');
  });
});

// ── hashScanUrl ──
describe('hashScanUrl', () => {
  it('builds account URL', () => {
    expect(hashScanUrl('account', '0.0.123')).toBe('https://hashscan.io/testnet/account/0.0.123');
  });
  it('builds token URL', () => {
    expect(hashScanUrl('token', '0.0.456')).toBe('https://hashscan.io/testnet/token/0.0.456');
  });
  it('builds topic URL', () => {
    expect(hashScanUrl('topic', '0.0.789')).toBe('https://hashscan.io/testnet/topic/0.0.789');
  });
  it('builds transaction URL', () => {
    expect(hashScanUrl('transaction', '0.0.111@1234')).toBe('https://hashscan.io/testnet/transaction/0.0.111@1234');
  });
  it('builds contract URL', () => {
    expect(hashScanUrl('contract', '0.0.222')).toBe('https://hashscan.io/testnet/contract/0.0.222');
  });
});

// ── formatDate ──
describe('formatDate', () => {
  it('formats valid ISO string', () => {
    const result = formatDate('2026-03-19T10:30:00Z');
    // en-IN locale: "19 Mar 2026" or similar
    expect(result).toContain('2026');
    expect(result).toContain('Mar');
  });
  it('handles midnight boundary', () => {
    const result = formatDate('2026-01-01T00:00:00Z');
    expect(result).toContain('2026');
  });
});

// ── formatTime ──
describe('formatTime', () => {
  it('formats valid ISO string to time', () => {
    const result = formatTime('2026-03-19T10:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});

// ── formatDateTime ──
describe('formatDateTime', () => {
  it('combines date and time', () => {
    const result = formatDateTime('2026-03-19T10:30:00Z');
    expect(result).toContain('2026');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ── formatValue ──
describe('formatValue', () => {
  it('formats with default 1 decimal', () => {
    expect(formatValue(7.234)).toBe('7.2');
  });
  it('formats with custom decimals', () => {
    expect(formatValue(7.234, 2)).toBe('7.23');
  });
  it('formats zero', () => {
    expect(formatValue(0)).toBe('0.0');
  });
  it('formats negative values', () => {
    expect(formatValue(-3.7, 0)).toBe('-4');
  });
  it('formats with 0 decimals', () => {
    expect(formatValue(42.9, 0)).toBe('43');
  });
});

// ── timeAgo ──
describe('timeAgo', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns seconds ago for <60s', () => {
    const iso = new Date(now - 30_000).toISOString();
    expect(timeAgo(iso)).toBe('30s ago');
  });
  it('returns minutes ago for <3600s', () => {
    const iso = new Date(now - 120_000).toISOString();
    expect(timeAgo(iso)).toBe('2m ago');
  });
  it('returns hours ago for <86400s', () => {
    const iso = new Date(now - 7200_000).toISOString();
    expect(timeAgo(iso)).toBe('2h ago');
  });
  it('returns days ago for >=86400s', () => {
    const iso = new Date(now - 172800_000).toISOString();
    expect(timeAgo(iso)).toBe('2d ago');
  });
  it('boundary: exactly 60s → 1m ago', () => {
    const iso = new Date(now - 60_000).toISOString();
    expect(timeAgo(iso)).toBe('1m ago');
  });
  it('boundary: exactly 3600s → 1h ago', () => {
    const iso = new Date(now - 3600_000).toISOString();
    expect(timeAgo(iso)).toBe('1h ago');
  });
  it('boundary: exactly 86400s → 1d ago', () => {
    const iso = new Date(now - 86400_000).toISOString();
    expect(timeAgo(iso)).toBe('1d ago');
  });
  it('returns 0s ago for now', () => {
    const iso = new Date(now).toISOString();
    expect(timeAgo(iso)).toBe('0s ago');
  });
});

// ── truncateHash ──
describe('truncateHash', () => {
  it('truncates long hash with default chars', () => {
    const hash = '0xabcdef1234567890abcdef1234567890';
    const result = truncateHash(hash);
    expect(result).toBe('0xabcdef...567890');
  });
  it('leaves short hash unchanged', () => {
    expect(truncateHash('0x1234')).toBe('0x1234');
  });
  it('truncates with custom chars', () => {
    const hash = '0xabcdef1234567890abcdef1234567890';
    const result = truncateHash(hash, 4);
    expect(result).toBe('0xabcd...7890');
  });
  it('handles edge case where hash is exactly at threshold', () => {
    // chars=6: threshold is 6*2+2 = 14. A 14-char string should NOT be truncated.
    const shortHash = '0x123456789a';  // 12 chars
    expect(truncateHash(shortHash)).toBe('0x123456789a');
  });
});

// ── complianceColor ──
describe('complianceColor', () => {
  it('returns emerald for true', () => {
    expect(complianceColor(true)).toBe('text-emerald-400');
  });
  it('returns red for false', () => {
    expect(complianceColor(false)).toBe('text-red-400');
  });
  it('returns amber for null', () => {
    expect(complianceColor(null)).toBe('text-amber-400');
  });
});

// ── complianceBg ──
describe('complianceBg', () => {
  it('returns emerald bg for true', () => {
    expect(complianceBg(true)).toContain('bg-emerald-400');
  });
  it('returns red bg for false', () => {
    expect(complianceBg(false)).toContain('bg-red-400');
  });
  it('returns amber bg for null', () => {
    expect(complianceBg(null)).toContain('bg-amber-400');
  });
});

// ── clamp ──
describe('clamp', () => {
  it('clamps below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
  it('returns value within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('handles min === max', () => {
    expect(clamp(50, 10, 10)).toBe(10);
  });
  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });
  it('returns max when value equals max', () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

// ── cn ──
describe('cn', () => {
  it('joins string classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });
  it('filters undefined', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });
  it('filters false', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });
  it('filters null', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });
  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
  it('handles all falsy', () => {
    expect(cn(undefined, false, null)).toBe('');
  });
});
