import { fetchRegistrations, fetchReadings, fetchEvaluations } from '@/lib/api';
import MiniMap from '@/components/dashboard/mini-map';
import { HASHSCAN_BASE, GGCC_TOKEN_ID } from '@/lib/constants';
import { ExternalLink, Shield, Droplets, Factory, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function getRiverStatus(complianceRate: number): { label: string; color: string; bg: string; desc: string } {
  if (complianceRate >= 80) return { label: 'Good', color: 'var(--compliant)', bg: 'var(--compliant-bg)', desc: 'Most facilities are meeting discharge standards.' };
  if (complianceRate >= 60) return { label: 'Moderate Concern', color: 'var(--warning)', bg: 'var(--warning-bg)', desc: 'Several facilities need attention. Some discharge standards are not being met.' };
  return { label: 'Serious Concern', color: 'var(--violation)', bg: 'var(--violation-bg)', desc: 'Many facilities are not meeting discharge standards. Immediate action needed.' };
}

export default async function PublicPortal() {
  const [facilities, readings, evaluations] = await Promise.all([
    fetchRegistrations(),
    fetchReadings(),
    fetchEvaluations(),
  ]);

  const compliantCount = evaluations.filter(e => e.overallCompliant).length;
  const complianceRate = evaluations.length > 0 ? (compliantCount / evaluations.length) * 100 : 0;
  const violationCount = evaluations.filter(e => !e.overallCompliant).length;
  const riverStatus = getRiverStatus(complianceRate);

  // Per-facility latest status (simplified)
  const facilityStatuses = facilities.map(f => {
    const fEvals = evaluations.filter(e => e.facilityId === f.facilityId);
    const latest = fEvals.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())[0];
    return {
      ...f,
      status: latest ? (latest.overallCompliant ? 'Meets Standards' : 'Needs Attention') : 'Pending',
      statusColor: latest ? (latest.overallCompliant ? 'var(--compliant)' : 'var(--violation)') : 'var(--text-muted)',
    };
  });

  return (
    <div className="space-y-10" data-role="public">
      {/* River Health Hero Card */}
      <div className="card p-8" style={{ borderLeft: `4px solid ${riverStatus.color}` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="label mb-2">Ganga River Health Status</p>
            <h2 className="text-3xl font-semibold tracking-tight" style={{ color: riverStatus.color, letterSpacing: '-0.02em' }}>
              {riverStatus.label}
            </h2>
            <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--text-secondary)' }}>
              {riverStatus.desc}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono" style={{ color: riverStatus.color, letterSpacing: '-0.02em' }}>
              {complianceRate.toFixed(0)}%
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>of facilities compliant</p>
          </div>
        </div>
      </div>

      {/* Map + Quick Stats */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <MiniMap facilities={facilities} evaluations={evaluations} />
        </div>
        <div className="col-span-2 space-y-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-surface)' }}>
              <Factory size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{facilities.length}</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Facilities Monitored</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--violation-bg)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--violation)' }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--violation)' }}>{violationCount}</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Readings Needing Attention</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--compliant-bg)' }}>
              <Shield size={18} style={{ color: 'var(--compliant)' }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--compliant)' }}>{evaluations.length}</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Records on Blockchain</p>
            </div>
          </div>
          <a href={`${HASHSCAN_BASE}/token/${GGCC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer"
            className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <Droplets size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>All Data Verified on Hedera</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>View on HashScan →</p>
            </div>
            <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
          </a>
        </div>
      </div>

      {/* Facility Browser — simplified, no jargon */}
      <div>
        <h2 className="heading-lg mb-4">Facilities Along the Ganga</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {facilities.length} industrial facilities are being monitored for compliance with discharge standards.
        </p>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Location</th>
                <th>Industry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {facilityStatuses.map(f => (
                <tr key={f.facilityId}>
                  <td>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                      {f.facilityName}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {f.facilityId}
                    </div>
                  </td>
                  <td>{f.district}, {f.state}</td>
                  <td style={{ textTransform: 'capitalize' }}>{f.industryCategory.replace(/_/g, ' ')}</td>
                  <td>
                    <span className="font-semibold text-xs" style={{ color: f.statusColor }}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
