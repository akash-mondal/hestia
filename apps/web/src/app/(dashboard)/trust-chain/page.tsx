import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import TrustChainExplorer from '@/components/trust-chain/trust-chain-explorer';

export const dynamic = 'force-dynamic';

export default async function TrustChainPage() {
  const [registrations, readings, evaluations] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchReadings().catch(() => []),
    fetchEvaluations().catch(() => []),
  ]);

  return (
    <TrustChainExplorer
      facilities={registrations}
      readings={readings}
      evaluations={evaluations}
    />
  );
}
