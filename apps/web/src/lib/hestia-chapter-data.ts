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
    body: 'Last year, LA burned. $41 billion gone. Homes, lives, entire neighborhoods — wiped out. Insurance companies pulled out of California entirely. And here\'s the thing: it didn\'t have to happen. A hundred years of putting out every fire left our forests packed with dry fuel, just waiting for a spark.',
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
    body: 'Native communities burned these forests on purpose for thousands of years. It kept them healthy. Today we call it "prescribed burning" — controlled fire that clears out the brush before it becomes fuel for the next megafire. Tahoe Donner has been doing this for 20 years. It works.',
    stat: '118.5',
    statLabel: 'acres cleared at Tahoe Donner',
    view: { center: [-120.23, 39.34], zoom: 13, pitch: 50, bearing: 15 },
    cta: { label: 'OPERATOR PORTAL', href: '/hestia/operator' },
  },
  {
    id: 'ledger',
    index: 3,
    label: 'CHAPTER 03',
    subtitle: 'PROOF THAT CAN\'T BE FAKED',
    title: 'The Ledger',
    body: 'When a crew finishes a burn, who believes them? We put every treatment plan, every field report, every satellite check on the Hedera blockchain. It\'s a permanent, tamper-proof record. An insurer in New York can verify a burn in Tahoe without trusting anyone — they just check the chain.',
    stat: '75+',
    statLabel: 'records on Hedera right now',
    view: { center: [-121.5, 38.5], zoom: 8, pitch: 35, bearing: -10 },
    cta: { label: 'SEE THE PROOF', href: 'https://hashscan.io/testnet/topic/0.0.8317430' },
  },
  {
    id: 'measurement',
    index: 4,
    label: 'CHAPTER 04',
    subtitle: 'BEFORE AND AFTER',
    title: 'The Score',
    body: 'We measure wildfire risk on a scale of 0 to 100 using six real-world factors: how much fuel is on the ground, how steep the terrain is, how many homes are nearby, road access for firefighters, fire history, and current weather. Tahoe Donner scored 78 before treatment — extreme. After? 41. Moderate. That\'s the difference between losing your home and keeping it.',
    stat: '78 → 41',
    statLabel: 'extreme to moderate',
    view: { center: [-120.23, 39.34], zoom: 12, pitch: 45, bearing: 20 },
    cta: { label: 'VERIFIER PORTAL', href: '/hestia/verifier' },
  },
  {
    id: 'credits',
    index: 5,
    label: 'CHAPTER 05',
    subtitle: 'TURNING FIRE PREVENTION INTO CURRENCY',
    title: 'The Credits',
    body: 'Every acre you clear earns one Wildfire Resilience Credit — a real token on Hedera that proves you did the work. Your insurer sees those credits and cuts your premium. Tahoe Donner got 39% off. That\'s $111,000 a year back in the community\'s pocket, because they took care of their forest.',
    stat: '1,581',
    statLabel: 'credits minted so far',
    view: { center: [-122.4, 37.8], zoom: 11, pitch: 40, bearing: -15 },
    cta: { label: 'VIEW TOKENS', href: 'https://hashscan.io/testnet/token/0.0.8312399' },
  },
  {
    id: 'satellite',
    index: 6,
    label: 'CHAPTER 06',
    subtitle: 'EYES IN THE SKY',
    title: 'The Satellite',
    body: 'You can\'t fake a satellite image. NASA spots active fires within hours. The European Space Agency\'s Sentinel-2 can see exactly where vegetation was cleared, down to 10 meters. We cross-check every treatment report against what the satellites actually show. If the crew says they cleared 120 acres, we can verify it from space.',
    stat: '10m',
    statLabel: 'resolution — that\'s one parking space',
    view: { center: [-119.5, 36.5], zoom: 7, pitch: 50, bearing: 0 },
    cta: { label: 'SATELLITE PORTAL', href: '/hestia/satellite' },
  },
  {
    id: 'portals',
    index: 7,
    label: 'CHAPTER 07',
    subtitle: 'PICK YOUR ROLE',
    title: 'Step In',
    body: 'Everything you just read is live — real data, real blockchain transactions, real satellite feeds. Pick a role and see it for yourself.',
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
