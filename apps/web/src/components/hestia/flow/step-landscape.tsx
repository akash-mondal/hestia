'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ArrowRight, AlertTriangle, Crosshair, Navigation } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

interface Fire { latitude: number; longitude: number; brightness: number; confidence: string; frp: number; acq_date: string; acq_time: string }
interface VegResult { pre_ndvi: number; post_ndvi: number; dnbr: number; burn_severity: string; source: string }

export default function StepLandscape({ state, updateState, goToStep }: StepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const rotatingRef = useRef(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [fires, setFires] = useState<{ count: number; fires: Fire[]; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [vegLoading, setVegLoading] = useState(false);
  const [vegResult, setVegResult] = useState<VegResult | null>(null);
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [activeStyle, setActiveStyle] = useState<'satellite' | 'terrain' | 'dark'>('satellite');
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-120.23, 39.34],
      zoom: 8,
      pitch: 45,
      bearing: -15,
      interactive: true,
      fadeDuration: 0,
    });

    map.on('style.load', () => {
      try {
        for (const layer of map.getStyle().layers) {
          if (layer.type === 'symbol' && layer.id.includes('label')) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      } catch { /* */ }
      setMapLoaded(true);
    });

    // Slow rotation — stops on user interaction
    let bearing = -15;
    const rotate = () => {
      if (!mapRef.current || !rotatingRef.current) return;
      bearing += 0.02;
      mapRef.current.rotateTo(bearing, { duration: 0 });
      requestAnimationFrame(rotate);
    };
    map.on('load', () => rotate());

    // Stop rotation on user interaction
    const stopRotation = () => { rotatingRef.current = false; };
    map.on('mousedown', stopRotation);
    map.on('touchstart', stopRotation);

    // Click to query NDVI
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setClickedPoint({ lat, lon: lng });
    });

    // Add Tahoe Donner site marker
    const siteEl = document.createElement('div');
    siteEl.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#FB923C;border:2px solid white;box-shadow:0 0 10px rgba(251,146,60,0.5);cursor:pointer;';
    new mapboxgl.Marker(siteEl)
      .setLngLat([-120.2346, 39.3406])
      .setPopup(new mapboxgl.Popup({ offset: 10, className: 'hestia-popup' }).setHTML(
        '<div style="font-family:monospace;font-size:11px;"><strong>Tahoe Donner</strong><br/>39.3406°N, 120.2346°W<br/>640 acres · 187 structures<br/>Risk: 78/100 (Extreme)</div>'
      ))
      .addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fetch NDVI when user clicks map
  useEffect(() => {
    if (!clickedPoint) return;
    setVegLoading(true);
    fetch(`/api/hestia/satellite/vegetation?lat=${clickedPoint.lat}&lon=${clickedPoint.lon}&pre_date=2025-06-01&post_date=2026-03-01`)
      .then(r => r.json())
      .then(data => {
        setVegResult(data);
        updateState({ satellite: { ...(state.satellite || { fires: null }), vegetation: data } });

        // Show popup on map
        if (mapRef.current && popupRef.current) popupRef.current.remove();
        if (mapRef.current) {
          const popup = new mapboxgl.Popup({ offset: 10, className: 'hestia-popup' })
            .setLngLat([clickedPoint.lon, clickedPoint.lat])
            .setHTML(`<div style="font-family:monospace;font-size:10px;line-height:1.6;">
              <strong>Vegetation Analysis</strong><br/>
              NDVI: ${data.pre_ndvi} → ${data.post_ndvi}<br/>
              dNBR: ${data.dnbr} (${data.burn_severity})<br/>
              <span style="opacity:0.5">${data.source === 'demo_fallback' ? 'Demo data' : 'Sentinel-2 L2A'}</span>
            </div>`)
            .addTo(mapRef.current);
          popupRef.current = popup;
        }
      })
      .catch(() => {})
      .finally(() => setVegLoading(false));
  }, [clickedPoint]);

  // Fetch fires + add markers
  const fetchFires = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hestia/satellite/fires?bbox=-122,37,-118,41&days=7');
      const data = await res.json();
      setFires(data);
      updateState({ satellite: { fires: data, vegetation: state.satellite?.vegetation || null } });

      if (mapRef.current && data.fires) {
        document.querySelectorAll('.fire-marker').forEach(el => el.remove());
        data.fires.forEach((f: Fire) => {
          const el = document.createElement('div');
          el.className = 'fire-marker';
          el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:rgba(239,68,68,0.8);box-shadow:0 0 12px rgba(239,68,68,0.6);cursor:pointer;';

          const marker = new mapboxgl.Marker(el)
            .setLngLat([f.longitude, f.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 10, className: 'hestia-popup' }).setHTML(
              `<div style="font-family:monospace;font-size:10px;line-height:1.6;">
                <strong style="color:#ef4444;">🔥 Active Fire</strong><br/>
                ${f.latitude.toFixed(4)}°N, ${Math.abs(f.longitude).toFixed(4)}°W<br/>
                Brightness: ${f.brightness}K<br/>
                Confidence: ${f.confidence}<br/>
                FRP: ${f.frp} MW<br/>
                ${f.acq_date} ${f.acq_time || ''}
              </div>`
            ))
            .addTo(mapRef.current!);
        });
      }
    } catch { /* fallback handled by API */ }
    setLoading(false);
  }, [state.satellite, updateState]);

  const flyToTahoe = () => {
    rotatingRef.current = false;
    mapRef.current?.flyTo({ center: [-120.2346, 39.3406], zoom: 14, pitch: 60, bearing: 20, duration: 3000 });
  };

  const switchStyle = (style: 'satellite' | 'terrain' | 'dark') => {
    const styles = { satellite: 'mapbox://styles/mapbox/satellite-streets-v12', terrain: 'mapbox://styles/mapbox/outdoors-v12', dark: 'mapbox://styles/mapbox/dark-v11' };
    mapRef.current?.setStyle(styles[style]);
    setActiveStyle(style);
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Full-screen Mapbox */}
      <div className="absolute inset-0 z-0">
        <div ref={mapContainerRef} aria-label="Satellite map" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(8,12,20,0.6) 0%, rgba(8,12,20,0.1) 30%, rgba(8,12,20,0.1) 60%, rgba(8,12,20,0.7) 100%)',
        }} />
      </div>

      <style jsx global>{`
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        .hestia-popup .mapboxgl-popup-content { background: rgba(12,10,9,0.92); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; backdrop-filter: blur(12px); }
        .hestia-popup .mapboxgl-popup-tip { border-top-color: rgba(12,10,9,0.92); }
        .fire-marker { animation: fire-pulse 2s ease-in-out infinite; }
        @keyframes fire-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.4); opacity: 0.5; } }
      `}</style>

      {/* Map controls — top left */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        {/* Fire count badge */}
        {fires && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md" style={{ background: 'rgba(12,10,9,0.8)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
            <span className="text-red-400 text-xs font-mono font-semibold">{fires.count} fires detected</span>
          </div>
        )}

        {/* Layer toggles */}
        <div className="flex gap-1 p-1 rounded-lg backdrop-blur-md" style={{ background: 'rgba(12,10,9,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['satellite', 'terrain', 'dark'] as const).map(style => (
            <button key={style} onClick={() => switchStyle(style)}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all"
              style={{
                background: activeStyle === style ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: activeStyle === style ? 'white' : 'rgba(255,255,255,0.4)',
              }}>
              {style}
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <button onClick={flyToTahoe}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium backdrop-blur-md transition-all hover:bg-white/10"
          style={{ background: 'rgba(12,10,9,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#FB923C' }}>
          <Navigation size={12} /> Fly to Tahoe Donner
        </button>

        <button onClick={fetchFires} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium backdrop-blur-md transition-all hover:bg-white/10"
          style={{ background: 'rgba(12,10,9,0.8)', border: '1px solid rgba(234,88,12,0.2)', color: '#FB923C' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
          {loading ? 'Scanning...' : fires ? 'Refresh fires' : 'Scan for fires'}
        </button>
      </div>

      {/* Click hint */}
      {mapLoaded && !clickedPoint && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md animate-fade-in"
          style={{ background: 'rgba(12,10,9,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Crosshair size={12} className="text-blue-400" />
          <span className="text-white/40 text-[10px]">Click anywhere to analyze vegetation</span>
        </div>
      )}

      {/* NDVI result floating card */}
      {vegResult && clickedPoint && (
        <div className="absolute top-4 right-4 z-20 w-64 rounded-lg backdrop-blur-md animate-fade-in"
          style={{ background: 'rgba(12,10,9,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-3 py-2 text-[10px] font-semibold text-white/60 uppercase tracking-wider border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            Vegetation Analysis
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40">NDVI Before</span>
              <span className="font-mono text-emerald-400">{vegResult.pre_ndvi}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40">NDVI After</span>
              <span className="font-mono text-orange-400">{vegResult.post_ndvi}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40">dNBR</span>
              <span className="font-mono text-amber-400">{vegResult.dnbr}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40">Severity</span>
              <span className="font-mono text-white/70">{vegResult.burn_severity}</span>
            </div>
            <div className="text-[10px] text-white/20 font-mono pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {clickedPoint.lat.toFixed(4)}°N, {Math.abs(clickedPoint.lon).toFixed(4)}°W · {vegResult.source === 'demo_fallback' ? 'Demo' : 'Sentinel-2'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom narrative + CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-8 pb-8 pt-20" style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(8,12,20,0.9) 60%)',
      }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-blue-400/60 text-[11px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Step 1 of 8 · Satellite Reconnaissance
              </p>
              <h1 className="text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                The Landscape
              </h1>
              <p className="text-white/40 text-[13px] max-w-lg leading-relaxed">
                Explore the Sierra Nevada from orbit. Click the map to analyze vegetation. Scan for active fires. The orange marker is Tahoe Donner — the site we'll protect.
              </p>
            </div>
            <button onClick={() => goToStep(1)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 outline-none backdrop-blur-sm shrink-0 ml-8"
              style={{ background: 'rgba(234, 88, 12, 0.2)', border: '1px solid rgba(234, 88, 12, 0.4)' }}>
              Register Site <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
