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
    subtitle: 'LOS ANGELES, 2025',
    title: 'The Threat',
    body: 'Last year, LA burned. $41 billion gone. Insurance companies pulled out of California entirely. A hundred years of putting out every fire left our forests packed with dry fuel, waiting for a spark. There\'s no system to verify who\'s actually managing that risk — and no way for communities doing the work to get rewarded for it.',
    stat: '$41B',
    statLabel: 'in damages, one fire season',
    view: { center: [-118.56, 34.05], zoom: 10, pitch: 40, bearing: -20 },
    cta: { label: 'VIEW RISK MAP', href: '/hestia/satellite' },
  },
  {
    id: 'treatment',
    index: 2,
    label: 'CHAPTER 02',
    subtitle: 'AN OLD SOLUTION, REDISCOVERED',
    title: 'The Treatment',
    body: 'Native communities burned these forests on purpose for thousands of years. It kept them healthy. Today we call it "prescribed burning" — controlled fire that clears out the brush before it becomes fuel for the next megafire. Places like Tahoe Donner have been doing this for decades. The problem? There\'s no standardized way to prove it happened.',
    stat: '77%',
    statLabel: 'fuel reduction possible',
    view: { center: [-120.23, 39.34], zoom: 13, pitch: 50, bearing: 15 },
    cta: { label: 'OPERATOR PORTAL', href: '/hestia/operator' },
  },
  {
    id: 'ledger',
    index: 3,
    label: 'CHAPTER 03',
    subtitle: 'PROOF THAT CAN\'T BE FAKED',
    title: 'The Ledger',
    body: 'Hestia puts every treatment plan, every field report, every satellite check on the Hedera blockchain through Guardian. It\'s a permanent, tamper-proof record. An insurer could verify a burn in Tahoe without trusting anyone — just check the chain. That\'s what this demo shows: a working dMRV pipeline from field to ledger.',
    stat: '75+',
    statLabel: 'records on Hedera in this demo',
    view: { center: [-121.5, 38.5], zoom: 8, pitch: 35, bearing: -10 },
    cta: { label: 'SEE THE PROOF', href: 'https://hashscan.io/testnet/topic/0.0.8317430' },
  },
  {
    id: 'measurement',
    index: 4,
    label: 'CHAPTER 04',
    subtitle: 'BEFORE AND AFTER',
    title: 'The Score',
    body: 'We score wildfire risk from 0 to 100 using six real-world factors: fuel load, terrain slope, nearby structures, firefighter access, fire history, and weather conditions. In our demo, a site modeled on Tahoe Donner drops from 78 (extreme) to 41 (moderate) after treatment. Both scores are recorded on-chain via our RiskScoreOracle smart contract.',
    stat: '78 → 41',
    statLabel: 'extreme to moderate',
    view: { center: [-120.23, 39.34], zoom: 12, pitch: 45, bearing: 20 },
    cta: { label: 'VERIFIER PORTAL', href: '/hestia/verifier' },
  },
  {
    id: 'credits',
    index: 5,
    label: 'CHAPTER 05',
    subtitle: 'TURNING FIRE PREVENTION INTO VALUE',
    title: 'The Credits',
    body: 'Every verified treated acre earns one Wildfire Resilience Credit — a real fungible token on Hedera. In a production system, insurers could accept these credits for premium discounts. The Tahoe Donner HOA already proved the concept: they got 39% off their premiums through verified forest management. Hestia builds the infrastructure to make that scalable.',
    stat: '1,581',
    statLabel: 'WRC tokens minted in demo',
    view: { center: [-122.4, 37.8], zoom: 11, pitch: 40, bearing: -15 },
    cta: { label: 'VIEW TOKENS', href: 'https://hashscan.io/testnet/token/0.0.8312399' },
  },
  {
    id: 'satellite',
    index: 6,
    label: 'CHAPTER 06',
    subtitle: 'EYES IN THE SKY',
    title: 'The Satellite',
    body: 'You can\'t fake a satellite image. NASA FIRMS spots active fires within hours. Sentinel-2 can see exactly where vegetation was cleared, down to 10 meters. Hestia cross-checks every treatment report against what the satellites actually show. If a crew says they cleared 120 acres, we can verify it from space — no trust required.',
    stat: '10m',
    statLabel: 'resolution — one parking space',
    view: { center: [-119.5, 36.5], zoom: 7, pitch: 50, bearing: 0 },
    cta: { label: 'SATELLITE PORTAL', href: '/hestia/satellite' },
  },
  {
    id: 'portals',
    index: 7,
    label: 'CHAPTER 07',
    subtitle: 'PICK YOUR ROLE',
    title: 'Step In',
    body: 'This is a working demo — real Hedera transactions, real Guardian policy, real satellite data feeds. Pick a role and interact with it yourself.',
    stat: '4',
    statLabel: 'live portals',
    view: { center: [-119.5, 37.5], zoom: 5, pitch: 0, bearing: 0 },
  },
];

export const HESTIA_CHAPTER_ACCENTS = [
  '#FB923C', // hero — amber
  '#DC2626', // Ch1: The Threat — red
  '#059669', // Ch2: The Treatment — emerald
  '#6366F1', // Ch3: The Ledger — indigo
  '#F59E0B', // Ch4: The Score — amber
  '#EA580C', // Ch5: The Credits — orange
  '#06B6D4', // Ch6: The Satellite — cyan
  '#FFFFFF', // Ch7: Step In — white
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
