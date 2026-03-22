import { fetchSites, fetchPlans, fetchAssessments, fetchInsurance, fetchWrcSupply, fetchHcsMessageCount } from '@/lib/hestia-api';
import VerifierWorkspace from '@/components/hestia/verifier/verifier-workspace';

export const dynamic = 'force-dynamic';

export default async function VerifierPortal() {
  const [
    { sites: pendingSites, raw: rawSites },
    { plans: pendingPlans, raw: rawPlans },
    assessments,
    insurance,
    wrcSupply,
    hcsCount,
  ] = await Promise.all([
    fetchSites('verifier'),
    fetchPlans('verifier'),
    fetchAssessments('verifier'),
    fetchInsurance('verifier'),
    fetchWrcSupply(),
    fetchHcsMessageCount(),
  ]);

  return (
    <VerifierWorkspace
      pendingSites={pendingSites}
      pendingPlans={pendingPlans}
      rawSites={rawSites}
      rawPlans={rawPlans}
      assessments={assessments}
      insurance={insurance}
      wrcSupply={wrcSupply}
      hcsCount={hcsCount}
    />
  );
}
