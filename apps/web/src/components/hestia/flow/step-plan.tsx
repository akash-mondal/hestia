'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, TreePine, Shovel, Loader2, CheckCircle2, ExternalLink, Shield } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TAGS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

const TYPES = [
  { id: 'rx_burn', name: 'Prescribed Burn', icon: Flame, color: '#EF4444', reduction: '65-85%' },
  { id: 'mechanical', name: 'Mechanical Thinning', icon: TreePine, color: '#10B981', reduction: '45-70%' },
  { id: 'defensible', name: 'Defensible Space', icon: Shield, color: '#3B82F6', reduction: '30-50%' },
  { id: 'fuelbreak', name: 'Fuel Break', icon: Shovel, color: '#F59E0B', reduction: '80-95%' },
];

const SITE_BOUNDARY: [number, number][] = [
  [-120.268, 39.358], [-120.256, 39.362], [-120.240, 39.360], [-120.225, 39.355],
  [-120.212, 39.348], [-120.208, 39.338], [-120.210, 39.326], [-120.218, 39.320],
  [-120.232, 39.318], [-120.248, 39.320], [-120.260, 39.328], [-120.267, 39.340], [-120.268, 39.358],
];

export default function StepPlan({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs }: StepProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<mapboxgl.Map | null>(null);
  const [selectedType, setSelectedType] = useState('rx_burn');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [closed, setClosed] = useState(false);
  const [acres, setAcres] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.planApproval);
  const [planId] = useState(() => 'PL-' + Date.now().toString(36).slice(-4));

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;
    const map = new mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/satellite-streets-v12', center: [-120.2346, 39.3406], zoom: 13, pitch: 35, interactive: true, fadeDuration: 0 });
    map.on('style.load', () => { try { for (const l of map.getStyle().layers) { if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', 'none'); } } catch {} });
    map.on('load', () => {
      map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512 });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });
      map.addSource('site-ref', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [SITE_BOUNDARY] } } });
      map.addLayer({ id: 'ref-line', type: 'line', source: 'site-ref', paint: { 'line-color': '#FB923C', 'line-width': 1, 'line-opacity': 0.2, 'line-dasharray': [6, 4] } });
      map.addSource('polygon', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'poly-fill', type: 'fill', source: 'polygon', paint: { 'fill-color': '#F59E0B', 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'poly-line', type: 'line', source: 'polygon', paint: { 'line-color': '#F59E0B', 'line-width': 2.5 } });
      map.addSource('pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'pts-c', type: 'circle', source: 'pts', paint: { 'circle-radius': 4, 'circle-color': '#F59E0B', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
    });
    mapObjRef.current = map;
    return () => { map.remove(); mapObjRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || guidePhase !== 2 || closed) return;
    const handler = (e: mapboxgl.MapMouseEvent) => {
      setPoints(prev => {
        const next = [...prev, [e.lngLat.lng, e.lngLat.lat] as [number, number]];
        (map.getSource('pts') as mapboxgl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: next.map(p => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: p } })) });
        if (next.length >= 3) (map.getSource('polygon') as mapboxgl.GeoJSONSource)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...next, next[0]]] } } as GeoJSON.Feature);
        return next;
      });
    };
    const dbl = () => {
      if (points.length >= 3) {
        setClosed(true);
        const pts = [...points, points[0]];
        let area = 0;
        for (let i = 0; i < pts.length - 1; i++) area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
        area = Math.abs(area) / 2;
        setAcres(Math.round(area * 111.32 * 111.32 * Math.cos(39.34 * Math.PI / 180) * 247.105));
        advanceGuide();
      }
    };
    map.on('click', handler);
    map.on('dblclick', dbl);
    return () => { map.off('click', handler); map.off('dblclick', dbl); };
  }, [guidePhase, closed, points, advanceGuide]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch('/api/hestia/guardian/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: TAGS.PLAN_FORM, role: 'operator', data: { field0: planId, field1: 'TD-DEMO', field2: selectedType, field3: acres || 120, field4: '2026-03-15', field5: '2026-03-18', field6: 18.5, field7: 'CAL FIRE RX-2', field8: 'BP-2026-0341', field9: 'EA-2025-1287' } }) });
      if (r.ok) {
        const planLink = await pollHcs();
        updateState({ plan: { data: { planId, type: selectedType, acres: acres || 120 }, hashScanLink: planLink } });
        try {
          const plans = await fetch('/api/hestia/guardian/plans').then(r => r.json());
          const docs = Array.isArray(plans) ? plans : plans.data || [];
          if (docs.length > 0) { await fetch('/api/hestia/guardian/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buttonTag: 'approve_plan_btn', documentId: docs[0]._id || docs[0].id }) }); const al = await pollHcs(); updateState({ planApproval: { hashScanLink: al } }); }
        } catch {}
        setSuccess(true); completeStep();
      }
    } catch {}
    setSubmitting(false);
  };

  const pulse = (a: boolean) => a ? { animation: 'gp 2s ease-in-out infinite' } : {};
  const selType = TYPES.find(t => t.id === selectedType)!;

  return (
    <div className="h-full flex" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0.2)}}.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}`}</style>

      {/* Map (left, dominant) */}
      <div className="flex-1 relative">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {guidePhase === 2 && !closed && (
          <div className="absolute top-4 left-4 px-3 py-2 text-[11px]" style={{ background: 'rgba(10,8,14,0.8)', color: '#F59E0B', borderRadius: 6, border: '1px solid rgba(245,158,11,0.15)' }}>
            Click 3+ points · Double-click to close{points.length > 0 && <span className="text-white/20 ml-2">{points.length} pts</span>}
          </div>
        )}
        {closed && acres > 0 && (
          <div className="absolute top-4 left-4 text-[13px] font-mono px-3 py-2" style={{ background: 'rgba(10,8,14,0.8)', color: '#10B981', borderRadius: 6 }}>
            {acres} acres drawn
          </div>
        )}
        {/* Faint site reference label */}
        <div className="absolute bottom-3 left-3 text-[9px] font-mono" style={{ color: 'rgba(251,146,60,0.2)' }}>Site boundary (reference)</div>
      </div>

      {/* Right sidebar */}
      <div className="w-80 shrink-0 flex flex-col justify-between py-10 px-7" style={{ borderLeft: '1px solid rgba(255,255,255,0.03)' }}>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(245,158,11,0.5)' }}>Step 4 · Treatment Plan</span>
            <span className="px-2 py-0.5 text-[9px] font-medium" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', borderRadius: 4 }}>Operator</span>
          </div>

          <h1 className="text-white mb-5" style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 100, letterSpacing: '-0.04em' }}>The Plan</h1>

          {/* Treatment type selector */}
          <div className="space-y-1 mb-4">
            {TYPES.map(t => {
              const I = t.icon, sel = selectedType === t.id;
              return (
                <button key={t.id} onClick={() => setSelectedType(t.id)} disabled={guidePhase > 1}
                  className="w-full flex items-center gap-2.5 py-2 px-2.5 text-left transition-all"
                  style={{ borderRadius: 6, background: sel ? `${t.color}08` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <I size={13} style={{ color: sel ? t.color : 'rgba(255,255,255,0.15)' }} />
                  <span className="flex-1 text-[11px]" style={{ color: sel ? '#fff' : 'rgba(255,255,255,0.3)' }}>{t.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: sel ? t.color : 'rgba(255,255,255,0.1)' }}>{t.reduction}</span>
                </button>
              );
            })}
          </div>

          {/* Weather chip */}
          <div className="text-[9px] px-2.5 py-1.5 mb-4" style={{ background: 'rgba(16,185,129,0.04)', color: 'rgba(16,185,129,0.5)', borderRadius: 4 }}>
            NOAA: Wind 5-8 mph NW · RH 35% · 62°F — <span style={{ color: '#10B981' }}>RX WINDOW</span>
          </div>

          {guidePhase === 1 && !success && (
            <button onClick={advanceGuide} className="w-full py-2.5 text-[11px] font-medium text-white/50 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, ...pulse(true) }}>
              Confirm: {selType.name}
            </button>
          )}
        </div>

        <div>
          {guidePhase >= 3 && !success && (
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: '#D97706', borderRadius: 8, ...pulse(!submitting) }}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Submitting + Approving...</span> : 'Submit Plan to Hedera'}
            </button>
          )}
          {success && (
            <div className="flex items-center justify-between py-3 px-4" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.1)', borderRadius: 8 }}>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /><span className="text-amber-400 text-[12px]">Plan submitted & approved</span></div>
              <a href={state.plan?.hashScanLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-orange-400/50 hover:text-orange-400 flex items-center gap-1">HashScan <ExternalLink size={9} /></a>
            </div>
          )}
          {!success && <p className="text-[10px] text-white/12 mt-2">{guidePhase === 1 ? 'Select treatment type.' : guidePhase === 2 ? 'Draw treatment area on the map.' : 'Submit to Guardian.'}</p>}
        </div>
      </div>
    </div>
  );
}
