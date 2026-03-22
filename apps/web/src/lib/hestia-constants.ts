import type { HestiaRole } from '@/types/hestia';

// ── Guardian ──
export const HESTIA_GUARDIAN_URL = process.env.HESTIA_GUARDIAN_URL || 'http://165.22.212.120:3000/api/v1';
export const HESTIA_POLICY_ID = '69be7aa85056e1c7a8d8fea8';

// ── Hedera ──
export const WRC_TOKEN_ID = '0.0.8312399';
export const CERT_TOKEN_ID = '0.0.8312401';
export const POLICY_TOPIC_ID = '0.0.8317417';
export const INSTANCE_TOPIC_ID = '0.0.8317430';
export const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com/api/v1';
export const HASHSCAN_BASE = 'https://hashscan.io/testnet';

// ── Smart Contracts ──
export const RISK_ORACLE_ADDRESS = '0x7FdC9d74419b60e5126585B586FFfba57a8934A3';
export const INSURANCE_CALC_ADDRESS = '0x751f5fD84e0eefc800a94734A386eAcEb9B745a9';
export const HEDERA_JSON_RPC_URL = 'https://testnet.hedera.validationcloud.io/v1/ngp2e4S5nlu_OjOjZSJZ0iu5sfVfnNrBAm6Xtcq03eY';

// ── Satellite API ──
export const FIRE_SATELLITE_API_URL = process.env.FIRE_SATELLITE_API_URL || 'http://localhost:8001';

// ── Guardian Tag Names (from policy block tree) ──
export const TAGS = {
  SITE_FORM: 'site_registration_form',
  PLAN_FORM: 'treatment_plan_form',
  REPORT_FORM: 'treatment_report_form',
  RISK_INTAKE: 'risk_assessment_intake',
  VALIDATION_INTAKE: 'satellite_validation_intake',
  INSURANCE_INTAKE: 'insurance_impact_intake',
  PENDING_SITES: 'pending_sites_grid',
  PENDING_PLANS: 'pending_plans_grid',
  APPROVE_SITE: 'approve_site_btn',
  REJECT_SITE: 'reject_site_btn',
  APPROVE_PLAN: 'approve_plan_btn',
  REJECT_PLAN: 'reject_plan_btn',
  RISK_GRID: 'risk_assessments_grid',
  REPORTS_GRID: 'treatment_reports_grid',
  MONITOR_GRID: 'satellite_monitor_grid',
  MY_SITES: 'my_sites_grid',
  INSURANCE_GRID: 'insurance_impact_grid',
} as const;

// ── User Credentials per Role ──
export const HESTIA_USERS: Record<HestiaRole, { username: string; password: string }> = {
  'land-manager': { username: 'fresh_land', password: 'Test@12345' },
  'operator':     { username: 'fresh_oper', password: 'Test@12345' },
  'verifier':     { username: 'fresh_veri', password: 'Test@12345' },
  'satellite':    { username: 'fresh_sate', password: 'Test@12345' },
};

// ── Admin (Standard Registry) ──
export const HESTIA_ADMIN = { username: 'akash', password: 'Akash@17327' };

// ── Risk Score Tiers ──
export const RISK_TIERS = [
  { max: 25, label: 'Low', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  { max: 50, label: 'Moderate', color: '#D97706', bg: 'rgba(217, 119, 6, 0.1)' },
  { max: 75, label: 'High', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)' },
  { max: 100, label: 'Extreme', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.1)' },
] as const;

export function getRiskTier(score: number) {
  return RISK_TIERS.find(t => score <= t.max) || RISK_TIERS[3];
}

// ── Insurance Discount Tiers ──
export const DISCOUNT_TIERS = [
  { name: 'None', minWrc: 0, discount: 0 },
  { name: 'Bronze', minWrc: 10, discount: 10 },
  { name: 'Silver', minWrc: 25, discount: 25 },
  { name: 'Gold', minWrc: 50, discount: 39 },
  { name: 'Platinum', minWrc: 100, discount: 50 },
] as const;

// ── Risk Component Labels ──
export const RISK_COMPONENTS = [
  { key: 'fuel', label: 'Fuel Load', max: 25, description: 'LANDFIRE FBFM40' },
  { key: 'slope', label: 'Slope', max: 15, description: 'Terrain gradient' },
  { key: 'wui', label: 'WUI Proximity', max: 20, description: 'Structures/acre' },
  { key: 'access', label: 'Access', max: 10, description: 'Firefighter access' },
  { key: 'historical', label: 'Fire History', max: 10, description: 'MTBS 20yr' },
  { key: 'weather', label: 'Weather', max: 20, description: 'NOAA/RAWS' },
] as const;

// ── Portal Nav Items ──
export const HESTIA_NAV_ITEMS = [
  { label: 'Land Manager', href: '/hestia/land-manager', icon: 'MapPin' as const },
  { label: 'Operator', href: '/hestia/operator', icon: 'Shovel' as const },
  { label: 'Verifier', href: '/hestia/verifier', icon: 'ShieldCheck' as const },
  { label: 'Satellite', href: '/hestia/satellite', icon: 'Satellite' as const },
] as const;

// ── Role → data-role mapping ──
export const ROLE_DATA_ATTR: Record<string, string> = {
  '/hestia/land-manager': 'hestia-land',
  '/hestia/operator': 'hestia-oper',
  '/hestia/verifier': 'hestia-veri',
  '/hestia/satellite': 'hestia-sate',
};

// ── Role → display name ──
export const ROLE_TITLES: Record<string, string> = {
  '/hestia/land-manager': 'Land Manager Portal',
  '/hestia/operator': 'Operator Portal',
  '/hestia/verifier': 'Verifier Portal',
  '/hestia/satellite': 'Satellite Portal',
};
