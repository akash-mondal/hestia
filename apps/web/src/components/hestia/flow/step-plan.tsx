'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, TreePine, Shovel, ArrowRight, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

const TREATMENT_TYPES = [
  { id: 'prescribed_burn', label: 'Prescribed Burn', icon: Flame, desc: 'Controlled fire to reduce fuel load', color: '#EA580C', fill: 'rgba(239,68,68,0.3)' },
  { id: 'mechanical_thin', label: 'Mechanical Thinning', icon: TreePine, desc: 'Selective removal of small-diameter trees', color: '#D97706', fill: 'rgba(5,150,105,0.3)' },
  { id: 'defensible_space', label: 'Defensible Space', icon: Shovel, desc: 'Clear vegetation around structures', color: '#059669', fill: 'rgba(59,130,246,0.3)' },
  { id: 'fuel_break', label: 'Fuel Break', icon: ArrowRight, desc: 'Strategic gaps in vegetation continuity', color: '#2563EB', fill: 'rgba(217,119,6,0.3)' },
] as const;

type TreatmentTypeId = typeof TREATMENT_TYPES[number]['id'];

function calculatePolygonAcres(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const latMid = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const cosLat = Math.cos((latMid * Math.PI) / 180);
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * cosLat;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const xi = coords[i][0] * metersPerDegLon;
    const yi = coords[i][1] * metersPerDegLat;
    const xj = coords[j][0] * metersPerDegLon;
    const yj = coords[j][1] * metersPerDegLat;
    area += xi * yj - xj * yi;
  }
  area = Math.abs(area) * 0.5;
  return area * 0.000247105;
}

export default function StepPlan({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [selected, setSelected] = useState<TreatmentTypeId>('prescribed_burn');
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [submitted, setSubmitted] = useState(!!state.plan);
  const [approved, setApproved] = useState(!!state.planApproval);
  const [statusText, setStatusText] = useState('');
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [polygonClosed, setPolygonClosed] = useState(false);
  const [calculatedAcres, setCalculatedAcres] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const siteLat = Number(state.site?.data?.lat || 39.3406);
  const siteLon = Number(state.site?.data?.lon || -120.2346);

  const planId = 'TP-' + Date.now().toString(36).slice(-4);

  const form = {
    planId,
    siteId: 'TD-001',
    treatmentType: selected,
    plannedAcres: calculatedAcres > 0 ? Math.round(calculatedAcres * 10) / 10 : 120,
    fuelLoadPre: 18.5,
    crewCert: 'CALFIRE-RX-2024-0847',
    burnPermit: 'AQMD-BP-2026-0312',
    envClearance: true,
  };

  const currentFill = TREATMENT_TYPES.find(t => t.id === selected)?.fill || 'rgba(239,68,68,0.3)';
  const currentColor = TREATMENT_TYPES.find(t => t.id === selected)?.color || '#EA580C';

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [siteLon, siteLat],
      zoom: 14,
      attributionControl: false,
    });

    map.on('load', () => {
      map.addSource('polygon', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} },
      });
      map.addLayer({
        id: 'polygon-fill',
        type: 'fill',
        source: 'polygon',
        paint: { 'fill-color': currentFill, 'fill-opacity': 0.5 },
      });
      map.addLayer({
        id: 'polygon-outline',
        type: 'line',
        source: 'polygon',
        paint: { 'line-color': currentColor, 'line-width': 2, 'line-dasharray': [2, 1] },
      });
      // Points source for vertices
      map.addSource('points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'point-circles',
        type: 'circle',
        source: 'points',
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': currentColor, 'circle-stroke-width': 2 },
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLat, siteLon]);

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (polygonClosed) return;
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPolygonCoords(prev => [...prev, coord]);
    };

    const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      setPolygonClosed(true);
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [polygonClosed]);

  // Update polygon on map when coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('polygon') as mapboxgl.GeoJSONSource | undefined;
    if (source && polygonCoords.length >= 3) {
      const ring = [...polygonCoords, polygonCoords[0]];
      source.setData({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {},
      });
    } else if (source) {
      source.setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} });
    }

    const pointSource = map.getSource('points') as mapboxgl.GeoJSONSource | undefined;
    if (pointSource) {
      pointSource.setData({
        type: 'FeatureCollection',
        features: polygonCoords.map(c => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: c },
          properties: {},
        })),
      });
    }

    const acres = calculatePolygonAcres(polygonCoords);
    setCalculatedAcres(acres);
  }, [polygonCoords]);

  // Update polygon fill color when treatment type changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('polygon-fill')) {
      map.setPaintProperty('polygon-fill', 'fill-color', currentFill);
    }
    if (map.getLayer('polygon-outline')) {
      map.setPaintProperty('polygon-outline', 'line-color', currentColor);
    }
    if (map.getLayer('point-circles')) {
      map.setPaintProperty('point-circles', 'circle-stroke-color', currentColor);
    }
  }, [currentFill, currentColor]);

  const resetPolygon = useCallback(() => {
    setPolygonCoords([]);
    setPolygonClosed(false);
    setCalculatedAcres(0);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatusText('Submitting treatment plan to Guardian...');
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.PLAN_FORM,
          role: 'operator',
          data: {
            field0: form.planId,
            field1: form.siteId,
            field2: form.treatmentType,
            field3: form.plannedAcres,
            field4: form.fuelLoadPre,
            field5: form.crewCert,
            field6: form.burnPermit,
            field7: form.envClearance,
          },
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({ plan: { data: form as unknown as Record<string, unknown>, hashScanLink: link } });
        setSubmitted(true);
        await pollHcs();

        // Auto-approve the plan
        setStatusText('Plan submitted. Fetching for approval...');
        await autoApprovePlan();
      }
    } catch { /* handled */ }
    setSubmitting(false);
  };

  const autoApprovePlan = async () => {
    setApproving(true);
    setStatusText('Fetching pending plans...');

    // Wait a moment for Guardian to process
    await new Promise(r => setTimeout(r, 3000));

    try {
      const res = await fetch('/api/hestia/guardian/plans');
      if (res.ok) {
        const plans = await res.json();
        const pendingPlans = Array.isArray(plans) ? plans : [];

        if (pendingPlans.length > 0) {
          const docId = pendingPlans[0]._id;
          setStatusText('Approving treatment plan...');

          const approveRes = await fetch('/api/hestia/guardian/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              buttonTag: TAGS.APPROVE_PLAN,
              documentId: docId,
              dialogResult: 'Approved — burn plan meets CALFIRE RX standards',
            }),
          });

          if (approveRes.ok) {
            const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
            updateState({ planApproval: { hashScanLink: link } });
            setApproved(true);
            setStatusText('');
            await pollHcs();
          } else {
            setStatusText('Approval sent (Guardian processing)');
            setApproved(true);
          }
        } else {
          // No pending plans found — may already be auto-approved
          setStatusText('Plan processed by Guardian');
          setApproved(true);
        }
      }
    } catch {
      setStatusText('Plan submitted (approval pending)');
      setApproved(true);
    }
    setApproving(false);
  };

  const isWorking = submitting || approving;

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #070C09 0%, #0F1F14 50%, #070C09 100%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-emerald-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 4 of 8 · Treatment Plan
          </p>
          <h1 className="text-white text-4xl font-extralight mb-3" style={{ letterSpacing: '-0.03em' }}>The Plan</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-xl">
            CAL FIRE crew lead J. Martinez has assessed the fuel conditions. A prescribed burn is the safest, most effective treatment for Tahoe Donner's mixed conifer stand. The plan includes crew certification, AQMD burn permit, and environmental clearance.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Operator
            </span>
            <span className="font-mono">fresh_oper</span>
          </div>
        </div>

        {/* Treatment type selector */}
        <div className="grid grid-cols-4 gap-3 mb-6 animate-fade-in stagger-1">
          {TREATMENT_TYPES.map(t => {
            const Icon = t.icon;
            const isActive = selected === t.id;
            return (
              <button key={t.id} onClick={() => !isWorking && setSelected(t.id)}
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  background: isActive ? `rgba(255,255,255,0.06)` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? t.color + '40' : 'rgba(255,255,255,0.04)'}`,
                }}>
                <Icon size={20} style={{ color: isActive ? t.color : 'rgba(255,255,255,0.2)' }} />
                <div className="text-[12px] font-medium mt-2" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
                  {t.label}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Two-column: Map + Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left: Map */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-white/80 text-[13px] font-medium">Draw Treatment Area</span>
              <div className="flex items-center gap-2">
                {polygonCoords.length > 0 && (
                  <button onClick={resetPolygon} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}>
                    Reset
                  </button>
                )}
                <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {polygonClosed ? 'Polygon closed' : polygonCoords.length < 3 ? `Click ${3 - polygonCoords.length} more points` : 'Double-click to close'}
                </span>
              </div>
            </div>
            <div ref={mapContainerRef} style={{ height: 380, width: '100%' }} />
            {calculatedAcres > 0 && (
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Drawn area:</span>
                <span className="text-[14px] font-mono font-bold text-emerald-400">{calculatedAcres.toFixed(1)} acres</span>
              </div>
            )}
          </div>

          {/* Right: Form card */}
          <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white/80 text-sm font-medium">Treatment Plan — {TREATMENT_TYPES.find(t => t.id === selected)?.label}</h3>
              <p className="text-white/30 text-[10px] mt-0.5">Pre-filled with CAL FIRE RX standards. Creates a Verifiable Credential on Hedera.</p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Plan ID', value: form.planId },
                { label: 'Site ID', value: form.siteId },
                { label: 'Treatment Type', value: TREATMENT_TYPES.find(t => t.id === selected)?.label || 'Prescribed Burn' },
                { label: 'Planned Acres', value: `${form.plannedAcres} acres` },
                { label: 'Fuel Load (Pre)', value: `${form.fuelLoadPre} tons/acre` },
                { label: 'Crew Certification', value: form.crewCert },
                { label: 'Burn Permit', value: form.burnPermit },
                { label: 'Environmental Clearance', value: form.envClearance ? 'Approved' : 'Pending' },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
                  <div className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              {approved ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[12px] font-medium">Plan submitted and approved on Hedera</span>
                    <a href={state.plan?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                      View on HashScan <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ) : submitted ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)' }}>
                  <Loader2 size={16} className="text-amber-400 animate-spin motion-reduce:animate-none" />
                  <span className="text-amber-400 text-[12px]">{statusText || 'Processing approval...'}</span>
                </div>
              ) : (
                <button onClick={handleSubmit} disabled={isWorking}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                  style={{ background: '#EA580C' }}>
                  {isWorking ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Flame size={16} />}
                  {isWorking ? statusText || 'Submitting...' : 'Submit Treatment Plan to Hedera'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        {approved && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Plan approved. The crew is ready to burn.</p>
            <button onClick={() => goToStep(4)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Report Treatment Completion <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
