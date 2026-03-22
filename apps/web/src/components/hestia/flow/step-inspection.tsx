'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, ExternalLink, MapPin, AlertTriangle } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

interface PendingSite {
  _id: string;
  document?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function StepInspection({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [sites, setSites] = useState<PendingSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(!!state.siteApproval);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!state.siteApproval) fetchPendingSites();
  }, []);

  const fetchPendingSites = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/hestia/guardian/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(Array.isArray(data) ? data : []);
      } else {
        setFetchError('Failed to fetch pending sites');
      }
    } catch {
      setFetchError('Network error fetching sites');
    }
    setLoading(false);
  };

  const handleApprove = async (docId: string) => {
    setApproving(true);
    try {
      const res = await fetch('/api/hestia/guardian/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buttonTag: TAGS.APPROVE_SITE,
          documentId: docId,
          dialogResult: 'Approved — site meets WUI defensible space requirements',
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({ siteApproval: { hashScanLink: link, docId } });
        setSuccess(true);
        await pollHcs();
      }
    } catch { /* handled */ }
    setApproving(false);
  };

  const siteData = state.site?.data;

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 3 of 8 · Verifier Approval
          </p>
          <h1 className="text-white text-3xl font-light mb-3" style={{ letterSpacing: '-0.03em' }}>The Inspection</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xl">
            Captain Jake Torres, CAL FIRE Battalion 5, has driven out to Tahoe Donner. He walks the perimeter — checks the fuel loading, confirms the WUI structures match the registration. One click to approve, and the site is cleared for treatment.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Verifier
            </span>
            <span className="font-mono">fresh_veri</span>
          </div>
        </div>

        {/* Site details from previous step */}
        {siteData && (
          <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <MapPin size={14} className="text-orange-400" />
              <h3 className="text-white/80 text-sm font-medium">Registered Site — Under Review</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Site Name', value: String(siteData.siteName || 'Tahoe Donner Unit 7') },
                { label: 'Owner', value: String(siteData.ownerEntity || 'Tahoe Donner Association') },
                { label: 'Location', value: `${siteData.lat || 39.3406}°N, ${Math.abs(Number(siteData.lon || -120.2346))}°W` },
                { label: 'Acreage', value: `${siteData.acres || 640} acres` },
                { label: 'Structures at Risk', value: `${siteData.wui || 187} homes` },
                { label: 'Current Risk Score', value: `${siteData.risk || 78}/100 (Extreme)` },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
                  <div className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending sites / approval */}
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <h3 className="text-white/80 text-sm font-medium">Verifier Approval</h3>
            </div>
            {!success && (
              <button onClick={fetchPendingSites} disabled={loading}
                className="text-[10px] font-mono px-2 py-1 rounded" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          <div className="p-6">
            {success ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-[12px] font-medium">Site approved — cleared for treatment</span>
                <a href={state.siteApproval?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                  View on HashScan <ExternalLink size={10} />
                </a>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 size={16} className="text-white/30 animate-spin" />
                <span className="text-white/30 text-[11px]">Fetching pending sites from Guardian...</span>
              </div>
            ) : fetchError ? (
              <div className="text-center py-8">
                <AlertTriangle size={20} className="text-amber-400/50 mx-auto mb-2" />
                <p className="text-white/30 text-[11px]">{fetchError}</p>
                <button onClick={fetchPendingSites} className="mt-2 text-orange-400 text-[11px] underline">Retry</button>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck size={24} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-[11px]">No pending sites found. The site may already be approved, or Guardian is still processing.</p>
                <button onClick={fetchPendingSites} className="mt-2 text-orange-400 text-[11px] underline">Refresh</button>
              </div>
            ) : (
              <div className="space-y-3">
                {sites.map((site) => (
                  <div key={site._id} className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div className="text-white/70 text-[12px] font-mono">{site._id.slice(-8)}</div>
                      <div className="text-white/30 text-[9px]">Pending verification</div>
                    </div>
                    <button onClick={() => handleApprove(site._id)} disabled={approving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                      style={{ background: '#059669' }}>
                      {approving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {approving ? 'Approving...' : 'APPROVE'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Site approved. Time to plan the prescribed burn.</p>
            <button onClick={() => goToStep(3)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Submit Treatment Plan <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
