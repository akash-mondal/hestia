'use client';

import { useState } from 'react';
import { Clock, CheckCircle2, XCircle, ExternalLink, Loader2, ChevronDown, MapPin, Flame, MessageSquare, Coins, Shield } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, WRC_TOKEN_ID, INSTANCE_TOPIC_ID, getRiskTier } from '@/lib/hestia-constants';
import { useGuardianApprove } from '@/components/hestia/shared/use-guardian-approve';
import RiskTierBadge from '@/components/hestia/shared/risk-tier-badge';
import DanielFrameworkBanner from '@/components/hestia/shared/daniel-framework-banner';
import HestiaTrustChain from '@/components/hestia/verifier/hestia-trust-chain';
import type { SiteRegistration, TreatmentPlan, RiskAssessment, InsuranceImpact } from '@/types/hestia';

interface VerifierWorkspaceProps {
  pendingSites: SiteRegistration[];
  pendingPlans: TreatmentPlan[];
  rawSites: unknown[];
  rawPlans: unknown[];
  assessments: RiskAssessment[];
  insurance: InsuranceImpact[];
  wrcSupply: number;
  hcsCount: number;
}

function getDocId(raw: unknown): string {
  const doc = raw as Record<string, unknown>;
  return String(doc._id ?? doc.id ?? '');
}

export default function VerifierWorkspace({ pendingSites, pendingPlans, rawSites, rawPlans, assessments, insurance, wrcSupply, hcsCount }: VerifierWorkspaceProps) {
  const { approve, reject, processing, approved, rejected, error } = useGuardianApprove();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showTrustChain, setShowTrustChain] = useState(false);

  const pendingCount = pendingSites.length + pendingPlans.length;
  const verifiedCount = assessments.filter(a => a.overallCompliant).length;

  const handleReject = async (buttonTag: string, docId: string) => {
    if (!rejectReason.trim()) return;
    await reject(buttonTag, docId, rejectReason);
    setRejectId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <DanielFrameworkBanner />

      {/* ── Review Queue Header ── */}
      <div className="flex items-center gap-4 animate-fade-in stagger-1">
        <div className="card px-5 py-3 flex items-center gap-3 flex-1">
          <Clock size={16} style={{ color: pendingCount > 0 ? '#D97706' : 'var(--compliant)' }} />
          <div>
            <span className="text-xl font-mono font-bold" style={{ color: pendingCount > 0 ? '#D97706' : 'var(--compliant)' }}>
              {pendingCount}
            </span>
            <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
              pending ({pendingSites.length} sites + {pendingPlans.length} plans)
            </span>
          </div>
        </div>
        <div className="card px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} style={{ color: 'var(--compliant)' }} />
          <span className="text-xl font-mono font-bold" style={{ color: 'var(--compliant)' }}>{verifiedCount}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>verified</span>
        </div>
        <a href={`${HASHSCAN_BASE}/token/${WRC_TOKEN_ID}`} target="_blank" rel="noopener noreferrer" className="card px-5 py-3 flex items-center gap-3 hover:shadow-lg transition-shadow">
          <Coins size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xl font-mono font-bold" style={{ color: 'var(--accent)' }}>{(wrcSupply / 100).toLocaleString()}</span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>WRC <ExternalLink size={8} /></span>
        </a>
        <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer" className="card px-5 py-3 flex items-center gap-3 hover:shadow-lg transition-shadow">
          <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{hcsCount}</span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>HCS <ExternalLink size={8} /></span>
        </a>
      </div>

      {/* ── Pending Sites ── */}
      <div className="card animate-fade-in stagger-2">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Site Registrations</h3>
          </div>
          <span className="pill pill-accent">{pendingSites.length}</span>
        </div>
        {pendingSites.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No pending site approvals</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {pendingSites.map((site, i) => {
              const docId = getDocId(rawSites[i]);
              const isApproved = approved.has(docId);
              const isRejected = rejected.has(docId);
              const isProcessing = processing === docId;
              const isExpanded = expanded === docId;
              const isRejecting = rejectId === docId;

              if (isApproved || isRejected) {
                return (
                  <div key={docId} className="px-5 py-3 flex items-center gap-3 opacity-50">
                    {isApproved ? <CheckCircle2 size={14} style={{ color: 'var(--compliant)' }} /> : <XCircle size={14} style={{ color: 'var(--violation)' }} />}
                    <span className="text-[11px] font-mono">{site.siteId}</span>
                    <span className="text-[11px]" style={{ color: isApproved ? 'var(--compliant)' : 'var(--violation)' }}>
                      {isApproved ? 'Approved' : 'Rejected'}
                    </span>
                    {isApproved && (
                      <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                        HashScan <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                );
              }

              return (
                <div key={docId}>
                  <div className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-5 gap-3 text-[11px]">
                      <div><span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{site.siteId}</span></div>
                      <div style={{ color: 'var(--text-secondary)' }}>{site.siteName}</div>
                      <div className="font-mono">{site.totalAcres} ac</div>
                      <div><RiskTierBadge score={Number(site.currentFireRiskScore)} size="sm" /></div>
                      <div style={{ color: 'var(--text-muted)' }}>{site.state}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpanded(isExpanded ? null : docId)} className="p-1 rounded hover:bg-black/5">
                        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
                      </button>
                      <button onClick={() => approve(TAGS.APPROVE_SITE, docId)} disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--compliant)' }}>
                        {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                      </button>
                      <button onClick={() => setRejectId(isRejecting ? null : docId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium"
                        style={{ color: 'var(--violation)', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)' }}>
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Reject reason input */}
                  {isRejecting && (
                    <div className="px-5 pb-3 flex items-center gap-2">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (required)"
                        className="flex-1 px-3 py-2 rounded-md text-xs border" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.03)' }} />
                      <button onClick={() => handleReject(TAGS.REJECT_SITE, docId)} disabled={!rejectReason.trim()}
                        className="px-3 py-2 rounded-md text-[11px] font-medium text-white disabled:opacity-30" style={{ background: 'var(--violation)' }}>
                        Confirm Reject
                      </button>
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-4 grid grid-cols-3 gap-3 text-[10px] animate-fade-in" style={{ background: 'var(--bg-muted)' }}>
                      {[
                        ['Owner', site.ownerEntity], ['County', site.county], ['Vegetation', site.vegetationType],
                        ['GPS', `${site.gpsLatitude}, ${site.gpsLongitude}`], ['WUI Structures', String(site.wuiStructures)],
                        ['Insurer', site.insurerName || '—'],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pending Plans ── */}
      <div className="card animate-fade-in stagger-3">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Flame size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Treatment Plans</h3>
          </div>
          <span className="pill pill-accent">{pendingPlans.length}</span>
        </div>
        {pendingPlans.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>No pending plan approvals</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {pendingPlans.map((plan, i) => {
              const docId = getDocId(rawPlans[i]);
              const isApproved = approved.has(docId);
              const isProcessing = processing === docId;

              if (isApproved) {
                return (
                  <div key={docId} className="px-5 py-3 flex items-center gap-3 opacity-50">
                    <CheckCircle2 size={14} style={{ color: 'var(--compliant)' }} />
                    <span className="text-[11px] font-mono">{plan.planId}</span>
                    <span className="text-[11px]" style={{ color: 'var(--compliant)' }}>Approved</span>
                    <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                      HashScan <ExternalLink size={8} />
                    </a>
                  </div>
                );
              }

              return (
                <div key={docId} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-5 gap-3 text-[11px]">
                    <div className="font-mono font-medium" style={{ color: 'var(--accent)' }}>{plan.planId}</div>
                    <div className="font-mono" style={{ color: 'var(--text-secondary)' }}>{plan.siteId}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{String(plan.treatmentType).replace(/_/g, ' ')}</div>
                    <div className="font-mono">{plan.plannedAcres} ac</div>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{plan.crewCertification}</div>
                  </div>
                  <button onClick={() => approve(TAGS.APPROVE_PLAN, docId)} disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--compliant)' }}>
                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Trust Chain ── */}
      <div className="card animate-fade-in stagger-4">
        <button onClick={() => setShowTrustChain(!showTrustChain)}
          className="w-full px-5 py-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Trust Chain — 7-Level Provenance</h3>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: showTrustChain ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
        </button>
        {showTrustChain && (
          <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <HestiaTrustChain sites={pendingSites} assessments={assessments} insurance={insurance} />
          </div>
        )}
      </div>

      {/* ── Audit Log ── */}
      {assessments.length > 0 && (
        <div className="card animate-fade-in stagger-5">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Log</h3>
            <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
              Full audit trail <ExternalLink size={9} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-[10px]">Site</th>
                  <th className="text-center px-3 py-3 text-[10px]">Pre</th>
                  <th className="text-center px-3 py-3 text-[10px]">Post</th>
                  <th className="text-center px-3 py-3 text-[10px]">Reduction</th>
                  <th className="text-center px-3 py-3 text-[10px]">Acres</th>
                  <th className="text-center px-3 py-3 text-[10px]">FIRMS</th>
                  <th className="text-center px-3 py-3 text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{a.siteId}</td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.preFireRiskScore)} size="sm" /></td>
                    <td className="px-3 py-2.5 text-center"><RiskTierBadge score={Number(a.postFireRiskScore)} size="sm" /></td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--compliant)' }}>{a.riskReductionPercent}%</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]">{a.verifiedAcres}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px]">{a.firmsHotspotCount}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`pill ${a.tokenAction === 'mint_wrc' ? 'pill-compliant' : 'pill-warning'}`}>
                        {a.tokenAction === 'mint_wrc' ? 'WRC' : a.tokenAction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="text-[11px] px-4 py-3 rounded-lg" style={{ color: 'var(--violation)', background: 'rgba(220,38,38,0.06)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
