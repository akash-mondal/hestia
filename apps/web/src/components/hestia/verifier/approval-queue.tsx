'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { SiteRegistration, TreatmentPlan } from '@/types/hestia';

interface ApprovalQueueProps {
  pendingSites: SiteRegistration[];
  pendingPlans: TreatmentPlan[];
  rawSites: unknown[];
  rawPlans: unknown[];
}

function getDocId(rawDoc: unknown): string {
  const doc = rawDoc as Record<string, unknown>;
  return String(doc._id ?? doc.id ?? '');
}

export default function ApprovalQueue({ pendingSites, pendingPlans, rawSites, rawPlans }: ApprovalQueueProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());

  const handleApprove = async (buttonTag: string, documentId: string) => {
    setProcessing(documentId);
    try {
      const res = await fetch('/api/hestia/guardian/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonTag, documentId, dialogResult: 'Approved' }),
      });
      if (res.ok) {
        setApproved(prev => new Set([...prev, documentId]));
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Sites */}
      <div className="card animate-fade-in stagger-1">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pending Site Registrations
          </h3>
          <span className="pill pill-accent">{pendingSites.length}</span>
        </div>
        {pendingSites.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            No pending site approvals
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {pendingSites.map((site, i) => {
              const docId = getDocId(rawSites[i]);
              const isApproved = approved.has(docId);
              const isProcessing = processing === docId;

              return (
                <div key={docId || i} className={`px-5 py-3 flex items-center justify-between transition-opacity ${isApproved ? 'opacity-40' : ''}`}>
                  <div className="flex-1 grid grid-cols-5 gap-4 text-[12px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Site</div>
                      <div className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{site.siteId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Name</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{site.siteName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Acres</div>
                      <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{site.totalAcres}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Risk</div>
                      <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{site.currentFireRiskScore}/100</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>State</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{site.state}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isApproved ? (
                      <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--compliant)' }}>
                        <CheckCircle2 size={14} /> Approved <ExternalLink size={10} />
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(TAGS.APPROVE_SITE, docId)}
                          disabled={isProcessing}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium text-white transition-opacity disabled:opacity-50"
                          style={{ background: 'var(--compliant)' }}
                        >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-opacity"
                          style={{ color: 'var(--violation)', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Plans */}
      <div className="card animate-fade-in stagger-2">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pending Treatment Plans
          </h3>
          <span className="pill pill-accent">{pendingPlans.length}</span>
        </div>
        {pendingPlans.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            No pending plan approvals
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {pendingPlans.map((plan, i) => {
              const docId = getDocId(rawPlans[i]);
              const isApproved = approved.has(docId);
              const isProcessing = processing === docId;

              return (
                <div key={docId || i} className={`px-5 py-3 flex items-center justify-between transition-opacity ${isApproved ? 'opacity-40' : ''}`}>
                  <div className="flex-1 grid grid-cols-5 gap-4 text-[12px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Plan</div>
                      <div className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{plan.planId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Site</div>
                      <div className="font-mono" style={{ color: 'var(--text-secondary)' }}>{plan.siteId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Type</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{String(plan.treatmentType).replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Acres</div>
                      <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{plan.plannedAcres}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Crew</div>
                      <div className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{plan.crewCertification}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isApproved ? (
                      <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--compliant)' }}>
                        <CheckCircle2 size={14} /> Approved <ExternalLink size={10} />
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(TAGS.APPROVE_PLAN, docId)}
                          disabled={isProcessing}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium text-white transition-opacity disabled:opacity-50"
                          style={{ background: 'var(--compliant)' }}
                        >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium"
                          style={{ color: 'var(--violation)', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
