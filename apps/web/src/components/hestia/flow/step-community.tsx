'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, ExternalLink, Lock } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TAGS, RISK_ORACLE_ADDRESS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const SITE = {
  siteName: 'Tahoe Donner Unit 7', ownerEntity: 'Tahoe Donner Association',
  state: 'California', county: 'Nevada County',
  lat: 39.3406, lon: -120.2346, acres: 640, wui: 187, vegetation: 'mixed conifer',
  risk: 78, insurer: 'Swiss Re', premium: 285000, hedera: '0.0.8316646',
};

const BOUNDARY: [number, number][] = [
  [-120.268, 39.358], [-120.256, 39.362], [-120.240, 39.360], [-120.225, 39.355],
  [-120.212, 39.348], [-120.208, 39.338], [-120.210, 39.326], [-120.218, 39.320],
  [-120.232, 39.318], [-120.248, 39.320], [-120.260, 39.328], [-120.267, 39.340], [-120.268, 39.358],
];

export default function StepCommunity({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs }: StepProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<mapboxgl.Map | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.site);
  const [siteId] = useState(() => 'TD-' + Date.now().toString(36).slice(-4));
  const [riskScore, setRiskScore] = useState<{ total: number; category: string } | null>(null);

  useEffect(() => {
    fetch('/api/hestia/contracts/risk-score?fuel=22&slope=12&wui=18&access=7&historical=8&weather=11')
      .then(r => r.json()).then(d => setRiskScore(d)).catch(() => setRiskScore({ total: 78, category: 'Extreme' }));
  }, []);

  const nearbyFires = (() => {
    const fires = (state.satellite?.fires as { fires?: { latitude: number; longitude: number }[] })?.fires;
    if (!fires) return 0;
    return fires.filter(f => f.latitude >= 39.28 && f.latitude <= 39.40 && f.longitude >= -120.30 && f.longitude <= -120.18).length;
  })();

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;
    const map = new mapboxgl.Map({
      container: mapRef.current, style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [SITE.lon, SITE.lat], zoom: 12.8, pitch: 50, interactive: true, fadeDuration: 0,
    });
    map.on('style.load', () => { try { for (const l of map.getStyle().layers) { if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', 'none'); } } catch {} });
    map.on('load', () => {
      map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512 });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 });
      map.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0, 15], 'sky-atmosphere-sun-intensity': 5 } });
      map.addSource('site-boundary', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [BOUNDARY] } } });
      map.addLayer({ id: 'site-fill', type: 'fill', source: 'site-boundary', paint: { 'fill-color': '#FB923C', 'fill-opacity': 0.1 } });
      map.addLayer({ id: 'site-line', type: 'line', source: 'site-boundary', paint: { 'line-color': '#FB923C', 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.6 } });
      const fireData = state.satellite?.fires as { fires?: { latitude: number; longitude: number; frp: number }[] } | null;
      if (fireData?.fires) {
        map.addSource('fires', { type: 'geojson', data: { type: 'FeatureCollection', features: fireData.fires.map(f => ({ type: 'Feature' as const, properties: { frp: f.frp }, geometry: { type: 'Point' as const, coordinates: [f.longitude, f.latitude] } })) } });
        map.addLayer({ id: 'fire-glow', type: 'circle', source: 'fires', paint: { 'circle-radius': 10, 'circle-color': '#ef4444', 'circle-blur': 0.7, 'circle-opacity': 0.2 } });
        map.addLayer({ id: 'fire-dot', type: 'circle', source: 'fires', paint: { 'circle-radius': 3.5, 'circle-color': '#fca5a5', 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.3)' } });
      }
    });
    const el = document.createElement('div');
    el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#FB923C;border:2px solid white;box-shadow:0 0 10px rgba(251,146,60,0.5);';
    new mapboxgl.Marker(el).setLngLat([SITE.lon, SITE.lat]).addTo(map);
    mapObjRef.current = map;
    return () => { map.remove(); mapObjRef.current = null; };
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.SITE_FORM, role: 'land-manager',
          data: { field0: siteId, field1: SITE.siteName, field2: SITE.ownerEntity, field3: SITE.state, field4: SITE.county,
            field5: SITE.lat, field6: SITE.lon, field7: SITE.acres, field8: SITE.wui, field9: SITE.vegetation,
            field10: riskScore?.total ?? SITE.risk, field11: SITE.insurer, field12: SITE.premium, field13: SITE.hedera },
        }),
      });
      if (res.ok) { setSuccess(true); const link = await pollHcs(); updateState({ site: { data: SITE as unknown as Record<string, unknown>, hashScanLink: link } }); completeStep(); }
    } catch {}
    setSubmitting(false);
  };

  const pulse = (active: boolean) => active ? { animation: 'gp 2s ease-in-out infinite' } : {};

  return (
    <div className="h-full flex" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,0)}50%{box-shadow:0 0 0 6px rgba(251,146,60,0.2)}}.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}`}</style>

      {/* Left — content */}
      <div className="w-[480px] shrink-0 flex flex-col justify-between py-10 px-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(251,146,60,0.5)' }}>Step 2 · Site Registration</span>
            <span className="px-2 py-0.5 text-[9px] font-medium" style={{ background: 'rgba(251,146,60,0.08)', color: '#FB923C', borderRadius: 4 }}>Land Manager</span>
          </div>

          {/* Hero — site identity */}
          <h1 className="text-white mb-1" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 100, letterSpacing: '-0.04em', lineHeight: 1 }}>
            Tahoe Donner
          </h1>
          <p className="text-white/20 text-[13px] mb-6">Unit 7 · Nevada County, California</p>

          {/* Key metrics strip */}
          <div className="flex gap-8 mb-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {[
              { label: 'Acres', value: '640', accent: false },
              { label: 'Structures', value: '187', accent: false },
              { label: 'Risk Score', value: riskScore ? String(riskScore.total) : '...', accent: true },
            ].map(m => (
              <div key={m.label}>
                <div className="text-[10px] text-white/20 uppercase tracking-wider mb-1">{m.label}</div>
                <div className="text-xl font-mono" style={{ color: m.accent ? '#EF4444' : 'rgba(255,255,255,0.7)', fontWeight: 300 }}>{m.value}</div>
              </div>
            ))}
            {nearbyFires > 0 && (
              <div>
                <div className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Fires Nearby</div>
                <div className="text-xl font-mono text-red-400" style={{ fontWeight: 300 }}>{nearbyFires}</div>
              </div>
            )}
          </div>

          {/* Registration details */}
          <div className="space-y-2.5 mb-6">
            {[
              ['Owner', SITE.ownerEntity], ['Vegetation', SITE.vegetation], ['Insurer', SITE.insurer],
              ['Coordinates', `${SITE.lat}°N, ${Math.abs(SITE.lon)}°W`], ['Hedera Account', SITE.hedera],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[11px]">
                <span className="text-white/20">{k}</span>
                <span className="font-mono text-white/50">{v}</span>
              </div>
            ))}
            {riskScore && (
              <div className="flex justify-between text-[11px]">
                <span className="text-white/20">Risk Oracle</span>
                <span className="font-mono text-white/25">{RISK_ORACLE_ADDRESS.slice(0, 12)}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom — actions */}
        <div>
          {!success && guidePhase === 1 && (
            <button onClick={advanceGuide} className="w-full py-3 text-[12px] font-medium text-white/60 transition-all hover:text-white/80" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, ...pulse(true) }}>
              Confirm Site Details
            </button>
          )}
          {!success && guidePhase === 2 && (
            <button onClick={advanceGuide} className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-white/60 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, ...pulse(true) }}>
              <Lock size={13} /> Lock Location
            </button>
          )}
          {!success && guidePhase >= 3 && (
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3.5 text-[12px] font-medium text-white disabled:opacity-40 transition-all" style={{ background: '#EA580C', borderRadius: 8, ...pulse(!submitting) }}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Registering on Hedera...</span> : 'Register Site on Hedera'}
            </button>
          )}
          {success && (
            <div className="flex items-center justify-between py-3 px-4" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.1)', borderRadius: 8 }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-[12px]">Registered on Hedera</span>
              </div>
              <a href={state.site?.hashScanLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-orange-400/50 hover:text-orange-400 flex items-center gap-1">
                HashScan <ExternalLink size={9} />
              </a>
            </div>
          )}
          {!success && <p className="text-[10px] text-white/15 mt-3 text-center">{guidePhase === 1 ? 'Review the site data above.' : guidePhase === 2 ? 'Confirm the map location.' : 'Submit to create a Verifiable Credential.'}</p>}
        </div>
      </div>

      {/* Right — map */}
      <div className="flex-1 relative">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
