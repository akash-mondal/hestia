import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import StatsGrid from '@/components/dashboard/stats-grid';
import ComplianceTrend from '@/components/dashboard/compliance-trend';
import MiniMap from '@/components/dashboard/mini-map';
import RecentActivity from '@/components/dashboard/recent-activity';
import ComplianceMatrix from '@/components/compliance/compliance-matrix';
import type { DashboardStats } from '@/types';

export const dynamic = 'force-dynamic';

export default async function RegulatorPortal() {
  const [facilities, readings, evaluations] = await Promise.all([
    fetchRegistrations(),
    fetchReadings(),
    fetchEvaluations(),
  ]);

  const compliantCount = evaluations.filter(e => e.overallCompliant).length;
  const complianceRate = evaluations.length > 0
    ? (compliantCount / evaluations.length) * 100
    : 0;
  const violationNFTs = evaluations.filter(e => e.tokenAction === 'mint_violation_nft').length;

  const stats: DashboardStats = {
    facilityCount: facilities.length,
    readingCount: readings.length,
    complianceRate,
    tokensMinted: evaluations.filter(e => e.tokenAction === 'mint_ggcc').length,
    violationNFTs,
  };

  return (
    <div className="space-y-8" data-role="regulator">
      {/* Row 1: Stats (hero compliance rate, violations, facilities, blockchain records) */}
      <StatsGrid stats={stats} />

      {/* Row 2: Trend chart (3/5) + Map (2/5) — asymmetric layout */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <ComplianceTrend evaluations={evaluations} />
        </div>
        <div className="col-span-2">
          <MiniMap facilities={facilities} evaluations={evaluations} />
        </div>
      </div>

      {/* Row 3: Activity feed */}
      <RecentActivity readings={readings} evaluations={evaluations} registrations={facilities} />

      {/* Row 4: Full compliance matrix */}
      <ComplianceMatrix facilities={facilities} readings={readings} evaluations={evaluations} />
    </div>
  );
}
