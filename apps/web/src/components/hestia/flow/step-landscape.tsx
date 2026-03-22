'use client';

import { useState } from 'react';
import { Flame, MapPin, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import type { StepProps } from './hestia-flow';

export default function StepLandscape({ state, updateState, goToStep }: StepProps) {
  const [fires, setFires] = useState<{ count: number; fires: { latitude: number; longitude: number; brightness: number; confidence: string; frp: number; acq_date: string }[]; source: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFires = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hestia/satellite/fires?bbox=-122,37,-118,41&days=7');
      const data = await res.json();
      setFires(data);
      updateState({ satellite: { fires: data, vegetation: state.satellite?.vegetation || null } });
    } catch { /* fallback handled by API */ }
    setLoading(false);
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Dark satellite-style background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0C0A09 0%, #1C1917 30%, #292524 60%, #1C1917 100%)',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-16" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* Narrative intro */}
        <div className="text-center mb-12 max-w-2xl animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 1 of 8 · Satellite Reconnaissance
          </p>
          <h1 className="text-white text-4xl font-light mb-4" style={{ letterSpacing: '-0.03em' }}>
            The Landscape
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            You're looking at the Sierra Nevada from space. Active fire detections from NASA FIRMS pulse across California. This is what a satellite analyst sees every morning before deciding where to focus mitigation efforts.
          </p>
        </div>

        {/* Fire detection panel */}
        <div className="w-full max-w-3xl animate-fade-in stagger-2">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-white/80 text-[12px] font-medium">NASA FIRMS Active Fire Detection</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
                  {fires?.source === 'demo_fallback' ? 'DEMO' : fires ? 'LIVE' : 'READY'} · VIIRS SNPP
                </span>
              </div>
              <button onClick={fetchFires} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ color: '#FB923C', background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)' }}>
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Scanning...' : fires ? 'Refresh' : 'Scan California'}
              </button>
            </div>

            {fires ? (
              <div>
                {fires.fires.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
                    <span className="text-white/70 text-[11px] font-mono w-44">{f.latitude.toFixed(4)}°N, {Math.abs(f.longitude).toFixed(4)}°W</span>
                    <span className="text-red-400 text-[11px] font-mono w-16">{f.brightness}K</span>
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded ${f.confidence === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{f.confidence}</span>
                    <span className="text-white/30 text-[11px] font-mono">{f.frp} MW</span>
                    <span className="text-white/20 text-[10px] font-mono ml-auto">{f.acq_date}</span>
                  </div>
                ))}
                <div className="px-5 py-2.5 text-[9px] text-white/20 font-mono">
                  {fires.count} detections · Source: {fires.source === 'demo_fallback' ? 'Demo data' : 'NASA FIRMS VIIRS SNPP NRT'}
                </div>
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <MapPin size={24} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-[11px]">Click "Scan California" to load real-time fire detection data</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 animate-fade-in stagger-3">
          <p className="text-white/30 text-[11px] text-center mb-4">This landscape needs protection.</p>
          <button onClick={() => goToStep(1)}
            className="flex items-center gap-3 px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
            Register a Treatment Site <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
