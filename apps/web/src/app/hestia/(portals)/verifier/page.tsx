
import { fetchSites, fetchPlans, fetchAssessments, fetchInsurance, fetchWrcSupply, fetchHcsMessageCount, getDocumentId } from '@/lib/hestia-api';
import { HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, getRiskTier, RISK_COMPONENTS } from '@/lib/hestia-constants';
import HestiaStatsGrid from '@/components/hestia/shared/hestia-stats-grid';
import ApprovalQueue from '@/components/hestia/verifier/approval-queue';
import HestiaTrustChain from '@/components/hestia/verifier/hestia-trust-chain';
import RiskMatrix from '@/components/hestia/verifier/risk-matrix';
import type { HestiaStatCard } from '@/types/hestia';

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

  const pendingCount = pendingSites.length + pendingPlans.length;
  const verifiedCount = assessments.filter(a => a.overallCompliant).length;

  const stats: HestiaStatCard[] = [
    {
      label: 'Pending Approvals',
      value: pendingCount,
      iconName: 'Clock',
      glow: pendingCount > 0 ? 'amber' : 'green',
      subtitle: `${pendingSites.length} sites + ${pendingPlans.length} plans`,
    },
    {
      label: 'Verified',
      value: verifiedCount,
      iconName: 'CheckCircle2',
      glow: 'green',
      subtitle: `of ${assessments.length} assessments`,
    },
    {
      label: 'WRC Supply',
      value: (wrcSupply / 100).toLocaleString(),
      iconName: 'Coins',
      glow: 'teal',
      link: `${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`,
      subtitle: 'Wildfire Resilience Credits',
    },
    {
      label: 'HCS Messages',
      value: hcsCount,
      iconName: 'MessageSquare',
      glow: 'green',
      link: `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`,
      subtitle: 'Hedera Consensus records',
    },
  ];

  return (
    <div className="space-y-8">
      <HestiaStatsGrid stats={stats} />

      <ApprovalQueue
        pendingSites={pendingSites}
        pendingPlans={pendingPlans}
        rawSites={rawSites}
        rawPlans={rawPlans}
      />

      <HestiaTrustChain
        sites={pendingSites}
        assessments={assessments}
        insurance={insurance}
      />

      <RiskMatrix
        sites={pendingSites}
        assessments={assessments}
      />
    </div>
  );
}
