import { fetchSites, fetchAssessments, fetchInsurance, fetchWrcSupply, fetchHcsMessageCount } from '@/lib/hestia-api';
import LandManagerWorkspace from '@/components/hestia/land-manager/land-manager-workspace';

export const dynamic = 'force-dynamic';

export default async function LandManagerPortal() {
  const [{ sites }, assessments, insurance, wrcSupply, hcsCount] = await Promise.all([
    fetchSites('verifier'),
    fetchAssessments('verifier'),
    fetchInsurance('verifier'),
    fetchWrcSupply(),
    fetchHcsMessageCount(),
  ]);

  return (
    <LandManagerWorkspace
      sites={sites}
      assessments={assessments}
      insurance={insurance}
      wrcSupply={wrcSupply}
      hcsCount={hcsCount}
    />
  );
}
