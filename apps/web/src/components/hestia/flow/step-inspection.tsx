'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, ExternalLink, MapPin, AlertTriangle } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

interface PendingSite {
  _id?: string;
  id?: string;
  document?: Record<string, unknown>;
  [key: string]: unknown;
}

function getDocId(site: PendingSite): string {
  return String(site._id ?? site.id ?? '');
}

interface VerificationChecklist {
  gps: boolean;
  acreage: boolean;
  wui: boolean;
  vegetation: boolean;
}

export default function StepInspection({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [sites, setSites] = useState<PendingSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(!!state.siteApproval);
  const [fetchError, setFetchError] = useState('');
  const [checklist, setChecklist] = useState<VerificationChecklist>({ gps: false, acreage: false, wui: false, vegetation: false });
  const [ndvi, setNdvi] = useState<{ value: number; date: string } | null>(null);
  const [ndviLoading, setNdviLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const siteData = state.site?.data;
  const siteLat = Number(siteData?.lat || 39.3406);
  const siteLon = Number(siteData?.lon || -120.2346);

  const allChecked = checklist.gps && checklist.acreage && checklist.wui && checklist.vegetation;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!state.siteApproval) fetchPendingSites();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [siteLon, siteLat],
      zoom: 13,
      attributionControl: false,
    });
    new mapboxgl.Marker({ color: '#EA580C' })
      .setLngLat([siteLon, siteLat])
      .addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [siteLat, siteLon]);

  // Fetch NDVI
  useEffect(() => {
    const fetchNdvi = async () => {
      setNdviLoading(true);
      try {
        const res = await fetch(`/api/hestia/satellite/ndvi?lat=${siteLat}&lon=${siteLon}`);
        if (res.ok) {
          const data = await res.json();
          setNdvi({ value: data.ndvi ?? data.mean_ndvi ?? 0.72, date: data.date ?? new Date().toISOString().split('T')[0] });
        } else {
          setNdvi({ value: 0.72, date: new Date().toISOString().split('T')[0] });
        }
      } catch {
        setNdvi({ value: 0.72, date: new Date().toISOString().split('T')[0] });
      }
      setNdviLoading(false);
    };
    fetchNdvi();
  }, [siteLat, siteLon]);

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

  const toggleCheck = useCallback((key: keyof VerificationChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #090A10 0%, #131528 50%, #090A10 100%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-indigo-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 3 of 8 · Verifier Approval
          </p>
          <h1 className="text-white text-4xl font-extralight mb-3" style={{ letterSpacing: '-0.03em' }}>The Inspection</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-xl">
            Captain Jake Torres, CAL FIRE Battalion 5, has driven out to Tahoe Donner. He walks the perimeter — checks the fuel loading, confirms the WUI structures match the registration. One click to approve, and the site is cleared for treatment.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Verifier
            </span>
            <span className="font-mono">fresh_veri</span>
          </div>
        </div>

        {/* Two-column layout: Map + Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Satellite map */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <MapPin size={14} className="text-orange-400" />
              <h3 className="text-white/80 text-sm font-medium">Site Location — Satellite View</h3>
            </div>
            <div ref={mapContainerRef} style={{ height: 320, width: '100%' }} />
            <div className="p-4 flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {siteLat.toFixed(4)}°N, {Math.abs(siteLon).toFixed(4)}°W
              </span>
              {ndviLoading ? (
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Loader2 size={10} className="inline animate-spin mr-1" />Loading NDVI...
                </span>
              ) : ndvi ? (
                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  NDVI: <span className="text-emerald-400 font-bold">{ndvi.value.toFixed(2)}</span>
                  <span className="text-white/20 ml-2">({ndvi.date})</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: Site details + NDVI */}
          <div className="space-y-6">
            {/* Site details from previous step */}
            {siteData && (
              <div className="rounded-xl overflow-hidden animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <MapPin size={14} className="text-orange-400" />
                  <h3 className="text-white/80 text-sm font-medium">Registered Site — Under Review</h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: 'Site Name', value: String(siteData.siteName || 'Tahoe Donner Unit 7') },
                    { label: 'Owner', value: String(siteData.ownerEntity || 'Tahoe Donner Association') },
                    { label: 'Location', value: `${siteData.lat || 39.3406}°N, ${Math.abs(Number(siteData.lon || -120.2346))}°W` },
                    { label: 'Acreage', value: `${siteData.acres || 640} acres` },
                    { label: 'Structures at Risk', value: `${siteData.wui || 187} homes` },
                    { label: 'Current Risk Score', value: `${siteData.risk || 78}/100 (Extreme)` },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
                      <div className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <ShieldCheck size={14} className="text-indigo-400" />
                <h3 className="text-white/80 text-sm font-medium">Verification Checklist</h3>
                <span className="ml-auto text-[10px] font-mono" style={{ color: allChecked ? '#059669' : 'rgba(255,255,255,0.25)' }}>
                  {Object.values(checklist).filter(Boolean).length}/4 verified
                </span>
              </div>
              <div className="p-6 space-y-3">
                {([
                  { key: 'gps' as const, label: 'GPS Verified', desc: 'Coordinates match registered location within 50m tolerance' },
                  { key: 'acreage' as const, label: 'Acreage Confirmed', desc: 'Parcel boundaries match declared 640 acres' },
                  { key: 'wui' as const, label: 'WUI Count Verified', desc: '187 structures confirmed within Wildland-Urban Interface zone' },
                  { key: 'vegetation' as const, label: 'Vegetation Check', desc: 'Mixed conifer stand, fuel loading consistent with 18.5 tons/acre' },
                ] as const).map(item => (
                  <button key={item.key} onClick={() => !success && toggleCheck(item.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                    style={{
                      background: checklist[item.key] ? 'rgba(5,150,105,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${checklist[item.key] ? 'rgba(5,150,105,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                    <div className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                      style={{
                        background: checklist[item.key] ? '#059669' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${checklist[item.key] ? '#059669' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {checklist[item.key] && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: checklist[item.key] ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
                        {item.label}
                      </div>
                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

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
                <Loader2 size={16} className="text-white/30 animate-spin motion-reduce:animate-none" />
                <span className="text-white/30 text-[11px]">Loading site registration for review...</span>
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
                <p className="text-white/30 text-[11px]">Your site registration is being processed on Hedera. Guardian creates a Verifiable Credential and anchors it to the Consensus Service — this typically takes 5-10 seconds.</p>
                <button onClick={fetchPendingSites} className="mt-2 text-orange-400 text-[11px] underline">Refresh</button>
              </div>
            ) : (
              <div className="space-y-3">
                {!allChecked && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-2" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.12)' }}>
                    <AlertTriangle size={12} className="text-amber-400/60" />
                    <span className="text-amber-400/70 text-[10px]">Complete all verification checks above before approving</span>
                  </div>
                )}
                {sites.map((site) => {
                  const docId = getDocId(site);
                  return (
                  <div key={docId} className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div className="text-white/70 text-[12px] font-mono">{docId.slice(-12)}</div>
                      <div className="text-white/30 text-[10px]">Pending verification</div>
                    </div>
                    <button onClick={() => handleApprove(docId)} disabled={approving || !docId || !allChecked}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                      style={{ background: allChecked ? '#059669' : 'rgba(255,255,255,0.1)' }}>
                      {approving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <ShieldCheck size={14} />}
                      {approving ? 'Approving...' : 'APPROVE'}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Site approved. Time to plan the prescribed burn.</p>
            <button onClick={() => goToStep(3)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Submit Treatment Plan <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
