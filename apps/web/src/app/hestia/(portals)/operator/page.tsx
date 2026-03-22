import { fetchPlans, fetchAssessments, fetchReports } from '@/lib/hestia-api';
import OperatorWorkspace from '@/components/hestia/operator/operator-workspace';

export const dynamic = 'force-dynamic';

export default async function OperatorPortal() {
  const [{ plans }, assessments, reports] = await Promise.all([
    fetchPlans('verifier'),
    fetchAssessments('verifier'),
    fetchReports('verifier'),
  ]);

  return <OperatorWorkspace plans={plans} reports={reports} assessments={assessments} />;
}
