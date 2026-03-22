'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  Link2,
  Satellite,
  Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/regulator', label: 'Regulator', icon: LayoutDashboard },
  { href: '/facility', label: 'Facility', icon: Factory },
  { href: '/verifier', label: 'Verifier', icon: Link2 },
  { href: '/public', label: 'Public', icon: Satellite },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/trust-chain', label: 'Trust Chain', icon: Link2 },
  { href: '/facilities', label: 'All Facilities', icon: Factory },
  { href: '/satellite', label: 'Satellite', icon: Satellite },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #10B981)' }}>
          <Droplets size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            ZENO
          </div>
          <div className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            dMRV Platform
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                active ? 'text-white' : 'hover:text-white'
              )}
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                background: active ? 'var(--bg-hover)' : 'transparent',
                ...(active ? { boxShadow: 'inset 0 0 0 1px var(--border-default)' } : {}),
              }}
            >
              <item.icon size={16} style={{ color: active ? 'var(--accent)' : undefined }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Network Status */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Hedera Testnet
        </div>
        <div className="mt-1 text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
          Guardian 3.5.0
        </div>
      </div>
    </aside>
  );
}
