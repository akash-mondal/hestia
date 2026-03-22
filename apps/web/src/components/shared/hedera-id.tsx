'use client';

import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { hashScanUrl, truncateHash } from '@/lib/utils';

interface HederaIdProps {
  id: string;
  type?: 'account' | 'token' | 'topic' | 'transaction' | 'contract';
  truncate?: boolean;
  showLink?: boolean;
}

export default function HederaId({ id, type = 'account', truncate = false, showLink = true }: HederaIdProps) {
  const [copied, setCopied] = useState(false);
  const display = truncate ? truncateHash(id) : id;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs group">
      <span style={{ color: 'var(--accent)' }}>{display}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
        title="Copy"
      >
        {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} style={{ color: 'var(--text-muted)' }} />}
      </button>
      {showLink && (
        <a
          href={hashScanUrl(type, id)}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
          title="View on HashScan"
        >
          <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
        </a>
      )}
    </span>
  );
}
