// Server-side API helpers for Hestia Guardian, Mirror Node, and Smart Contracts

import {
  HESTIA_GUARDIAN_URL, HESTIA_POLICY_ID, HESTIA_USERS, HESTIA_ADMIN,
  MIRROR_NODE_URL, TAGS, WRC_TOKEN_ID, INSTANCE_TOPIC_ID,
} from './hestia-constants';
import type {
  HestiaRole, SiteRegistration, TreatmentPlan, TreatmentReport,
  RiskAssessment, InsuranceImpact, SatelliteValidation,
  SITE_FIELDS, PLAN_FIELDS, REPORT_FIELDS, RISK_FIELDS, INSURANCE_FIELDS, VALIDATION_FIELDS,
} from '@/types/hestia';

// ── Guardian Auth (per-role token cache) ──

const tokenCache: Record<string, { accessToken: string; expiresAt: number }> = {};

export async function getHestiaToken(role?: HestiaRole): Promise<string> {
  const cacheKey = role || '_admin';
  const cached = tokenCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  const creds = role ? HESTIA_USERS[role] : HESTIA_ADMIN;

  const loginRes = await fetch(`${HESTIA_GUARDIAN_URL}/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  if (!loginRes.ok) throw new Error(`Hestia login failed (${creds.username}): ${loginRes.status}`);
  const { refreshToken } = await loginRes.json();

  const tokenRes = await fetch(`${HESTIA_GUARDIAN_URL}/accounts/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (tokenRes.status !== 200 && tokenRes.status !== 201) throw new Error(`Hestia access-token failed: ${tokenRes.status}`);
  const { accessToken } = await tokenRes.json();

  tokenCache[cacheKey] = { accessToken, expiresAt: Date.now() + 25 * 60 * 1000 };
  return accessToken;
}

// ── Guardian Tag Fetch ──

export async function fetchHestiaTag(tagName: string, role?: HestiaRole): Promise<unknown[]> {
  const token = await getHestiaToken(role);
  const res = await fetch(`${HESTIA_GUARDIAN_URL}/policies/${HESTIA_POLICY_ID}/tag/${tagName}/blocks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Hestia tag ${tagName} fetch failed: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ── Guardian Tag Submit (NEW — Zeno never writes) ──

export async function submitToTag(tagName: string, document: Record<string, unknown>, role: HestiaRole): Promise<{ ok: boolean; status: number }> {
  const token = await getHestiaToken(role);
  const res = await fetch(`${HESTIA_GUARDIAN_URL}/policies/${HESTIA_POLICY_ID}/tag/${tagName}/blocks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ document, ref: null }),
  });
  return { ok: res.ok, status: res.status };
}

// ── Guardian Approve/Reject (NEW) ──

export async function approveDocument(buttonTag: string, documentId: string, dialogResult: string = 'Approved'): Promise<{ ok: boolean; status: number }> {
  const token = await getHestiaToken('verifier');
  const res = await fetch(`${HESTIA_GUARDIAN_URL}/policies/${HESTIA_POLICY_ID}/tag/${buttonTag}/blocks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, dialogResult }),
  });
  return { ok: res.ok, status: res.status };
}

// ── VC Extraction ──

function extractCredentialSubject(doc: Record<string, unknown>): Record<string, unknown> {
  const document = doc.document as Record<string, unknown> | undefined;
  if (!document) return doc;
  const cs = document.credentialSubject;
  if (Array.isArray(cs)) return cs[0] as Record<string, unknown>;
  if (cs && typeof cs === 'object') return cs as Record<string, unknown>;
  return doc;
}

function mapFields<T>(doc: Record<string, unknown>, fields: readonly string[]): T {
  const cs = extractCredentialSubject(doc);
  const result: Record<string, unknown> = {};
  fields.forEach((name, i) => {
    result[name] = cs[`field${i}`] ?? '';
  });
  return result as T;
}

// ── Typed Fetchers ──

export async function fetchSites(role?: HestiaRole): Promise<{ sites: SiteRegistration[]; raw: unknown[] }> {
  const raw = await fetchHestiaTag(TAGS.PENDING_SITES, role || 'verifier');
  const sites = raw.map(doc => mapFields<SiteRegistration>(doc as Record<string, unknown>,
    ['siteId', 'siteName', 'ownerEntity', 'state', 'county', 'gpsLatitude', 'gpsLongitude', 'totalAcres', 'wuiStructures', 'vegetationType', 'currentFireRiskScore', 'insurerName', 'annualPremium', 'hederaAccountId']
  ));
  return { sites, raw };
}

export async function fetchPlans(role?: HestiaRole): Promise<{ plans: TreatmentPlan[]; raw: unknown[] }> {
  const raw = await fetchHestiaTag(TAGS.PENDING_PLANS, role || 'verifier');
  const plans = raw.map(doc => mapFields<TreatmentPlan>(doc as Record<string, unknown>,
    ['planId', 'siteId', 'treatmentType', 'plannedAcres', 'plannedStartDate', 'plannedEndDate', 'fuelLoadPreTreatment', 'crewCertification', 'burnPermitNumber', 'environmentalClearance']
  ));
  return { plans, raw };
}

export async function fetchReports(role?: HestiaRole): Promise<TreatmentReport[]> {
  const raw = await fetchHestiaTag(TAGS.REPORTS_GRID, role || 'verifier');
  return raw.map(doc => mapFields<TreatmentReport>(doc as Record<string, unknown>,
    ['reportId', 'planId', 'siteId', 'actualStartDate', 'actualEndDate', 'treatedAcres', 'fuelLoadPostTreatment', 'fuelReductionPercent', 'containmentVerified', 'groundTempReadings', 'photoDocHash', 'crewLeadName']
  ));
}

export async function fetchAssessments(role?: HestiaRole): Promise<RiskAssessment[]> {
  const raw = await fetchHestiaTag(TAGS.RISK_GRID, role || 'verifier');
  return raw.map(doc => mapFields<RiskAssessment>(doc as Record<string, unknown>,
    ['assessmentId', 'siteId', 'assessedAt', 'preFireRiskScore', 'postFireRiskScore', 'riskReductionPercent', 'ndviPreTreatment', 'ndviPostTreatment', 'nbrDelta', 'firmsHotspotCount', 'weatherRiskFactor', 'slopeRiskFactor', 'wuiDensityFactor', 'verifiedAcres', 'dataSourcesUsed', 'sentinelTileDate', 'overallCompliant', 'tokenAction']
  ));
}

export async function fetchInsurance(role?: HestiaRole): Promise<InsuranceImpact[]> {
  const raw = await fetchHestiaTag(TAGS.INSURANCE_GRID, role || 'verifier');
  return raw.map(doc => mapFields<InsuranceImpact>(doc as Record<string, unknown>,
    ['impactId', 'siteId', 'assessedAt', 'preRiskScore', 'postRiskScore', 'premiumReductionPercent', 'estimatedAnnualSavings', 'parametricTriggerThreshold', 'parametricMaxPayout', 'seeaStockClassification', 'seeaFlowType', 'seeaMonetaryValue']
  ));
}

export async function fetchValidations(role?: HestiaRole): Promise<SatelliteValidation[]> {
  const raw = await fetchHestiaTag(TAGS.MONITOR_GRID, role || 'satellite');
  return raw.map(doc => mapFields<SatelliteValidation>(doc as Record<string, unknown>,
    ['validationId', 'siteId', 'sentinelTileDate', 'ndviValue', 'nbrValue', 'firmsDetections', 'landcoverClass', 'correlationScore']
  ));
}

// ── Mirror Node ──

export async function fetchMirrorNode(path: string): Promise<unknown> {
  const res = await fetch(`${MIRROR_NODE_URL}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchWrcSupply(): Promise<number> {
  const data = await fetchMirrorNode(`/tokens/${WRC_TOKEN_ID}`) as Record<string, unknown> | null;
  return data ? Number(data.total_supply ?? 0) : 0;
}

export async function fetchHcsMessageCount(): Promise<number> {
  const data = await fetchMirrorNode(`/topics/${INSTANCE_TOPIC_ID}/messages?limit=1`) as Record<string, unknown> | null;
  if (!data) return 0;
  const msgs = (data as { messages?: unknown[] }).messages;
  return msgs?.[0] ? Number((msgs[0] as Record<string, unknown>).sequence_number ?? 0) : 0;
}

// ── Document ID extraction (for approval buttons) ──

export function getDocumentId(rawDoc: unknown): string {
  const doc = rawDoc as Record<string, unknown>;
  return String(doc._id ?? doc.id ?? '');
}
