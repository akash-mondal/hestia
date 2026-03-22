import { fetchAssessments, fetchWrcSupply } from '@/lib/hestia-api';
import SatelliteWorkspace from '@/components/hestia/satellite/satellite-workspace';

export const dynamic = 'force-dynamic';

export default async function SatellitePortal() {
  const [assessments, wrcSupply] = await Promise.all([
    fetchAssessments('verifier'),
    fetchWrcSupply(),
  ]);

  return <SatelliteWorkspace initialAssessments={assessments} wrcSupply={wrcSupply} />;
}
