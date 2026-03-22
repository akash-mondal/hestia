'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, ArrowRight, Loader2, CheckCircle2, ExternalLink, Crosshair, Home } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

export default function StepCommunity({ state, updateState, goToStep, pollHcs }: StepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.site);
  const [siteId] = useState(() => 'TD-DEMO-' + Date.now().toString(36).slice(-4));

  const [form, setForm] = useState({
    siteName: 'Tahoe Donner Unit 7', ownerEntity: 'Tahoe Donner Association',
    state: 'California', county: 'Nevada County',
    lat: 39.3406, lon: -120.2346,
    acres: 640, wui: 187, vegetation: 'mixed conifer', risk: 78,
    insurer: 'Swiss Re', premium: 285000, hedera: '0.0.8316646',
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [form.lon, form.lat], zoom: 14, pitch: 50, interactive: true, fadeDuration: 0,
    });
    map.on('style.load', () => {
      try { for (const l of map.getStyle().layers) { if (l.type === 'symbol' && l.id.includes('label')) map.setLayoutProperty(l.id, 'visibility', 'none'); } } catch {}
    });
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setForm(f => ({ ...f, lat: Math.round(lat * 10000) / 10000, lon: Math.round(lng * 10000) / 10000 }));
      if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
    });
    const el = document.createElement('div');
    el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#FB923C;border:2px solid white;box-shadow:0 0 10px rgba(251,146,60,0.5);';
    markerRef.current = new mapboxgl.Marker(el).setLngLat([form.lon, form.lat]).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const riskColor = form.risk <= 25 ? '#059669' : form.risk <= 50 ? '#D97706' : form.risk <= 75 ? '#EA580C' : '#DC2626';
  const riskLabel = form.risk <= 25 ? 'Low' : form.risk <= 50 ? 'Moderate' : form.risk <= 75 ? 'High' : 'Extreme';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.SITE_FORM, role: 'land-manager',
          data: { field0: siteId, field1: form.siteName, field2: form.ownerEntity, field3: form.state, field4: form.county,
            field5: form.lat, field6: form.lon, field7: form.acres, field8: form.wui, field9: form.vegetation,
            field10: form.risk, field11: form.insurer, field12: form.premium, field13: form.hedera },
        }),
      });
      if (res.ok) {
        updateState({ site: { data: form as unknown as Record<string, unknown>, hashScanLink: `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}` } });
        setSuccess(true);
        mapRef.current?.flyTo({ center: [-120.5, 39.5], zoom: 7, pitch: 30, duration: 2000 });
        await pollHcs();
      }
    } catch {}
    setSubmitting(false);
  };

  const updateField = (key: string, value: string | number) => {
    setForm(f => ({ ...f, [key]: value }));
    if ((key === 'lat' || key === 'lon') && mapRef.current && markerRef.current) {
      const lat = key === 'lat' ? Number(value) : form.lat;
      const lon = key === 'lon' ? Number(value) : form.lon;
      markerRef.current.setLngLat([lon, lat]);
      mapRef.current.flyTo({ center: [lon, lat], duration: 500 });
    }
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0E0A07 0%, #1F1710 50%, #0E0A07 100%)' }} />
      <style jsx global>{`.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }`}</style>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        <div className="mb-8 animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Step 2 of 8 · Site Registration</p>
          <h1 className="text-white text-4xl font-extralight mb-2" style={{ letterSpacing: '-0.03em' }}>The Community</h1>
          <div className="flex items-center gap-3">
            <p className="text-white/40 text-[13px]">Click the map to place your site. Fill in the details. Register on Hedera.</p>
            <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>Land Manager</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'siteName', label: 'Site Name', type: 'text' },
                  { key: 'ownerEntity', label: 'Owner', type: 'text' },
                  { key: 'acres', label: 'Total Acres', type: 'number' },
                  { key: 'wui', label: 'Structures at Risk', type: 'number' },
                  { key: 'lat', label: 'Latitude (click map)', type: 'number' },
                  { key: 'lon', label: 'Longitude (click map)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
                    <input type={f.type} step="any" value={String((form as Record<string, unknown>)[f.key] ?? '')}
                      onChange={e => updateField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-[12px] font-mono border-0"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                ))}
              </div>

              {/* Risk slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Fire Risk Score</label>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: riskColor }}>{form.risk} — {riskLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={form.risk} onChange={e => updateField('risk', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'linear-gradient(90deg, #059669 0%, #D97706 33%, #EA580C 66%, #DC2626 100%)' }} />
              </div>

              {/* WUI dots */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <Home size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <div className="flex gap-0.5 flex-wrap">{Array.from({ length: Math.min(40, Math.ceil(form.wui / 5)) }, (_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: 'rgba(251,146,60,0.4)' }} />
                ))}</div>
                <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{form.wui} homes</span>
              </div>

              {success ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[12px] font-medium">Site registered on Hedera</span>
                  <a href={state.site?.hashScanLink} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">HashScan <ExternalLink size={10} /></a>
                </div>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#EA580C' }}>
                  {submitting ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Flame size={16} />}
                  {submitting ? 'Registering on Hedera...' : 'Register Site on Hedera'}
                </button>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden relative animate-fade-in stagger-2" style={{ border: '1px solid rgba(255,255,255,0.06)', minHeight: '400px' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[9px] backdrop-blur-md"
              style={{ background: 'rgba(12,10,9,0.7)', color: 'rgba(255,255,255,0.4)' }}>
              <Crosshair size={10} /> Click to set coordinates
            </div>
          </div>
        </div>

        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Site registered. Now it needs approval from a fire inspector.</p>
            <button onClick={() => goToStep(2)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Proceed to Inspection <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
