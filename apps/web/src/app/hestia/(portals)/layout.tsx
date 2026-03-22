'use client';

import { usePathname } from 'next/navigation';
import HestiaSidebar from '@/components/hestia/layout/hestia-sidebar';
import HestiaHeader from '@/components/hestia/layout/hestia-header';
import { ROLE_DATA_ATTR } from '@/lib/hestia-constants';

export default function HestiaPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const dataRole = Object.entries(ROLE_DATA_ATTR).find(
    ([path]) => pathname.startsWith(path)
  )?.[1] ?? 'hestia-land';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }} data-role={dataRole}>
      <HestiaSidebar />
      <div className="ml-[220px]">
        <HestiaHeader />
        <main className="px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
