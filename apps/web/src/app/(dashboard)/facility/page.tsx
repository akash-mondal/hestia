import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import FacilityDetail from '@/components/facilities/facility-detail';
import type { DashboardStats } from '@/types';

export const dynamic = 'force-dynamic';

export default async function FacilityPortal() {
  const [facilities, readings, evaluations] = await Promise.all([
    fetchRegistrations(),
    fetchReadings(),
    fetchEvaluations(),
  ]);

  // Default to first facility (KNP-TAN-001 or whatever is first)
  const defaultFacility = facilities[0];
  if (!defaultFacility) {
    return (
      <div className="flex items-center justify-center h-96" data-role="facility">
        <p style={{ color: 'var(--text-muted)' }}>No facilities registered yet. Run the Guardian pipeline first.</p>
      </div>
    );
  }

  const facilityReadings = readings.filter(r => r.facilityId === defaultFacility.facilityId);
  const facilityEvals = evaluations.filter(e => e.facilityId === defaultFacility.facilityId);

  return (
    <div data-role="facility">
      <FacilityDetail
        facilityId={defaultFacility.facilityId}
        facility={defaultFacility}
        readings={facilityReadings}
        evaluations={facilityEvals}
      />
    </div>
  );
}
