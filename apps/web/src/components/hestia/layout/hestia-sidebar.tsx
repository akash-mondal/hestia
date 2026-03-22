'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Shovel, ShieldCheck, Satellite, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/hestia/land-manager', label: 'Land Manager', icon: MapPin },
  { href: '/hestia/operator', label: 'Operator', icon: Shovel },
  { href: '/hestia/verifier', label: 'Verifier', icon: ShieldCheck },
  { href: '/hestia/satellite', label: 'Satellite', icon: Satellite },
];

export default function HestiaSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>

      {/* Logo */}
      <Link href="/hestia" className="flex items-center gap-3 px-5 py-5 border-b hover:opacity-90 transition-opacity" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #EA580C, #FB923C)' }}>
          <Flame size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            HESTIA
          </div>
          <div className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Wildfire Credits
          </div>
        </div>
      </Link>

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
