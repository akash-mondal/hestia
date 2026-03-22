'use client';

import { usePathname } from 'next/navigation';
import { ExternalLink, Flame } from 'lucide-react';
import { ROLE_TITLES, WRC_TOKEN_ID, HASHSCAN_BASE } from '@/lib/hestia-constants';

export default function HestiaHeader() {
  const pathname = usePathname();

  const title = Object.entries(ROLE_TITLES).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Hestia WRC';

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)' }}>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Flame size={20} style={{ color: 'var(--accent)' }} />
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            HESTIA
          </span>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border-default)' }} />
        <div>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Wildfire dMRV powered by Hedera Guardian + Sentinel-2 + NASA FIRMS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
          style={{
            color: 'var(--accent)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
          }}
        >
          <ExternalLink size={12} />
          WRC on HashScan
        </a>
        <div className="pill pill-accent">
          Testnet
        </div>
      </div>
    </header>
  );
}
