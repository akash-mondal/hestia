'use client';

import { CheckCircle2, ExternalLink, Copy, Loader2, XCircle } from 'lucide-react';
import { HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';

interface HashScanProofProps {
  loading?: boolean;
  success?: boolean;
  error?: string | null;
  hashScanLink?: string | null;
  label?: string;
  mintAmount?: number;
}

export default function HashScanProof({ loading, success, error, hashScanLink, label, mintAmount }: HashScanProofProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg animate-pulse" style={{ background: 'var(--accent-bg)' }}>
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
          Submitting to Hedera...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.06)' }}>
        <XCircle size={14} style={{ color: 'var(--violation)' }} />
        <span className="text-[11px]" style={{ color: 'var(--violation)' }}>{error}</span>
      </div>
    );
  }

  if (!success) return null;

  const link = hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)' }}>
      <CheckCircle2 size={16} style={{ color: 'var(--compliant)' }} />
      <div className="flex-1">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--compliant)' }}>
          {label || 'Submitted to Hedera'}
        </span>
        {mintAmount && (
          <span className="ml-2 text-[11px] font-mono font-bold" style={{ color: 'var(--accent)' }}>
            {mintAmount} WRC minted
          </span>
        )}
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-mono font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
        View on HashScan <ExternalLink size={10} />
      </a>
      <button onClick={() => navigator.clipboard?.writeText(link)}
        className="p-1 rounded hover:bg-black/5 transition-colors" title="Copy link">
        <Copy size={12} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}
