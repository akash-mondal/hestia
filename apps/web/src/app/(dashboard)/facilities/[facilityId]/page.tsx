import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import FacilityDetail from '@/components/facilities/facility-detail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ facilityId: string }>;
}

export default async function FacilityDetailPage({ params }: Props) {
  const { facilityId } = await params;

  const [allRegistrations, allReadings, allEvaluations] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchReadings().catch(() => []),
    fetchEvaluations().catch(() => []),
  ]);

  const facility = allRegistrations.find(f => f.facilityId === facilityId) ?? null;
  const readings = allReadings.filter(r => r.facilityId === facilityId);
  const evaluations = allEvaluations.filter(e => e.facilityId === facilityId);

  return (
    <FacilityDetail
      facilityId={facilityId}
      facility={facility}
      readings={readings}
      evaluations={evaluations}
    />
  );
}
