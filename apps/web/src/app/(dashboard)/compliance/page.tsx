import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import ComplianceMatrix from '@/components/compliance/compliance-matrix';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const [registrations, readings, evaluations] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchReadings().catch(() => []),
    fetchEvaluations().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <ComplianceMatrix
        facilities={registrations}
        readings={readings}
        evaluations={evaluations}
      />
    </div>
  );
}
