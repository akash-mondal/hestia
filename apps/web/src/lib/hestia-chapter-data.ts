import type { Chapter, ChapterView } from './chapter-data';

export const HESTIA_HERO_VIEW: ChapterView = {
  center: [-119.5, 37.5],
  zoom: 5,
  pitch: 0,
  bearing: 0,
};

export const HESTIA_CHAPTERS: Chapter[] = [
  {
    id: 'threat',
    index: 1,
    label: 'CHAPTER 01',
    subtitle: '$41 BILLION IN DAMAGES — LOS ANGELES 2025',
    title: 'The Threat',
    body: 'The 2025 Los Angeles wildfires were the costliest natural disaster in American history. Insurers are fleeing California. A century of fire suppression has created a tinderbox. The question isn\'t if the next megafire will hit — it\'s who will pay for it.',
    stat: '$41B',
    statLabel: 'in wildfire damages (2025)',
    view: { center: [-118.56, 34.05], zoom: 10, pitch: 40, bearing: -20 },
    cta: { label: 'VIEW RISK MAP', href: '/hestia/satellite' },
  },
  {
    id: 'treatment',
    index: 2,
    label: 'CHAPTER 02',
    subtitle: 'PRESCRIBED BURNS & FUEL REDUCTION',
    title: 'The Treatment',
    body: 'Prescribed burns, mechanical thinning, defensible space — these aren\'t just fire prevention, they\'re ecosystem restoration. Indigenous communities managed forests this way for millennia. The Tahoe Donner HOA proved it works: 20+ years of active management.',
    stat: '118.5',
    statLabel: 'acres treated (Tahoe Donner)',
    view: { center: [-120.23, 39.34], zoom: 13, pitch: 50, bearing: 15 },
    cta: { label: 'OPERATOR PORTAL', href: '/hestia/operator' },
  },
  {
    id: 'ledger',
    index: 3,
    label: 'CHAPTER 03',
    subtitle: 'HEDERA GUARDIAN VERIFIABLE CREDENTIALS',
    title: 'The Ledger',
    body: 'Every treatment plan, field report, and satellite verification becomes a Verifiable Credential on Hedera Guardian. 77 policy blocks, 6 schemas, 4 roles — a complete digital MRV system anchored to the Hedera Consensus Service.',
    stat: '77',
    statLabel: 'Guardian policy blocks',
    view: { center: [-121.5, 38.5], zoom: 8, pitch: 35, bearing: -10 },
    cta: { label: 'VERIFY ON HASHSCAN', href: 'https://hashscan.io/testnet/topic/0.0.8317430' },
  },
  {
    id: 'measurement',
    index: 4,
    label: 'CHAPTER 04',
    subtitle: '6-COMPONENT WILDFIRE RISK SCORING',
    title: 'The Measurement',
    body: 'Fuel load from LANDFIRE. Slope from terrain models. WUI density from structure counts. Historical fire from MTBS. Weather from NOAA. Six components, weighted to 100. Tahoe Donner: pre-treatment 78 (Extreme) → post-treatment 41 (Moderate). On-chain via RiskScoreOracle.',
    stat: '78→41',
    statLabel: 'risk score reduction',
    view: { center: [-120.23, 39.34], zoom: 12, pitch: 45, bearing: 20 },
    cta: { label: 'VERIFIER PORTAL', href: '/hestia/verifier' },
  },
  {
    id: 'credits',
    index: 5,
    label: 'CHAPTER 05',
    subtitle: 'WILDFIRE RESILIENCE CREDITS ON HEDERA',
    title: 'The Credits',
    body: 'One WRC token per verified treated acre. Fungible HTS tokens on Hedera testnet — 1,581 WRC minted and verifiable on HashScan. Land managers earn credits. Insurers trade risk reduction for premium discounts. Nature → Measured Outcome → Tradable Unit → Financial Value.',
    stat: '1,581',
    statLabel: 'WRC tokens minted',
    view: { center: [-122.4, 37.8], zoom: 11, pitch: 40, bearing: -15 },
    cta: { label: 'VIEW ON HASHSCAN', href: 'https://hashscan.io/testnet/token/0.0.8312399' },
  },
  {
    id: 'satellite',
    index: 6,
    label: 'CHAPTER 06',
    subtitle: 'FIRMS + SENTINEL-2 + LANDFIRE + NOAA',
    title: 'The Satellite',
    body: 'NASA FIRMS detects active fires in near-real-time. Sentinel-2 measures NDVI/NBR vegetation change at 10m resolution. LANDFIRE provides fuel models. NOAA tracks red flag warnings. Four independent data sources — no single point of failure.',
    stat: '10m',
    statLabel: 'satellite resolution',
    view: { center: [-119.5, 36.5], zoom: 7, pitch: 50, bearing: 0 },
    cta: { label: 'SATELLITE PORTAL', href: '/hestia/satellite' },
  },
  {
    id: 'portals',
    index: 7,
    label: 'CHAPTER 07',
    subtitle: 'CHOOSE YOUR ROLE',
    title: 'The Portals',
    body: 'Four stakeholder portals, each designed for a different role in the wildfire resilience ecosystem. Real Guardian data, real Hedera transactions, real satellite imagery. Every action creates a verifiable on-chain record.',
    stat: '4',
    statLabel: 'role-based portals',
    view: { center: [-119.5, 37.5], zoom: 5, pitch: 0, bearing: 0 },
  },
];

export const HESTIA_CHAPTER_ACCENTS = [
  '#FB923C', // hero — amber
  '#DC2626', // Ch1: The Threat — red
  '#059669', // Ch2: The Treatment — emerald
  '#6366F1', // Ch3: The Ledger — indigo
  '#F59E0B', // Ch4: The Measurement — amber
  '#EA580C', // Ch5: The Credits — orange
  '#06B6D4', // Ch6: The Satellite — cyan
  '#FFFFFF', // Ch7: The Portals — white
];

export const HESTIA_ROLES = [
  { id: 'land-manager', title: 'Land Manager', subtitle: 'HOA / Fire District', href: '/hestia/land-manager', gradient: 'from-orange-700 to-amber-500' },
  { id: 'operator', title: 'Operator', subtitle: 'Burn Crew / Contractor', href: '/hestia/operator', gradient: 'from-emerald-700 to-emerald-400' },
  { id: 'verifier', title: 'Verifier', subtitle: 'CAL FIRE / Insurer', href: '/hestia/verifier', gradient: 'from-indigo-700 to-indigo-400' },
  { id: 'satellite', title: 'Satellite', subtitle: 'Automated Middleware', href: '/hestia/satellite', gradient: 'from-red-700 to-red-400' },
];

export const HESTIA_PARTNERS = [
  { name: 'Hedera', url: 'https://hedera.com' },
  { name: 'Guardian', url: 'https://guardian.hedera.com' },
  { name: 'NASA FIRMS', url: 'https://firms.modaps.eosdis.nasa.gov' },
  { name: 'NOAA', url: 'https://www.noaa.gov' },
  { name: 'ESA Copernicus', url: 'https://www.copernicus.eu' },
];
