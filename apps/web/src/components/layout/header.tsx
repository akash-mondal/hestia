'use client';

import { usePathname } from 'next/navigation';
import { ExternalLink, Droplets } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/regulator': 'Regulator Command Center',
  '/facility': 'Facility Portal',
  '/verifier': 'Verifier & Auditor',
  '/public': 'Public Transparency',
  '/dashboard': 'System Overview',
  '/facilities': 'Facility Registry',
  '/compliance': 'Compliance Matrix',
  '/trust-chain': 'Trust Chain Explorer',
  '/satellite': 'Satellite Validation',
};

export default function Header() {
  const pathname = usePathname();

  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Zeno dMRV';

  const subtitle = pathname.startsWith('/facilities/') && pathname.split('/').length > 2
    ? 'Facility Detail'
    : undefined;

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)' }}>

      {/* Left: ZENO logo + page title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Droplets size={20} style={{ color: 'var(--accent)' }} />
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ZENO
          </span>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border-default)' }} />
        <div>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {subtitle ?? title}
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Real-time dMRV powered by Hedera Guardian + Sentinel-2 + AWS KMS
          </p>
        </div>
      </div>

      {/* Right: HashScan + Testnet */}
      <div className="flex items-center gap-4">
        <a
          href="https://hashscan.io/testnet"
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
          HashScan
        </a>
        <div className="pill pill-accent">
          Testnet
        </div>
      </div>
    </header>
  );
}
