'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight, Navigation, Layers, Mountain, Flame, Leaf,
  Shield, Hexagon, X, Trash2, Loader2,
  Crosshair, Eye, EyeOff, Ruler,
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { StepProps } from './hestia-flow';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/* ═══════════════════════════════════════════════════════════
   Constants & Geometry Helpers
   ═══════════════════════════════════════════════════════════ */

const TAHOE = { lat: 39.3406, lon: -120.2346 };

const BURN_PERIMETER: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'Tahoe Donner Unit 7', acres: 640, treatment: 'Prescribed Burn', fuel: '18.5 tons/acre', structures: 187 },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-120.268, 39.358], [-120.256, 39.362], [-120.240, 39.360],
      [-120.225, 39.355], [-120.212, 39.348], [-120.208, 39.338],
      [-120.210, 39.326], [-120.218, 39.320], [-120.232, 39.318],
      [-120.248, 39.320], [-120.260, 39.328], [-120.267, 39.340],
      [-120.268, 39.358],
    ]],
  },
};

const WORLD: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature', properties: {},
  geometry: { type: 'Polygon', coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]] },
};

/** Circle polygon from a point — for fill-extrusion columns & coverage zones */
function circleGeo(lng: number, lat: number, km: number, props: Record<string, unknown>, n = 36): GeoJSON.Feature<GeoJSON.Polygon> {
  const c: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.push([lng + (km / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.cos(a), lat + (km / 111.32) * Math.sin(a)]);
  }
  return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [c] } };
}

/** Build fire GeoJSON sets: columns, zones, points */
function buildFireData(fires: Fire[]) {
  const columns: GeoJSON.Feature[] = [];
  const zones: GeoJSON.Feature[] = [];
  const points: GeoJSON.Feature[] = [];

  fires.forEach((f, i) => {
    const p = { id: i, brightness: f.brightness, confidence: f.confidence, frp: f.frp, date: f.acq_date, time: f.acq_time || '', lat: f.latitude, lon: f.longitude };
    const base = Math.max(0.6, Math.sqrt(f.frp) * 0.3);

    // Column polygon — tight footprint, moderate height
    columns.push(circleGeo(f.longitude, f.latitude, base * 0.15, { ...p, height: Math.max(80, f.frp * 18), zone: 'column' }));
    // Coverage zone — subtle spread indicator
    zones.push(circleGeo(f.longitude, f.latitude, base * 1.2, { ...p, zone: 'spread' }));
    // Center point
    points.push({ type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] } });
  });

  return {
    columns: { type: 'FeatureCollection' as const, features: columns },
    zones: { type: 'FeatureCollection' as const, features: zones },
    points: { type: 'FeatureCollection' as const, features: points },
  };
}

/** Synthetic fire risk grid */
function riskGrid(): GeoJSON.FeatureCollection {
  const f: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let lat = 39.18; lat <= 39.50; lat += 0.005) {
    for (let lon = -120.42; lon <= -120.06; lon += 0.005) {
      const d = Math.sqrt((lat - TAHOE.lat) ** 2 + (lon - TAHOE.lon) ** 2);
      const r = Math.min(1, Math.max(0, 1 - d * 5) + (Math.sin(lat * 900) * Math.cos(lon * 900) + 1) / 2 * 0.2 + (lat > TAHOE.lat ? 0.12 : 0));
      if (r > 0.06) f.push({ type: 'Feature', properties: { risk: r }, geometry: { type: 'Point', coordinates: [lon, lat] } });
    }
  }
  return { type: 'FeatureCollection', features: f };
}

/* ═══════════════════════════════════════════════════════════
   Types & Config
   ═══════════════════════════════════════════════════════════ */

interface Fire { latitude: number; longitude: number; brightness: number; confidence: string; frp: number; acq_date: string; acq_time: string }
interface VegProbe { lat: number; lon: number; pre: number; post: number; dnbr: number; severity: string; src: string; color: string }

type LayerId = 'terrain' | 'fires' | 'vegetation' | 'burn' | 'risk';

const LAYERS: { id: LayerId; name: string; icon: typeof Mountain; desc: string; color: string }[] = [
  { id: 'terrain',    name: 'Terrain & Atmosphere', icon: Mountain,  desc: 'DEM · hillshade · fog',            color: '#818CF8' },
  { id: 'fires',      name: 'FIRMS Active Fire',   icon: Flame,     desc: '3D columns · heatmap · coverage',  color: '#EF4444' },
  { id: 'vegetation', name: 'NDVI Analysis',        icon: Leaf,      desc: 'Click to probe vegetation',        color: '#10B981' },
  { id: 'burn',       name: 'Treatment Zone',       icon: Shield,    desc: 'Prescribed burn boundary',         color: '#F59E0B' },
  { id: 'risk',       name: 'Risk Model',           icon: Hexagon,   desc: 'Predicted fire risk',              color: '#F97316' },
];

const PS = 'font-family:ui-monospace,monospace;font-size:10px;line-height:1.7;padding:10px 14px;color:#fff;';
const PL = (s: string) => `<span style="opacity:0.4;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${s}</span>`;
const PV = (s: string, c = '#fff') => `<span style="color:${c};font-weight:600;">${s}</span>`;

const FIRE_LAYERS = ['fire-zone-fill', 'fire-zone-line', 'fire-columns', 'fires-heat', 'fire-glow', 'fire-dot'];

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export default function StepLandscape({ state, updateState, goToStep, guidePhase, advanceGuide, completeStep }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const rotRef = useRef(true);
  const pulseRef = useRef(0);

  const [active, setActive] = useState<Record<LayerId, boolean>>({ terrain: true, fires: false, vegetation: false, burn: false, risk: false });
  const [expanded, setExpanded] = useState<LayerId | null>('terrain');
  const [ready, setReady] = useState(false);

  const exag = 1.5;
  const [fires, setFires] = useState<{ count: number; fires: Fire[]; source: string } | null>(null);
  const [firesLoading, setFiresLoading] = useState(false);
  const [probes, setProbes] = useState<VegProbe[]>([]);
  const [probeLoading, setProbeLoading] = useState(false);
  const probesGeoRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });

  const [areaMode, setAreaMode] = useState(false);
  const areaStart = useRef<{ lngLat: mapboxgl.LngLat } | null>(null);
  const [areaStats, setAreaStats] = useState<{ acres: number; fireCount: number; risk: string; sw: [number, number]; ne: [number, number] } | null>(null);

  /* ── Map init ──────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [TAHOE.lon, TAHOE.lat], zoom: 9, pitch: 55, bearing: -25,
      interactive: true, fadeDuration: 0, boxZoom: false,
    });

    map.on('style.load', () => {
      // Hide all labels and road shields
      try { for (const l of map.getStyle().layers) { if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', 'none'); } } catch {}
      // DEM source
      if (!map.getSource('mapbox-dem')) map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
      // Dark overlay source
      if (!map.getSource('dark-overlay')) map.addSource('dark-overlay', { type: 'geojson', data: WORLD });
      // Base dark tint (subtle, always on)
      map.addLayer({ id: 'base-tint', type: 'fill', source: 'dark-overlay', paint: { 'fill-color': '#080614', 'fill-opacity': 0.2 } }, map.getStyle().layers.find(l => l.type === 'symbol')?.id);
      // Vegetation probes source
      map.addSource('veg-probes', { type: 'geojson', data: probesGeoRef.current });

      // Terrain on by default
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      map.addLayer({ id: 'hillshade-layer', type: 'hillshade', source: 'mapbox-dem', paint: { 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#050308', 'hillshade-highlight-color': 'rgba(255,255,255,0.08)', 'hillshade-accent-color': '#1a0a2e' } }, 'base-tint');
      map.addLayer({ id: 'sky-layer', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0, 15], 'sky-atmosphere-sun-intensity': 5 } });
      map.setFog({ color: 'rgba(10,8,18,0.85)', 'high-color': 'rgba(18,12,35,0.5)', 'horizon-blend': 0.08, 'space-color': '#0a0a14', 'star-intensity': 0.35 });

      setReady(true);
    });

    // Rotation
    let b = -25;
    const rot = () => { if (!mapRef.current || !rotRef.current) return; b += 0.012; mapRef.current.rotateTo(b, { duration: 0 }); requestAnimationFrame(rot); };
    map.on('load', rot);
    map.on('mousedown', () => { rotRef.current = false; });
    map.on('touchstart', () => { rotRef.current = false; });

    // Tahoe marker (single HTML marker — the fixed reference)
    const el = document.createElement('div');
    el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#FB923C;border:2.5px solid white;box-shadow:0 0 16px rgba(251,146,60,0.6);cursor:pointer;transition:transform 0.2s;';
    el.onmouseenter = () => { el.style.transform = 'scale(1.3)'; };
    el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
    new mapboxgl.Marker(el).setLngLat([TAHOE.lon, TAHOE.lat])
      .setPopup(new mapboxgl.Popup({ offset: 12, className: 'hestia-popup', maxWidth: '240px' }).setHTML(
        `<div style="${PS}"><div style="font-size:12px;font-weight:700;margin-bottom:4px;color:#FB923C;">Tahoe Donner</div>${PL('Coordinates')}<br/>${PV('39.3406°N, 120.2346°W')}<br/>${PL('Area')}<br/>${PV('640 acres · 187 structures')}<br/>${PL('Fire Risk')}<br/>${PV('78/100 — Extreme', '#EF4444')}</div>`
      )).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── Layer 1: Terrain ─────────────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    if (active.terrain) {
      m.setTerrain({ source: 'mapbox-dem', exaggeration: exag });
      if (!m.getLayer('hillshade-layer')) m.addLayer({ id: 'hillshade-layer', type: 'hillshade', source: 'mapbox-dem', paint: { 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#050308', 'hillshade-highlight-color': 'rgba(255,255,255,0.08)', 'hillshade-accent-color': '#1a0a2e' } }, 'base-tint');
      if (!m.getLayer('sky-layer')) m.addLayer({ id: 'sky-layer', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0, 15], 'sky-atmosphere-sun-intensity': 5 } });
      m.setFog({ color: 'rgba(10,8,18,0.85)', 'high-color': 'rgba(18,12,35,0.5)', 'horizon-blend': 0.08, 'space-color': '#0a0a14', 'star-intensity': 0.35 });
    } else {
      m.setTerrain(null as unknown as mapboxgl.TerrainSpecification);
      if (m.getLayer('hillshade-layer')) m.removeLayer('hillshade-layer');
      if (m.getLayer('sky-layer')) m.removeLayer('sky-layer');
      m.setFog(null as unknown as mapboxgl.FogSpecification);
    }
  }, [active.terrain, ready]);


  /* ── Layer 2: FIRMS Active Fire ────────────────────────── */
  const fetchFires = useCallback(async () => {
    setFiresLoading(true);
    try {
      const data = await fetch('/api/hestia/satellite/fires?bbox=-122,37,-118,41&days=7').then(r => r.json());
      setFires(data);
      updateState({ satellite: { fires: data, vegetation: state.satellite?.vegetation || null } });
      const m = mapRef.current; if (!m || !data.fires) return;

      const { columns, zones, points } = buildFireData(data.fires);

      // Sources
      const upsert = (id: string, d: GeoJSON.FeatureCollection) => { if (m.getSource(id)) (m.getSource(id) as mapboxgl.GeoJSONSource).setData(d); else m.addSource(id, { type: 'geojson', data: d }); };
      upsert('fire-columns', columns);
      upsert('fire-zones', zones);
      upsert('fire-points', points);

      // Subtle dark overlay — just enough to boost contrast
      if (!m.getLayer('fire-dark')) m.addLayer({ id: 'fire-dark', type: 'fill', source: 'dark-overlay', paint: { 'fill-color': '#080410', 'fill-opacity': 0.25 } }, m.getStyle().layers.find(l => l.type === 'symbol')?.id);

      // Coverage zones — very subtle spread indicators
      if (!m.getLayer('fire-zone-fill')) m.addLayer({
        id: 'fire-zone-fill', type: 'fill', source: 'fire-zones',
        paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'brightness'], 300, '#7f1d1d', 340, '#92400e', 360, '#78350f'], 'fill-opacity': 0.08 },
      });
      if (!m.getLayer('fire-zone-line')) m.addLayer({
        id: 'fire-zone-line', type: 'line', source: 'fire-zones',
        paint: { 'line-color': ['interpolate', ['linear'], ['get', 'brightness'], 300, '#ef4444', 340, '#ea580c', 360, '#d97706'], 'line-width': 1, 'line-opacity': 0.2, 'line-dasharray': [6, 4] },
      });

      // 3D Fire Columns — tight, translucent, vertical-gradient
      if (!m.getLayer('fire-columns')) m.addLayer({
        id: 'fire-columns', type: 'fill-extrusion', source: 'fire-columns',
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'brightness'], 300, '#ef4444', 330, '#f97316', 355, '#fbbf24'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.55,
          'fill-extrusion-vertical-gradient': true,
        },
      });

      // Heatmap — subtle ambient glow, fades at high zoom
      if (!m.getLayer('fires-heat')) m.addLayer({
        id: 'fires-heat', type: 'heatmap', source: 'fire-points',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 5, 0.2, 20, 0.5, 50, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.2, 14, 1.8],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 30, 14, 50],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.1, 'rgba(127,29,29,0.08)', 0.3, 'rgba(220,38,38,0.18)', 0.5, 'rgba(239,68,68,0.3)', 0.7, 'rgba(249,115,22,0.4)', 0.9, 'rgba(251,191,36,0.5)', 1, 'rgba(254,240,138,0.6)'],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.7, 12, 0.4, 15, 0.15],
        },
      });

      // Center glow — subtle pulsing bloom
      if (!m.getLayer('fire-glow')) m.addLayer({
        id: 'fire-glow', type: 'circle', source: 'fire-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 5, 8, 20, 14, 50, 22],
          'circle-color': ['interpolate', ['linear'], ['get', 'brightness'], 300, '#ef4444', 340, '#f97316', 360, '#fbbf24'],
          'circle-blur': 0.8, 'circle-opacity': 0.35,
        },
      });

      // Center dot — crisp detection point
      if (!m.getLayer('fire-dot')) m.addLayer({
        id: 'fire-dot', type: 'circle', source: 'fire-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 5, 3, 20, 5, 50, 7],
          'circle-color': ['interpolate', ['linear'], ['get', 'brightness'], 300, '#fca5a5', 340, '#fdba74', 360, '#fde68a'],
          'circle-opacity': 0.9, 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      });

      // Click → popup
      if (!(m as any).__fireClick) {
        m.on('click', 'fire-dot', (e) => {
          const p = e.features?.[0]?.properties; if (!p) return;
          new mapboxgl.Popup({ offset: 14, className: 'hestia-popup', maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(
            `<div style="${PS}"><div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:6px;">Active Fire Detection</div>${PL('Position')}<br/>${PV(`${Number(p.lat).toFixed(4)}°N, ${Math.abs(Number(p.lon)).toFixed(4)}°W`)}<br/>${PL('Brightness')}<br/>${PV(`${p.brightness} K`, '#FBBF24')}<br/>${PL('Fire Radiative Power')}<br/>${PV(`${p.frp} MW`, '#F97316')}<br/>${PL('Confidence')}<br/>${PV(String(p.confidence), p.confidence === 'high' ? '#EF4444' : '#F59E0B')}<br/>${PL('Detected')}<br/>${PV(`${p.date} ${p.time}`)}<br/>${PL('Source')}<br/>${PV('VIIRS S-NPP')}</div>`
          ).addTo(m);
        });
        m.on('click', 'fire-zone-fill', (e) => {
          const p = e.features?.[0]?.properties; if (!p) return;
          new mapboxgl.Popup({ offset: 12, className: 'hestia-popup', maxWidth: '220px' }).setLngLat(e.lngLat).setHTML(
            `<div style="${PS}"><div style="font-size:11px;font-weight:700;color:#F97316;margin-bottom:4px;">Fire Spread Zone</div>${PL('Estimated radius')}<br/>${PV(`${(Math.sqrt(Number(p.frp)) * 0.3 * 1.8).toFixed(1)} km`)}<br/>${PL('FRP')}<br/>${PV(`${p.frp} MW`)}</div>`
          ).addTo(m);
        });
        m.on('mouseenter', 'fire-dot', () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', 'fire-dot', () => { if (!active.vegetation && !areaMode) m.getCanvas().style.cursor = ''; });
        m.on('mouseenter', 'fire-columns', () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', 'fire-columns', () => { if (!active.vegetation && !areaMode) m.getCanvas().style.cursor = ''; });
        (m as any).__fireClick = true;
      }

      // Smoky atmosphere when fires active
      if (active.terrain) {
        m.setFog({ color: 'rgba(35,12,5,0.88)', 'high-color': 'rgba(70,25,8,0.55)', 'horizon-blend': 0.12, 'space-color': '#1a0a04', 'star-intensity': 0.1 });
      }
    } catch {}
    setFiresLoading(false);
  }, [state.satellite, updateState, active.terrain, active.vegetation, areaMode]);

  // Fire layer visibility + pulse animation
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    const vis = active.fires ? 'visible' : 'none';
    FIRE_LAYERS.forEach(id => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', vis); });
    if (m.getLayer('fire-dark')) m.setLayoutProperty('fire-dark', 'visibility', vis);
    if (active.fires && !fires) fetchFires();

    // Restore normal fog when fires hidden
    if (!active.fires && active.terrain) {
      m.setFog({ color: 'rgba(10,8,18,0.85)', 'high-color': 'rgba(18,12,35,0.5)', 'horizon-blend': 0.08, 'space-color': '#0a0a14', 'star-intensity': 0.35 });
    }
  }, [active.fires, ready]);

  // Animated pulse on fire glow
  useEffect(() => {
    if (!active.fires) { cancelAnimationFrame(pulseRef.current); return; }
    let frame = 0;
    const tick = () => {
      const m = mapRef.current;
      if (!m || !active.fires || !m.getLayer('fire-glow')) return;
      frame++;
      const t = Math.sin(frame * 0.025) * 0.15 + 0.5;
      m.setPaintProperty('fire-glow', 'circle-opacity', t);
      pulseRef.current = requestAnimationFrame(tick);
    };
    pulseRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pulseRef.current);
  }, [active.fires]);

  /* ── Layer 3: NDVI Analysis (circle layers, not HTML markers) ─ */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    if (active.vegetation) { m.getCanvas().style.cursor = 'crosshair'; } else if (!areaMode) { m.getCanvas().style.cursor = ''; }
  }, [active.vegetation, ready, areaMode]);

  // Build probe layers once
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    if (!m.getLayer('probe-glow')) {
      m.addLayer({ id: 'probe-glow', type: 'circle', source: 'veg-probes', paint: { 'circle-radius': 16, 'circle-color': ['get', 'color'], 'circle-blur': 0.6, 'circle-opacity': 0.35 } });
      m.addLayer({ id: 'probe-dot', type: 'circle', source: 'veg-probes', paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.8)', 'circle-opacity': 1 } });
      m.on('click', 'probe-dot', (e) => {
        const p = e.features?.[0]?.properties; if (!p) return;
        const c = p.color as string;
        new mapboxgl.Popup({ offset: 10, className: 'hestia-popup', maxWidth: '240px' }).setLngLat(e.lngLat).setHTML(
          `<div style="${PS}"><div style="font-size:12px;font-weight:700;color:${c};margin-bottom:4px;">Vegetation — ${p.label}</div>${PL('NDVI Before')}<br/>${PV(String(p.pre), '#10B981')}<br/>${PL('NDVI After')}<br/>${PV(String(p.post), c)}<br/>${PL('dNBR')}<br/>${PV(String(p.dnbr), '#F59E0B')}<br/>${PL('Burn Severity')}<br/>${PV(String(p.severity))}<br/><span style="opacity:0.3;font-size:9px;">${Number(p.lat).toFixed(4)}°N · ${p.src === 'demo_fallback' ? 'Demo' : 'Sentinel-2'}</span></div>`
        ).addTo(m);
      });
      m.on('mouseenter', 'probe-dot', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'probe-dot', () => { if (active.vegetation) m.getCanvas().style.cursor = 'crosshair'; });
    }
  }, [ready]);

  // Click to probe
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    const handle = (e: mapboxgl.MapMouseEvent) => {
      if (!active.vegetation || areaMode) return;
      // Don't probe if clicking on a fire dot or probe dot
      const hits = m.queryRenderedFeatures(e.point, { layers: ['fire-dot', 'probe-dot'].filter(l => m.getLayer(l)) });
      if (hits.length > 0) return;
      const { lng, lat } = e.lngLat;
      setProbeLoading(true);
      fetch(`/api/hestia/satellite/vegetation?lat=${lat}&lon=${lng}&pre_date=2025-06-01&post_date=2026-03-01`)
        .then(r => r.json()).then(d => {
          const ndvi = d.post_ndvi;
          const color = ndvi >= 0.6 ? '#10B981' : ndvi >= 0.4 ? '#84CC16' : ndvi >= 0.2 ? '#F59E0B' : '#EF4444';
          const label = ndvi >= 0.6 ? 'Healthy' : ndvi >= 0.4 ? 'Moderate' : ndvi >= 0.2 ? 'Stressed' : 'Burned';
          const probe: VegProbe = { lat, lon: lng, pre: d.pre_ndvi, post: d.post_ndvi, dnbr: d.dnbr, severity: d.burn_severity, src: d.source, color };
          setProbes(prev => [...prev, probe]);
          // Update GeoJSON source
          probesGeoRef.current = {
            type: 'FeatureCollection',
            features: [...probesGeoRef.current.features, {
              type: 'Feature', properties: { color, label, pre: d.pre_ndvi, post: d.post_ndvi, dnbr: d.dnbr, severity: d.burn_severity, lat, src: d.source },
              geometry: { type: 'Point', coordinates: [lng, lat] },
            }],
          };
          (m.getSource('veg-probes') as mapboxgl.GeoJSONSource)?.setData(probesGeoRef.current);
          updateState({ satellite: { ...(state.satellite || { fires: null }), vegetation: d } });
        }).catch(() => {}).finally(() => setProbeLoading(false));
    };
    m.on('click', handle);
    return () => { m.off('click', handle); };
  }, [active.vegetation, areaMode, state.satellite, updateState]);

  const clearProbes = () => {
    setProbes([]);
    probesGeoRef.current = { type: 'FeatureCollection', features: [] };
    (mapRef.current?.getSource('veg-probes') as mapboxgl.GeoJSONSource)?.setData(probesGeoRef.current);
  };

  /* ── Layer 4: Treatment Zone ───────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    if (active.burn) {
      if (!m.getSource('burn-src')) m.addSource('burn-src', { type: 'geojson', data: BURN_PERIMETER });
      if (!m.getLayer('burn-fill')) m.addLayer({ id: 'burn-fill', type: 'fill', source: 'burn-src', paint: { 'fill-color': '#F59E0B', 'fill-opacity': 0.1 } });
      if (!m.getLayer('burn-line')) m.addLayer({ id: 'burn-line', type: 'line', source: 'burn-src', paint: { 'line-color': '#F59E0B', 'line-width': 2.5, 'line-dasharray': [3, 2], 'line-opacity': 0.7 } });
      if (!(m as any).__burnClick) {
        m.on('click', 'burn-fill', (e) => { new mapboxgl.Popup({ offset: 12, className: 'hestia-popup', maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(`<div style="${PS}"><div style="font-size:12px;font-weight:700;color:#F59E0B;margin-bottom:4px;">Tahoe Donner Unit 7</div>${PL('Treatment')}<br/>${PV('Prescribed Burn')}<br/>${PL('Area')}<br/>${PV('640 acres')}<br/>${PL('Fuel Load')}<br/>${PV('18.5 tons/acre', '#EF4444')}<br/>${PL('Structures')}<br/>${PV('187 homes')}</div>`).addTo(m); });
        (m as any).__burnClick = true;
      }
      m.setLayoutProperty('burn-fill', 'visibility', 'visible');
      m.setLayoutProperty('burn-line', 'visibility', 'visible');
    } else {
      if (m.getLayer('burn-fill')) m.setLayoutProperty('burn-fill', 'visibility', 'none');
      if (m.getLayer('burn-line')) m.setLayoutProperty('burn-line', 'visibility', 'none');
    }
  }, [active.burn, ready]);

  /* ── Layer 5: Risk Model ───────────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !m.isStyleLoaded()) return;
    if (active.risk) {
      if (!m.getSource('risk-src')) m.addSource('risk-src', { type: 'geojson', data: riskGrid() });
      if (!m.getLayer('risk-heat')) m.addLayer({
        id: 'risk-heat', type: 'heatmap', source: 'risk-src',
        paint: { 'heatmap-weight': ['get', 'risk'], 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 14, 2], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 6, 10, 14, 30], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.15, 'rgba(16,185,129,0.15)', 0.35, 'rgba(132,204,22,0.25)', 0.55, 'rgba(245,158,11,0.4)', 0.75, 'rgba(239,68,68,0.6)', 1, 'rgba(220,38,38,0.8)'], 'heatmap-opacity': 0.7 },
      });
      m.setLayoutProperty('risk-heat', 'visibility', 'visible');
    } else { if (m.getLayer('risk-heat')) m.setLayoutProperty('risk-heat', 'visibility', 'none'); }
  }, [active.risk, ready]);

  /* ── Area Selection ────────────────────────────────────── */
  useEffect(() => { const m = mapRef.current; if (!m) return; if (areaMode) { m.getCanvas().style.cursor = 'crosshair'; m.dragPan.disable(); } else { if (!active.vegetation) m.getCanvas().style.cursor = ''; m.dragPan.enable(); ['area-fill', 'area-line'].forEach(l => { if (m.getLayer(l)) m.removeLayer(l); }); if (m.getSource('area-src')) m.removeSource('area-src'); } }, [areaMode, active.vegetation]);

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    const down = (e: mapboxgl.MapMouseEvent & { originalEvent: MouseEvent }) => { if (!areaMode) return; e.preventDefault(); areaStart.current = { lngLat: e.lngLat }; };
    const move = (e: mapboxgl.MapMouseEvent) => {
      if (!areaMode || !areaStart.current) return;
      const s = areaStart.current.lngLat, en = e.lngLat;
      const sw: [number, number] = [Math.min(s.lng, en.lng), Math.min(s.lat, en.lat)], ne: [number, number] = [Math.max(s.lng, en.lng), Math.max(s.lat, en.lat)];
      const rect: GeoJSON.Feature<GeoJSON.Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[sw[0], sw[1]], [ne[0], sw[1]], [ne[0], ne[1]], [sw[0], ne[1]], [sw[0], sw[1]]]] } };
      if (m.getSource('area-src')) (m.getSource('area-src') as mapboxgl.GeoJSONSource).setData(rect);
      else { m.addSource('area-src', { type: 'geojson', data: rect }); m.addLayer({ id: 'area-fill', type: 'fill', source: 'area-src', paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.15 } }); m.addLayer({ id: 'area-line', type: 'line', source: 'area-src', paint: { 'line-color': '#3B82F6', 'line-width': 2, 'line-dasharray': [4, 2] } }); }
    };
    const up = (e: mapboxgl.MapMouseEvent) => {
      if (!areaMode || !areaStart.current) return;
      const s = areaStart.current.lngLat, en = e.lngLat; areaStart.current = null;
      const sw: [number, number] = [Math.min(s.lng, en.lng), Math.min(s.lat, en.lat)], ne: [number, number] = [Math.max(s.lng, en.lng), Math.max(s.lat, en.lat)];
      const acres = Math.round(Math.abs(ne[1] - sw[1]) * 111.32 * Math.abs(ne[0] - sw[0]) * 111.32 * Math.cos((sw[1] + ne[1]) / 2 * Math.PI / 180) * 247.105);
      let fc = 0; fires?.fires.forEach(f => { if (f.longitude >= sw[0] && f.longitude <= ne[0] && f.latitude >= sw[1] && f.latitude <= ne[1]) fc++; });
      const d = Math.sqrt(((sw[1] + ne[1]) / 2 - TAHOE.lat) ** 2 + ((sw[0] + ne[0]) / 2 - TAHOE.lon) ** 2);
      setAreaStats({ acres, fireCount: fc, risk: d < 0.03 ? 'Extreme' : d < 0.08 ? 'High' : d < 0.15 ? 'Moderate' : 'Low', sw, ne });
      setAreaMode(false);
    };
    m.on('mousedown', down); m.on('mousemove', move); m.on('mouseup', up);
    return () => { m.off('mousedown', down); m.off('mousemove', move); m.off('mouseup', up); };
  }, [areaMode, fires]);

  /* ── Actions ───────────────────────────────────────────── */
  const toggle = (id: LayerId) => { setActive(p => ({ ...p, [id]: !p[id] })); if (!active[id]) setExpanded(id); else if (expanded === id) setExpanded(null); };
  const flyTahoe = () => {
    rotRef.current = false;
    mapRef.current?.flyTo({ center: [TAHOE.lon, TAHOE.lat], zoom: 13, pitch: 60, bearing: 20, duration: 3000 });
    if (guidePhase === 2) setTimeout(() => advanceGuide(), 3200);
  };
  const clearArea = () => { setAreaStats(null); const m = mapRef.current; if (m) { ['area-fill', 'area-line'].forEach(l => { if (m.getLayer(l)) m.removeLayer(l); }); if (m.getSource('area-src')) m.removeSource('area-src'); } };
  const cnt = Object.values(active).filter(Boolean).length;

  // Guide phase tracking
  useEffect(() => {
    if (guidePhase === 1 && fires) advanceGuide(); // fires loaded → phase 2
  }, [guidePhase, fires, advanceGuide]);

  useEffect(() => {
    if (guidePhase === 3 && active.burn) { advanceGuide(); completeStep(); } // burn visible → done
  }, [guidePhase, active.burn, advanceGuide, completeStep]);

  const guideLabel = guidePhase === 1 ? 'Toggle "FIRMS Active Fire" to scan for hotspots' : guidePhase === 2 ? 'Click "Fly to Tahoe Donner" to see the site' : guidePhase === 3 ? 'Toggle "Treatment Zone" to view the burn perimeter' : null;
  const guidePulseId = guidePhase === 1 ? 'fires' : guidePhase === 3 ? 'burn' : null;

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0 z-0">
        <div ref={containerRef} aria-label="Satellite map" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(8,10,18,0.4) 0%, transparent 20%, transparent 55%, rgba(8,10,18,0.8) 100%)' }} />
      </div>

      <style jsx global>{`.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}@keyframes guide-pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,0)}50%{box-shadow:0 0 0 6px rgba(251,146,60,0.25)}}`}</style>

      {/* ── Layer Panel ── */}
      <div className="absolute top-4 left-4 z-20 w-56 animate-fade-in" style={{ background: 'rgba(10,8,14,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2"><Layers size={12} className="text-white/40" /><span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Layers</span></div>
          {cnt > 0 && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>{cnt}</span>}
        </div>
        <div className="p-1.5 space-y-0.5">
          {LAYERS.map(l => {
            const I = l.icon, on = active[l.id], ex = expanded === l.id;
            return (<div key={l.id}>
              <button onClick={() => toggle(l.id)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left group" style={{ background: on ? `${l.color}10` : 'transparent', animation: guidePulseId === l.id && !on ? 'guide-pulse 2s ease-in-out infinite' : 'none' }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: on ? `${l.color}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? l.color + '35' : 'rgba(255,255,255,0.05)'}` }}>
                  <I size={10} style={{ color: on ? l.color : 'rgba(255,255,255,0.25)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium" style={{ color: on ? '#fff' : 'rgba(255,255,255,0.5)' }}>{l.name}</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{l.desc}</div>
                </div>
                {on ? <EyeOff size={10} className="text-white/15 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" /> : <Eye size={10} className="text-white/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
              {on && ex && <div className="ml-9 mr-2 mb-1.5 mt-0.5 animate-fade-in">
                {l.id === 'terrain' && <div className="text-[9px] text-white/20">3D elevation active</div>}
                {l.id === 'fires' && <div className="space-y-1">
                  {firesLoading ? <div className="flex items-center gap-1.5"><Loader2 size={9} className="animate-spin text-red-400" /><span className="text-[9px] text-white/25">Scanning FIRMS...</span></div>
                  : fires ? <>
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[9px] font-mono text-red-400 font-semibold">{fires.count} hotspots</span><button onClick={fetchFires} className="text-[8px] text-white/15 hover:text-white/40 ml-auto">refresh</button></div>
                    <div className="text-[8px] font-mono text-white/15">FRP: {fires.fires.reduce((s: number, f: Fire) => s + f.frp, 0).toFixed(0)} MW total</div>
                    <div className="flex items-center gap-1 mt-0.5">{['#7f1d1d', '#dc2626', '#f97316', '#fbbf24'].map((c, i) => <div key={i} className="w-2 h-2 rounded-sm" style={{ background: c }} />)}<span className="text-[7px] text-white/15 ml-0.5">low → high FRP</span></div>
                  </> : <span className="text-[9px] text-white/20">Loading...</span>}
                </div>}
                {l.id === 'vegetation' && <div className="flex items-center gap-2"><span className="text-[9px] text-white/25">{probes.length} probe{probes.length !== 1 ? 's' : ''}</span>{probeLoading && <Loader2 size={9} className="animate-spin text-emerald-400" />}{probes.length > 0 && <button onClick={clearProbes} className="flex items-center gap-1 text-[9px] text-white/15 hover:text-red-400 ml-auto"><Trash2 size={8} />clear</button>}</div>}
                {l.id === 'burn' && <button onClick={() => { rotRef.current = false; mapRef.current?.flyTo({ center: [TAHOE.lon, TAHOE.lat], zoom: 12, pitch: 50, duration: 2000 }); }} className="text-[9px] text-amber-400/50 hover:text-amber-400">Zoom to zone</button>}
                {l.id === 'risk' && <div className="flex items-center gap-0.5">{['#10B981', '#84CC16', '#F59E0B', '#EF4444', '#DC2626'].map((c, i) => <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ background: c, opacity: 0.5 }} />)}<span className="text-[7px] text-white/15 ml-1">low→extreme</span></div>}
              </div>}
            </div>);
          })}
        </div>
        <div className="border-t mx-2" style={{ borderColor: 'rgba(255,255,255,0.04)' }} />
        <div className="p-1.5 space-y-0.5">
          <button onClick={() => { setAreaMode(!areaMode); clearArea(); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left" style={{ background: areaMode ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: areaMode ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${areaMode ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}` }}><Ruler size={10} style={{ color: areaMode ? '#3B82F6' : 'rgba(255,255,255,0.25)' }} /></div>
            <div className="flex-1"><div className="text-[11px] font-medium" style={{ color: areaMode ? '#fff' : 'rgba(255,255,255,0.5)' }}>Area Select</div><div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{areaMode ? 'Click + drag' : 'Draw region'}</div></div>
          </button>
          <button onClick={flyTahoe} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left hover:bg-white/[0.03]" style={{ animation: guidePhase === 2 ? 'guide-pulse 2s ease-in-out infinite' : 'none' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)' }}><Navigation size={10} style={{ color: '#FB923C' }} /></div>
            <div className="text-[11px] font-medium" style={{ color: '#FB923C' }}>Fly to Tahoe Donner</div>
          </button>
        </div>
      </div>

      {/* Area mode overlay */}
      {areaMode && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 px-6 py-3 rounded-xl pointer-events-none animate-fade-in" style={{ background: 'rgba(10,8,14,0.85)', border: '1px solid rgba(59,130,246,0.25)', backdropFilter: 'blur(12px)' }}><div className="flex items-center gap-3"><Crosshair size={16} className="text-blue-400" /><div><div className="text-white text-sm font-medium">Drag to select region</div><div className="text-white/25 text-[10px]">Release to analyze</div></div></div></div>}

      {/* Area stats */}
      {areaStats && <div className="absolute top-4 right-4 z-20 w-56 rounded-xl animate-fade-in" style={{ background: 'rgba(10,8,14,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14 }}>
        <div className="px-3.5 py-2 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}><span className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-wider">Region</span><button onClick={clearArea} className="text-white/15 hover:text-white/40"><X size={12} /></button></div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between"><span className="text-[10px] text-white/30">Area</span><span className="text-[11px] font-mono text-white/70">{areaStats.acres.toLocaleString()} ac</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-white/30">Fires</span><span className="text-[11px] font-mono" style={{ color: areaStats.fireCount > 0 ? '#EF4444' : '#10B981' }}>{areaStats.fireCount}</span></div>
          <div className="flex justify-between"><span className="text-[10px] text-white/30">Risk</span><span className="text-[11px] font-mono text-orange-400">{areaStats.risk}</span></div>
        </div>
      </div>}

      {/* Probe list */}
      {probes.length > 0 && !areaStats && <div className="absolute top-4 right-4 z-20 w-56 rounded-xl animate-fade-in" style={{ background: 'rgba(10,8,14,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 14, maxHeight: 300, overflowY: 'auto' }}>
        <div className="px-3.5 py-2 flex items-center justify-between border-b sticky top-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,8,14,0.95)' }}><span className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">Probes</span><span className="text-[9px] font-mono text-white/25">{probes.length}</span></div>
        <div className="p-1.5 space-y-0.5">{probes.map((p, i) => (
          <button key={i} onClick={() => mapRef.current?.flyTo({ center: [p.lon, p.lat], zoom: 13, duration: 1200 })} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] text-left">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}50` }} />
            <div className="flex-1 min-w-0"><div className="text-[10px] font-mono text-white/50">{p.lat.toFixed(3)}°, {p.lon.toFixed(3)}°</div><div className="text-[8px] text-white/20">NDVI {p.pre}→{p.post} · {p.severity}</div></div>
          </button>))}</div>
      </div>}

      {/* Risk legend */}
      {active.risk && <div className="absolute bottom-36 right-4 z-20 px-3 py-2 rounded-lg animate-fade-in" style={{ background: 'rgba(10,8,14,0.85)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="text-[8px] text-white/25 uppercase tracking-wider mb-1">Fire Risk Model</div>
        <div className="flex gap-0.5 mb-0.5">{['#10B981', '#84CC16', '#D4D40A', '#F59E0B', '#EF4444', '#DC2626'].map((c, i) => <div key={i} className="w-4 h-1.5 rounded-sm" style={{ background: c }} />)}</div>
        <div className="flex justify-between text-[7px] text-white/20 font-mono"><span>Low</span><span>Extreme</span></div>
      </div>}

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-8 pb-8 pt-24" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,10,18,0.95) 55%)' }}>
        <div className="max-w-3xl mx-auto"><div className="flex items-end justify-between gap-8">
          <div>
            <p className="text-blue-400/50 text-[11px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Step 1 of 8 · Satellite Reconnaissance</p>
            <h1 className="text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.1 }}>The Landscape</h1>
            {guideLabel && <p className="text-orange-400/70 text-[13px] max-w-lg leading-relaxed font-medium">{guideLabel}</p>}
            {!guideLabel && <p className="text-white/35 text-[13px] max-w-lg leading-relaxed">Satellite reconnaissance complete. Use the nav bar to proceed.</p>}
          </div>
        </div></div>
      </div>
    </div>
  );
}
