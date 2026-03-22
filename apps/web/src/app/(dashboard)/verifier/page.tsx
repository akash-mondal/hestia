import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import TrustChainExplorer from '@/components/trust-chain/trust-chain-explorer';
import SatelliteView from '@/components/satellite/satellite-view';

export const dynamic = 'force-dynamic';

export default async function VerifierPortal() {
  const [facilities, readings, evaluations] = await Promise.all([
    fetchRegistrations(),
    fetchReadings(),
    fetchEvaluations(),
  ]);

  return (
    <div className="space-y-10" data-role="verifier">
      {/* Trust Chain Explorer — the star of the verifier portal */}
      <section>
        <h2 className="heading-lg mb-4">Trust Chain Explorer</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          6-level blockchain provenance: Token → Compliance Evaluation → Sensor Reading → Facility Registration → KMS Signature → Satellite Cross-Validation. Every level links to HashScan.
        </p>
        <TrustChainExplorer
          facilities={facilities}
          readings={readings}
          evaluations={evaluations}
        />
      </section>

      {/* Satellite Cross-Validation */}
      <section>
        <h2 className="heading-lg mb-4">Satellite Cross-Validation</h2>
        <SatelliteView facilities={facilities} readings={readings} />
      </section>
    </div>
  );
}
