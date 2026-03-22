// Globe.GL visualization data for the landing experience
// Each chapter gets unique data layers: points, arcs, rings, paths, labels, heatmaps

// ═══ CAMERA POSITIONS ═══
// Globe.GL altitude: 2.5 = whole globe, 0.5 = region, 0.15 = city level
export const GLOBE_VIEWS = [
  { lat: 22.59, lng: 78.96, altitude: 2.5 },   // Hero: whole globe
  { lat: 25.5,  lng: 81.5,  altitude: 0.6 },   // Ch1: Ganga basin
  { lat: 26.45, lng: 80.33, altitude: 0.15 },   // Ch2: Kanpur sensors
  { lat: 25.32, lng: 83.01, altitude: 0.18 },   // Ch3: Varanasi blockchain
  { lat: 25.43, lng: 81.85, altitude: 0.22 },   // Ch4: Prayagraj evaluation
  { lat: 29.95, lng: 78.16, altitude: 0.15 },   // Ch5: Haridwar tokens
  { lat: 26.0,  lng: 80.5,  altitude: 0.5 },    // Ch6: Satellite overview
  { lat: 22.59, lng: 78.96, altitude: 1.5 },    // Ch7: Dashboard
];

export const CHAPTER_ACCENTS = [
  '#06B6D4', // hero: cyan
  '#F97316', // Ch1: orange (problem/pollution)
  '#06B6D4', // Ch2: cyan (sensors/tech)
  '#8B5CF6', // Ch3: purple (blockchain)
  '#10B981', // Ch4: green (compliance)
  '#F59E0B', // Ch5: amber (tokens/value)
  '#3B82F6', // Ch6: blue (satellite/space)
  '#FFFFFF', // Ch7: white (dashboard)
];

// ═══ GANGA RIVER PATH ═══
// [lat, lng] waypoints tracing the river from Gangotri to Kolkata
const GANGA_COORDS: [number, number][] = [
  [30.92, 79.07], // Gangotri
  [30.09, 78.27], // Rishikesh
  [29.95, 78.17], // Haridwar
  [29.45, 78.55], // Roorkee area
  [28.63, 79.42], // Narora
  [27.55, 79.58], // Farrukhabad
  [27.06, 79.92], // Kannauj
  [26.45, 80.35], // Kanpur
  [26.12, 80.95], // Fatehpur
  [25.43, 81.85], // Prayagraj
  [25.36, 82.50], // Mirzapur
  [25.32, 83.01], // Varanasi
  [25.38, 83.98], // Ghazipur
  [25.57, 84.85], // Buxar
  [25.61, 85.14], // Patna
  [25.40, 85.99], // Munger
  [25.24, 86.98], // Bhagalpur
  [25.00, 87.83], // Rajmahal
  [24.18, 88.26], // Murshidabad
  [23.40, 88.17], // Nabadwip
  [22.57, 88.36], // Kolkata delta
];

// ═══ FACILITY DATA (deterministic) ═══
function srand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface Facility {
  lat: number;
  lng: number;
  name: string;
  cluster: string;
  compliance: number; // 0-1
  intensity: number;  // 0.3-1
}

const CLUSTERS = [
  { lat: 26.45, lng: 80.35, name: 'Kanpur',    count: 15, spread: 0.15 },
  { lat: 25.32, lng: 83.01, name: 'Varanasi',   count: 10, spread: 0.12 },
  { lat: 25.43, lng: 81.85, name: 'Prayagraj',  count: 8,  spread: 0.10 },
  { lat: 29.95, lng: 78.17, name: 'Haridwar',   count: 6,  spread: 0.08 },
  { lat: 25.61, lng: 85.14, name: 'Patna',      count: 8,  spread: 0.12 },
  { lat: 27.06, lng: 79.92, name: 'Kannauj',    count: 5,  spread: 0.08 },
  { lat: 25.24, lng: 86.98, name: 'Bhagalpur',  count: 4,  spread: 0.08 },
  { lat: 22.57, lng: 88.36, name: 'Kolkata',    count: 6,  spread: 0.15 },
];

const FACILITIES: Facility[] = (() => {
  const pts: Facility[] = [];
  let s = 42;
  for (const c of CLUSTERS) {
    for (let i = 0; i < c.count; i++) {
      pts.push({
        lat: c.lat + (srand(++s) - 0.5) * c.spread * 2,
        lng: c.lng + (srand(++s) - 0.5) * c.spread * 2,
        name: `GPI-${c.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        cluster: c.name,
        compliance: srand(++s),
        intensity: 0.3 + srand(++s) * 0.7,
      });
    }
  }
  return pts;
})();

// ═══ SENSOR LOCATIONS ═══
const SENSORS = [
  { lat: 26.42, lng: 80.32 },
  { lat: 26.48, lng: 80.38 },
  { lat: 26.45, lng: 80.30 },
  { lat: 25.30, lng: 83.03 },
  { lat: 25.34, lng: 82.98 },
  { lat: 25.42, lng: 81.82 },
  { lat: 25.44, lng: 81.88 },
  { lat: 29.93, lng: 78.15 },
  { lat: 25.60, lng: 85.12 },
  { lat: 25.62, lng: 85.16 },
];

// ═══ PRE-COMPUTED LAYER DATA ═══

// Ch1: THE PROBLEM — orange points rising + heatmap + river path
const CH1_POINTS = FACILITIES.map(f => ({
  lat: f.lat, lng: f.lng,
  altitude: 0.008 + f.intensity * 0.04,
  color: `rgba(249, 115, 22, ${0.5 + f.intensity * 0.5})`,
  radius: 0.12 + f.intensity * 0.18,
}));
const CH1_PATHS = [{
  coords: GANGA_COORDS,
  color: 'rgba(249, 115, 22, 0.6)',
  stroke: 1.5,
}];
const CH1_HEATMAPS = [{
  points: FACILITIES.map(f => ({ lat: f.lat, lng: f.lng, weight: f.intensity })),
}];

// Ch2: THE SENSORS — cyan pulsing rings + sensor points
const CH2_POINTS = SENSORS.map(s => ({
  lat: s.lat, lng: s.lng,
  altitude: 0.004,
  color: '#06B6D4',
  radius: 0.18,
}));
const CH2_RINGS = SENSORS.map(s => ({
  lat: s.lat, lng: s.lng,
  color: (t: number) => `rgba(6, 182, 212, ${1 - t})`,
  maxR: 3,
  speed: 2,
  repeat: 800,
}));

// Ch3: THE BLOCKCHAIN — animated arcs streaming to convergence point
const HEDERA_POINT = { lat: 28.5, lng: 80.5 };
const CH3_POINTS = [
  ...FACILITIES.slice(0, 15).map(f => ({
    lat: f.lat, lng: f.lng,
    altitude: 0.008,
    color: '#8B5CF6',
    radius: 0.14,
  })),
  // Convergence "Hedera" node
  { lat: HEDERA_POINT.lat, lng: HEDERA_POINT.lng, altitude: 0.02, color: '#06B6D4', radius: 0.35 },
];
const CH3_ARCS = FACILITIES.slice(0, 15).map(f => ({
  startLat: f.lat,
  startLng: f.lng,
  endLat: HEDERA_POINT.lat,
  endLng: HEDERA_POINT.lng,
  color: ['rgba(139, 92, 246, 0.7)', 'rgba(6, 182, 212, 0.7)'],
}));

// Ch4: THE EVALUATION — bicolor compliance points + green river
const CH4_POINTS = FACILITIES.map(f => ({
  lat: f.lat, lng: f.lng,
  altitude: 0.004 + (f.compliance > 0.5 ? f.compliance * 0.035 : 0.005),
  color: f.compliance > 0.5 ? '#10B981' : '#EF4444',
  radius: 0.16,
}));
const CH4_PATHS = [{
  coords: GANGA_COORDS,
  color: 'rgba(16, 185, 129, 0.4)',
  stroke: 1.2,
}];

// Ch5: THE TOKENS — tall green GGCC + short red ZVIOL + mint rings
const CH5_POINTS = FACILITIES.map(f => ({
  lat: f.lat, lng: f.lng,
  altitude: f.compliance > 0.5 ? 0.015 + f.compliance * 0.06 : 0.008,
  color: f.compliance > 0.5 ? '#10B981' : '#EF4444',
  radius: f.compliance > 0.5 ? 0.22 : 0.10,
}));
const CH5_RINGS = FACILITIES
  .filter(f => f.compliance > 0.7)
  .slice(0, 8)
  .map(f => ({
    lat: f.lat, lng: f.lng,
    color: (t: number) => `rgba(16, 185, 129, ${1 - t})`,
    maxR: 2,
    speed: 1.5,
    repeat: 1200,
  }));

// Ch6: THE SATELLITE — blue overview + city labels
const CH6_POINTS = FACILITIES.map(f => ({
  lat: f.lat, lng: f.lng,
  altitude: 0.003,
  color: 'rgba(59, 130, 246, 0.5)',
  radius: 0.10,
}));
const CH6_PATHS = [{
  coords: GANGA_COORDS,
  color: 'rgba(59, 130, 246, 0.35)',
  stroke: 1,
}];
const CH6_LABELS = [
  { lat: 26.45, lng: 80.35, text: 'Kanpur',    color: 'rgba(255,255,255,0.75)', size: 0.5 },
  { lat: 25.32, lng: 83.01, text: 'Varanasi',   color: 'rgba(255,255,255,0.75)', size: 0.5 },
  { lat: 25.43, lng: 81.85, text: 'Prayagraj',  color: 'rgba(255,255,255,0.75)', size: 0.5 },
  { lat: 29.95, lng: 78.17, text: 'Haridwar',   color: 'rgba(255,255,255,0.75)', size: 0.5 },
  { lat: 25.61, lng: 85.14, text: 'Patna',      color: 'rgba(255,255,255,0.75)', size: 0.5 },
  { lat: 22.57, lng: 88.36, text: 'Kolkata',    color: 'rgba(255,255,255,0.75)', size: 0.5 },
];

// Ch7: DASHBOARD — subtle white points + faint river
const CH7_POINTS = FACILITIES.map(f => ({
  lat: f.lat, lng: f.lng,
  altitude: 0.003,
  color: 'rgba(255, 255, 255, 0.3)',
  radius: 0.07,
}));
const CH7_PATHS = [{
  coords: GANGA_COORDS,
  color: 'rgba(6, 182, 212, 0.15)',
  stroke: 0.8,
}];

// ═══ CHAPTER DATA GETTERS ═══
// Each returns the appropriate data array for a given chapter index (-1 = hero, 0-6 = chapters)

export function getChapterPoints(ch: number) {
  switch (ch) {
    case 0: return CH1_POINTS;
    case 1: return CH2_POINTS;
    case 2: return CH3_POINTS;
    case 3: return CH4_POINTS;
    case 4: return CH5_POINTS;
    case 5: return CH6_POINTS;
    case 6: return CH7_POINTS;
    default: return [];
  }
}

export function getChapterArcs(ch: number) {
  return ch === 2 ? CH3_ARCS : [];
}

export function getChapterRings(ch: number) {
  switch (ch) {
    case 1: return CH2_RINGS;
    case 4: return CH5_RINGS;
    default: return [];
  }
}

export function getChapterPaths(ch: number) {
  switch (ch) {
    case 0: return CH1_PATHS;
    case 3: return CH4_PATHS;
    case 5: return CH6_PATHS;
    case 6: return CH7_PATHS;
    default: return [];
  }
}

export function getChapterLabels(ch: number) {
  return ch === 5 ? CH6_LABELS : [];
}

export function getChapterHeatmaps(ch: number) {
  return ch === 0 ? CH1_HEATMAPS : [];
}
