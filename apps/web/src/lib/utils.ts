import { HASHSCAN_BASE } from './constants';

/** Format a Hedera account/topic/token ID for display */
export function formatHederaId(id: string): string {
  return id; // Already in 0.0.XXXXX format
}

/** Get HashScan URL for various entity types */
export function hashScanUrl(type: 'account' | 'token' | 'topic' | 'transaction' | 'contract', id: string): string {
  const path = type === 'account' ? 'account' : type === 'token' ? 'token' : type === 'topic' ? 'topic' : type === 'contract' ? 'contract' : 'transaction';
  return `${HASHSCAN_BASE}/${path}/${id}`;
}

/** Format ISO timestamp to readable date */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format ISO timestamp to readable time */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Format ISO timestamp to date + time */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** Format a number to fixed decimals */
export function formatValue(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/** Relative time (e.g., "2 min ago") */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Truncate a hex string for display */
export function truncateHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/** Get compliance status color class */
export function complianceColor(compliant: boolean | null): string {
  if (compliant === null) return 'text-amber-400';
  return compliant ? 'text-emerald-400' : 'text-red-400';
}

/** Get compliance status bg class */
export function complianceBg(compliant: boolean | null): string {
  if (compliant === null) return 'bg-amber-400/10 border-amber-400/20';
  return compliant ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20';
}

/** Clamp value for bar display */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** cn — Tailwind class merge helper */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
