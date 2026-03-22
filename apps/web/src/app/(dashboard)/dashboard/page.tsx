import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import StatsGrid from '@/components/dashboard/stats-grid';
import ComplianceTrend from '@/components/dashboard/compliance-trend';
import RecentActivity from '@/components/dashboard/recent-activity';
import MiniMap from '@/components/dashboard/mini-map';
import type { DashboardStats } from '@/types';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export default async function DashboardPage() {
  // Fetch all data sources in parallel
  const [registrations, readings, evaluations] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchReadings().catch(() => []),
    fetchEvaluations().catch(() => []),
  ]);

  const compliantCount = evaluations.filter(e => e.overallCompliant).length;
  const violationCount = evaluations.filter(e => !e.overallCompliant).length;

  const stats: DashboardStats = {
    facilityCount: registrations.length,
    readingCount: readings.length,
    complianceRate: evaluations.length > 0 ? (compliantCount / evaluations.length) * 100 : 0,
    tokensMinted: compliantCount, // 1 GGCC per compliant evaluation
    violationNFTs: evaluations.filter(e => e.tokenAction === 'mint_violation_nft').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsGrid stats={stats} />

      {/* Chart + Map row */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <ComplianceTrend evaluations={evaluations} />
        </div>
        <div className="col-span-2">
          <MiniMap facilities={registrations} evaluations={evaluations} />
        </div>
      </div>

      {/* Activity Feed */}
      <RecentActivity
        readings={readings}
        evaluations={evaluations}
        registrations={registrations}
      />
    </div>
  );
}
