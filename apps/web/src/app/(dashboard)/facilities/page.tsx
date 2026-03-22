import { fetchRegistrations, fetchEvaluations } from '@/lib/api';
import FacilityMap from '@/components/facilities/facility-map';
import FacilityTable from '@/components/facilities/facility-table';

export const dynamic = 'force-dynamic';

export default async function FacilitiesPage() {
  const [registrations, evaluations] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchEvaluations().catch(() => []),
  ]);

  // Build latest compliance status per facility
  const complianceMap = new Map<string, { compliant: number; total: number }>();
  for (const e of evaluations) {
    const entry = complianceMap.get(e.facilityId) ?? { compliant: 0, total: 0 };
    entry.total++;
    if (e.overallCompliant) entry.compliant++;
    complianceMap.set(e.facilityId, entry);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-6" style={{ minHeight: 480 }}>
        {/* Map - 3/5 width */}
        <div className="col-span-3">
          <FacilityMap facilities={registrations} evaluations={evaluations} />
        </div>

        {/* Table - 2/5 width */}
        <div className="col-span-2">
          <FacilityTable facilities={registrations} complianceMap={complianceMap} />
        </div>
      </div>
    </div>
  );
}
