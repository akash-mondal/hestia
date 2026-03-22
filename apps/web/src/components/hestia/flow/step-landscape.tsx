'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

export default function StepLandscape({ state, updateState, goToStep }: StepProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [fires, setFires] = useState<{ count: number; fires: { latitude: number; longitude: number; brightness: number; confidence: string; frp: number; acq_date: string }[]; source: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize Mapbox satellite map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-120.23, 39.34], // Tahoe Donner
      zoom: 8,
      pitch: 45,
      bearing: -15,
      interactive: true,
      fadeDuration: 0,
    });

    map.on('style.load', () => {
      // Hide most labels for cleaner look
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'symbol' && layer.id.includes('label')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
      setMapLoaded(true);
    });

    // Slow rotation
    map.on('load', () => {
      let bearing = -15;
      const rotate = () => {
        if (!mapRef.current) return;
        bearing += 0.03;
        mapRef.current.rotateTo(bearing, { duration: 0 });
        requestAnimationFrame(rotate);
      };
      rotate();
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const fetchFires = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hestia/satellite/fires?bbox=-122,37,-118,41&days=7');
      const data = await res.json();
      setFires(data);
      updateState({ satellite: { fires: data, vegetation: state.satellite?.vegetation || null } });

      // Add fire markers to map
      if (mapRef.current && data.fires) {
        // Remove existing markers
        document.querySelectorAll('.fire-marker').forEach(el => el.remove());

        data.fires.forEach((f: { latitude: number; longitude: number; brightness: number }) => {
          const el = document.createElement('div');
          el.className = 'fire-marker';
          el.style.cssText = `width:16px;height:16px;border-radius:50%;background:rgba(239,68,68,0.8);box-shadow:0 0 12px rgba(239,68,68,0.6),0 0 24px rgba(239,68,68,0.3);animation:pulse 2s infinite;`;
          new mapboxgl.Marker(el).setLngLat([f.longitude, f.latitude]).addTo(mapRef.current!);
        });

        // Also add Tahoe Donner site marker
        const siteEl = document.createElement('div');
        siteEl.style.cssText = `width:12px;height:12px;border-radius:50%;background:#FB923C;border:2px solid white;box-shadow:0 0 8px rgba(251,146,60,0.5);`;
        new mapboxgl.Marker(siteEl).setLngLat([-120.2346, 39.3406]).addTo(mapRef.current);
      }
    } catch { /* fallback handled by API */ }
    setLoading(false);
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Mapbox satellite map — full background */}
      <div className="absolute inset-0 z-0">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        {/* Vignette overlay for readability */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(8,12,20,0.7) 0%, rgba(8,12,20,0.3) 40%, rgba(8,12,20,0.5) 70%, rgba(8,12,20,0.85) 100%)',
        }} />
      </div>

      {/* Pulse keyframe for fire markers */}
      <style jsx global>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.5); opacity: 0.4; } }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-16" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* Narrative intro */}
        <div className="text-center mb-12 max-w-2xl animate-fade-in">
          <p className="text-blue-400/60 text-[11px] tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 1 of 8 · Satellite Reconnaissance
          </p>
          <h1 className="text-white mb-5" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 200, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            The Landscape
          </h1>
          <p className="text-white/60 text-[15px] leading-[1.65]">
            You're looking at the Sierra Nevada from space. Scan for active fire detections from NASA FIRMS. The orange marker is Tahoe Donner — the site we'll protect.
          </p>
        </div>

        {/* Fire detection panel — floats over the map */}
        <div className="w-full max-w-3xl animate-fade-in stagger-2">
          <div className="rounded-xl overflow-hidden backdrop-blur-md" style={{ background: 'rgba(8,12,20,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-white/85 text-[13px] font-semibold">NASA FIRMS Active Fire Detection</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
                  {fires?.source === 'demo_fallback' ? 'DEMO' : fires ? 'LIVE' : 'READY'}
                </span>
              </div>
              <button onClick={fetchFires} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ color: '#FB923C', background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.25)' }}>
                <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
                {loading ? 'Scanning...' : fires ? 'Refresh' : 'Scan California'}
              </button>
            </div>

            {fires ? (
              <div>
                {fires.fires.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none shrink-0" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
                    <span className="text-white/70 text-[11px] font-mono w-44">{f.latitude.toFixed(4)}°N, {Math.abs(f.longitude).toFixed(4)}°W</span>
                    <span className="text-red-400 text-[11px] font-mono w-16">{f.brightness}K</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${f.confidence === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{f.confidence}</span>
                    <span className="text-white/30 text-[11px] font-mono">{f.frp} MW</span>
                    <span className="text-white/20 text-[10px] font-mono ml-auto">{f.acq_date}</span>
                  </div>
                ))}
                <div className="px-5 py-2.5 text-[10px] text-white/20 font-mono">
                  {fires.count} detections · {fires.source === 'demo_fallback' ? 'Demo data' : 'NASA FIRMS VIIRS SNPP NRT'}
                </div>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <MapPin size={20} className="text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-[11px]">Click "Scan California" to detect active fires</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 animate-fade-in stagger-3">
          <p className="text-white/30 text-[11px] text-center mb-4">This landscape needs protection.</p>
          <button onClick={() => goToStep(1)}
            className="flex items-center gap-3 px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none backdrop-blur-sm"
            style={{ background: 'rgba(234, 88, 12, 0.2)', border: '1px solid rgba(234, 88, 12, 0.4)' }}>
            Register Tahoe Donner for Treatment <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
