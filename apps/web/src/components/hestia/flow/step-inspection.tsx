'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Circle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TAGS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

const CHECKS = [
  { id: 'gps', label: 'GPS coordinates verified against county parcels' },
  { id: 'acreage', label: 'Total acreage confirmed (640 acres)' },
  { id: 'wui', label: 'WUI structures count validated (187 homes)' },
  { id: 'vegetation', label: 'Vegetation type confirmed (mixed conifer)' },
  { id: 'fires', label: 'No active fire within treatment boundary' },
];

const SITE_POLY: [number, number][] = [
  [-120.268, 39.358], [-120.256, 39.362], [-120.240, 39.360], [-120.225, 39.355],
  [-120.212, 39.348], [-120.208, 39.338], [-120.210, 39.326], [-120.218, 39.320],
  [-120.232, 39.318], [-120.248, 39.320], [-120.260, 39.328], [-120.267, 39.340], [-120.268, 39.358],
];

export default function StepInspection({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs }: StepProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<mapboxgl.Map | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [docId, setDocId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(!!state.siteApproval);
  const [ndviValue, setNdviValue] = useState<number | null>(null);

  const siteData = state.site?.data as Record<string, unknown> | undefined;
  const nearbyFires = (() => {
    const fires = (state.satellite?.fires as { fires?: { latitude: number; longitude: number }[] })?.fires;
    if (!fires) return 0;
    return fires.filter(f => f.latitude >= 39.28 && f.latitude <= 39.40 && f.longitude >= -120.30 && f.longitude <= -120.18).length;
  })();

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;
    const map = new mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/satellite-streets-v12', center: [-120.2346, 39.3406], zoom: 12.5, pitch: 40, interactive: true, fadeDuration: 0 });
    map.on('style.load', () => { try { for (const l of map.getStyle().layers) { if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', 'none'); } } catch {} });
    map.on('load', () => {
      map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512 });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 });
      map.addSource('boundary', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [SITE_POLY] } } });
      map.addLayer({ id: 'bnd-fill', type: 'fill', source: 'boundary', paint: { 'fill-color': '#10B981', 'fill-opacity': 0.08 } });
      map.addLayer({ id: 'bnd-line', type: 'line', source: 'boundary', paint: { 'line-color': '#10B981', 'line-width': 2, 'line-opacity': 0.5 } });
      const fd = state.satellite?.fires as { fires?: { latitude: number; longitude: number; frp: number }[] } | null;
      if (fd?.fires) {
        map.addSource('fires', { type: 'geojson', data: { type: 'FeatureCollection', features: fd.fires.map(f => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [f.longitude, f.latitude] } })) } });
        map.addLayer({ id: 'f-glow', type: 'circle', source: 'fires', paint: { 'circle-radius': 8, 'circle-color': '#ef4444', 'circle-blur': 0.7, 'circle-opacity': 0.2 } });
        map.addLayer({ id: 'f-dot', type: 'circle', source: 'fires', paint: { 'circle-radius': 3, 'circle-color': '#fca5a5', 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.3)' } });
      }
      map.addSource('lbl', { type: 'geojson', data: { type: 'Feature', properties: { t: '640 acres' }, geometry: { type: 'Point', coordinates: [-120.238, 39.340] } } });
      map.addLayer({ id: 'lbl-t', type: 'symbol', source: 'lbl', layout: { 'text-field': ['get', 't'], 'text-size': 13, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'] }, paint: { 'text-color': 'rgba(16,185,129,0.4)', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1.5 } });
    });
    const el = document.createElement('div');
    el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#10B981;border:2px solid white;box-shadow:0 0 8px rgba(16,185,129,0.5);';
    new mapboxgl.Marker(el).setLngLat([-120.2346, 39.3406]).addTo(map);
    mapObjRef.current = map;
    return () => { map.remove(); mapObjRef.current = null; };
  }, []);

  useEffect(() => {
    if (guidePhase !== 3 || docId) return;
    let cancelled = false;
    setFetching(true);
    const poll = async () => {
      for (let i = 0; i < 10; i++) {
        try { const r = await fetch('/api/hestia/guardian/sites'); if (r.ok) { const d = await r.json(); const docs = Array.isArray(d) ? d : d.data || []; if (docs.length > 0 && !cancelled) { setDocId(docs[0]._id || docs[0].id); setFetching(false); advanceGuide(); return; } } } catch {}
        await new Promise(r => setTimeout(r, 3000));
      }
      if (!cancelled) setFetching(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [guidePhase, docId, advanceGuide]);

  const handleApprove = async () => {
    if (!docId) return;
    setApproving(true);
    try {
      const r = await fetch('/api/hestia/guardian/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buttonTag: TAGS.APPROVE_SITE, documentId: docId }) });
      if (r.ok) { setSuccess(true); const link = await pollHcs(); updateState({ siteApproval: { hashScanLink: link, docId } }); completeStep(); }
    } catch {}
    setApproving(false);
  };

  const handleCheck = (id: string) => {
    const next = { ...checked, [id]: true };
    setChecked(next);
    if (id === 'vegetation' && !ndviValue) fetch('/api/hestia/satellite/vegetation?lat=39.3406&lon=-120.2346&pre_date=2025-06-01&post_date=2026-03-01').then(r => r.json()).then(d => setNdviValue(d.pre_ndvi)).catch(() => {});
    if (CHECKS.every(c => next[c.id]) && guidePhase === 2) advanceGuide();
  };

  const pulse = (a: boolean) => a ? { animation: 'gp 2s ease-in-out infinite' } : {};

  return (
    <div className="h-full flex" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 0 6px rgba(16,185,129,0.2)}}.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}`}</style>

      <div className="w-[480px] shrink-0 flex flex-col justify-between py-10 px-10">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(16,185,129,0.5)' }}>Step 3 · Verifier Approval</span>
            <span className="px-2 py-0.5 text-[9px] font-medium" style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', borderRadius: 4 }}>Verifier</span>
          </div>

          <h1 className="text-white mb-6" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 100, letterSpacing: '-0.04em' }}>The Inspection</h1>

          {/* Registration data */}
          {siteData && (
            <div className="space-y-1.5 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[9px] text-white/15 uppercase tracking-wider mb-2">Registration Data</div>
              {[['Site', siteData.siteName || 'Tahoe Donner Unit 7'], ['Owner', siteData.ownerEntity || 'Tahoe Donner Association'], ['Acres', siteData.acres || 640], ['WUI', siteData.wui || 187], ['Coords', `${siteData.lat || 39.3406}°N, ${Math.abs(Number(siteData.lon) || 120.2346)}°W`]].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-[11px]"><span className="text-white/20">{String(k)}</span><span className="font-mono text-white/50">{String(v)}</span></div>
              ))}
            </div>
          )}

          {/* Phase 1: Review */}
          {guidePhase === 1 && !success && (
            <button onClick={advanceGuide} className="w-full py-2.5 mb-4 text-[11px] font-medium text-white/50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(true) }}>Reviewed</button>
          )}

          {/* Phase 2: Checklist */}
          {guidePhase >= 2 && !success && (
            <div className="space-y-1.5 mb-4">
              {CHECKS.map((c, i) => (
                <button key={c.id} onClick={() => handleCheck(c.id)} disabled={checked[c.id]}
                  className="w-full flex items-center gap-3 py-2 px-3 text-left transition-all"
                  style={{ borderRadius: 6, background: checked[c.id] ? 'rgba(16,185,129,0.04)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)', ...pulse(guidePhase === 2 && !checked[c.id] && Object.values(checked).filter(Boolean).length === i) }}>
                  {checked[c.id] ? <CheckCircle2 size={13} className="text-emerald-400/70 shrink-0" /> : <Circle size={13} className="text-white/12 shrink-0" />}
                  <span className="text-[11px] flex-1" style={{ color: checked[c.id] ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
                    {c.label}
                    {c.id === 'vegetation' && ndviValue && checked[c.id] && <span className="font-mono text-emerald-400/50 ml-1 text-[9px]">NDVI {ndviValue}</span>}
                    {c.id === 'fires' && checked[c.id] && <span className="font-mono ml-1 text-[9px]" style={{ color: nearbyFires === 0 ? '#10B981' : '#F59E0B' }}>{nearbyFires === 0 ? '0 fires ✓' : `${nearbyFires} ⚠`}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Phase 3: Fetching */}
          {guidePhase === 3 && fetching && !success && (
            <div className="flex items-center gap-2 py-3 mb-4"><Loader2 size={13} className="animate-spin text-emerald-400/60" /><span className="text-[11px] text-white/25">Connecting to Guardian...</span></div>
          )}
        </div>

        {/* Bottom — approve */}
        <div>
          {guidePhase >= 4 && !success && (
            <button onClick={handleApprove} disabled={approving} className="w-full py-3 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: '#059669', borderRadius: 8, ...pulse(!approving) }}>
              {approving ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Approving...</span> : <span className="flex items-center justify-center gap-2"><ShieldCheck size={14} />Approve Site Registration</span>}
            </button>
          )}
          {success && (
            <div className="flex items-center justify-between py-3 px-4" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.1)', borderRadius: 8 }}>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /><span className="text-emerald-400 text-[12px]">Site approved</span></div>
              <a href={state.siteApproval?.hashScanLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-orange-400/50 hover:text-orange-400 flex items-center gap-1">HashScan <ExternalLink size={9} /></a>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {nearbyFires > 0 && <div className="absolute top-3 right-3 px-2.5 py-1.5 text-[10px] font-mono" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', borderRadius: 6 }}>{nearbyFires} fires in region</div>}
      </div>
    </div>
  );
}
