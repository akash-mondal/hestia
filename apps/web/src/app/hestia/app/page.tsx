import { fetchWrcSupply, fetchHcsMessageCount } from '@/lib/hestia-api';
import HestiaFlow from '@/components/hestia/flow/hestia-flow';

export const dynamic = 'force-dynamic';

export default async function HestiaAppPage() {
  const [wrcSupply, hcsCount] = await Promise.all([
    fetchWrcSupply(),
    fetchHcsMessageCount(),
  ]);

  return <HestiaFlow initialWrcSupply={wrcSupply} initialHcsCount={hcsCount} />;
}
