export interface ChapterView {
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface Chapter {
  id: string;
  index: number;
  label: string;      // "CHAPTER 01"
  subtitle: string;   // uppercase tracking label
  title: string;      // large display heading
  body: string;       // 2-3 sentence description
  stat: string;       // large number
  statLabel: string;  // what the number means
  view: ChapterView;
  cta?: { label: string; href: string };
}

export const HERO_VIEW: ChapterView = {
  center: [78.9629, 22.5937],
  zoom: 3,
  pitch: 0,
  bearing: 0,
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'problem',
    index: 1,
    label: 'CHAPTER 01',
    subtitle: '4,433 GROSSLY POLLUTING INDUSTRIES',
    title: 'The Problem',
    body: 'India\'s most sacred river receives untreated industrial effluent from 4,433 factories across 10 states. A 2024 CEEW study found zero states meeting the 85% data availability mandate. Sensor data has no legal admissibility. The trust deficit is systemic.',
    stat: '4,433',
    statLabel: 'GPIs on the Ganga',
    view: { center: [81.5, 25.5], zoom: 6, pitch: 30, bearing: -10 },
    cta: { label: 'VIEW FACILITIES', href: '/regulator' },
  },
  {
    id: 'sensors',
    index: 2,
    label: 'CHAPTER 02',
    subtitle: 'HARDWARE-SIGNED OCEMS DATA',
    title: 'The Sensors',
    body: 'Every sensor reading is signed by an AWS CloudHSM hardware security module using ECDSA secp256k1. The private key never leaves the HSM — not even AWS can extract it. Each reading carries cryptographic proof of origin.',
    stat: '500+',
    statLabel: 'KMS-signed readings',
    view: { center: [80.33, 26.45], zoom: 13, pitch: 45, bearing: 20 },
    cta: { label: 'EXPLORE TRUST CHAIN', href: '/verifier' },
  },
  {
    id: 'blockchain',
    index: 3,
    label: 'CHAPTER 03',
    subtitle: 'HEDERA GUARDIAN VERIFIABLE CREDENTIALS',
    title: 'The Blockchain',
    body: 'Each sensor reading becomes a Verifiable Credential stored on Hedera Guardian. Every credential is anchored to the Hedera Consensus Service — immutable, auditable, and legally defensible under the Indian Evidence Act.',
    stat: '1,000+',
    statLabel: 'Verifiable Credentials',
    view: { center: [83.01, 25.32], zoom: 12, pitch: 40, bearing: -15 },
    cta: { label: 'VERIFY ON HASHSCAN', href: 'https://hashscan.io/testnet/topic/0.0.8285613' },
  },
  {
    id: 'evaluation',
    index: 4,
    label: 'CHAPTER 04',
    subtitle: 'CPCB SCHEDULE-VI COMPLIANCE',
    title: 'The Evaluation',
    body: 'Automated evaluation against 9 CPCB discharge parameters — pH, BOD, COD, TSS, temperature, total chromium, hexavalent chromium, oil & grease, and ammoniacal nitrogen. Every reading scored in real-time against regulatory thresholds.',
    stat: '9',
    statLabel: 'parameters monitored',
    view: { center: [81.85, 25.43], zoom: 11, pitch: 35, bearing: 10 },
    cta: { label: 'VIEW COMPLIANCE', href: '/regulator' },
  },
  {
    id: 'tokens',
    index: 5,
    label: 'CHAPTER 05',
    subtitle: 'GGCC CREDITS & ZVIOL RECORDS',
    title: 'The Tokens',
    body: 'Compliant facilities earn Green Ganga Compliance Credits (GGCC) — fungible HTS tokens representing verified environmental performance. Violators receive ZVIOL NFTs — immutable violation records. Every mint is verifiable on HashScan.',
    stat: '300+',
    statLabel: 'GGCC tokens minted',
    view: { center: [78.16, 29.95], zoom: 12, pitch: 40, bearing: -20 },
    cta: { label: 'TOKEN ANALYTICS', href: '/facility' },
  },
  {
    id: 'satellite',
    index: 6,
    label: 'CHAPTER 06',
    subtitle: 'SENTINEL-2 CROSS-VALIDATION',
    title: 'The Satellite',
    body: 'ESA Copernicus Sentinel-2 Level-2A imagery independently verifies sensor data. The Se2WaQ turbidity algorithm cross-validates OCEMS TSS readings against satellite-derived turbidity — no single source of truth, multiple independent confirmations.',
    stat: '10m',
    statLabel: 'spatial resolution',
    view: { center: [80.5, 26.0], zoom: 8, pitch: 50, bearing: 0 },
    cta: { label: 'SATELLITE VIEW', href: '/verifier' },
  },
  {
    id: 'dashboard',
    index: 7,
    label: 'CHAPTER 07',
    subtitle: 'CHOOSE YOUR PERSPECTIVE',
    title: 'The Dashboard',
    body: 'Four stakeholder portals, each designed for a different role in the compliance ecosystem. Real data, real blockchain records, real satellite imagery. No mocks.',
    stat: '4',
    statLabel: 'stakeholder portals',
    view: { center: [78.9629, 22.5937], zoom: 5, pitch: 0, bearing: 0 },
  },
];

export const PARTNERS = [
  { name: 'Hedera', url: 'https://hedera.com' },
  { name: 'Guardian', url: 'https://guardian.hedera.com' },
  { name: 'AWS', url: 'https://aws.amazon.com/kms/' },
  { name: 'ESA Copernicus', url: 'https://www.copernicus.eu' },
  { name: 'CPCB', url: 'https://cpcb.nic.in' },
];
