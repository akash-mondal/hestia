// Server-side API helpers for fetching from Guardian, Mirror Node, and Satellite

import { GUARDIAN_URL, GUARDIAN_USERNAME, GUARDIAN_PASSWORD, POLICY_ID, MIRROR_NODE_URL } from './constants';
import type { FacilityRegistration, SensorReading, ComplianceEvaluation } from '@/types';

// ── Guardian Auth (cached per request lifecycle) ──

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getGuardianToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  // Step 1: Login → refreshToken
  const loginRes = await fetch(`${GUARDIAN_URL}/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: GUARDIAN_USERNAME, password: GUARDIAN_PASSWORD }),
  });

  if (!loginRes.ok) {
    throw new Error(`Guardian login failed: ${loginRes.status}`);
  }

  const { refreshToken } = await loginRes.json();

  // Step 2: refreshToken → accessToken
  const tokenRes = await fetch(`${GUARDIAN_URL}/accounts/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Guardian access-token failed: ${tokenRes.status}`);
  }

  const { accessToken } = await tokenRes.json();
  cachedToken = { accessToken, expiresAt: Date.now() + 25 * 60 * 1000 }; // 25min cache
  return accessToken;
}

// ── Guardian Tag Data ──

async function fetchGuardianTag(tagName: string): Promise<unknown[]> {
  const token = await getGuardianToken();
  const res = await fetch(`${GUARDIAN_URL}/policies/${POLICY_ID}/tag/${tagName}/blocks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`Guardian tag ${tagName} fetch failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  // Guardian returns { data: [...] } or [...] depending on block type
  return Array.isArray(data) ? data : (data?.data ?? []);
}

function extractCredentialSubject(doc: Record<string, unknown>): Record<string, unknown> {
  const document = doc.document as Record<string, unknown> | undefined;
  if (!document) return doc;
  const cs = document.credentialSubject;
  if (Array.isArray(cs)) return cs[0] as Record<string, unknown>;
  if (cs && typeof cs === 'object') return cs as Record<string, unknown>;
  return doc;
}

export async function fetchRegistrations(): Promise<FacilityRegistration[]> {
  const raw = await fetchGuardianTag('registrations_grid');
  return raw.map((doc) => {
    const cs = extractCredentialSubject(doc as Record<string, unknown>);
    return {
      facilityId: String(cs.field0 ?? ''),
      facilityName: String(cs.field1 ?? ''),
      industryCategory: String(cs.field2 ?? ''),
      state: String(cs.field3 ?? ''),
      district: String(cs.field4 ?? ''),
      gpsLatitude: Number(cs.field5 ?? 0),
      gpsLongitude: Number(cs.field6 ?? 0),
      ocemsSensorModel: String(cs.field7 ?? ''),
      analyzerSerialNumber: String(cs.field8 ?? ''),
      ctoNumber: String(cs.field9 ?? ''),
      ctoValidUntil: String(cs.field10 ?? ''),
      ctoDischargeMode: (cs.field11 as 'discharge' | 'ZLD') ?? 'discharge',
      ctoBODLimit: cs.field12 ? Number(cs.field12) : null,
      ctoCODLimit: cs.field13 ? Number(cs.field13) : null,
      ctoTSSLimit: cs.field14 ? Number(cs.field14) : null,
      deviceKmsKeyId: String(cs.field15 ?? ''),
      deviceHederaAccountId: String(cs.field16 ?? ''),
    };
  });
}

export async function fetchReadings(): Promise<SensorReading[]> {
  const raw = await fetchGuardianTag('monitor_grid');
  return raw.map((doc) => {
    const cs = extractCredentialSubject(doc as Record<string, unknown>);
    return {
      timestamp: String(cs.field0 ?? ''),
      facilityId: String(cs.field1 ?? ''),
      pH: Number(cs.field2 ?? 0),
      BOD_mgL: Number(cs.field3 ?? 0),
      COD_mgL: Number(cs.field4 ?? 0),
      TSS_mgL: Number(cs.field5 ?? 0),
      temperature_C: Number(cs.field6 ?? 0),
      totalChromium_mgL: Number(cs.field7 ?? 0),
      hexChromium_mgL: Number(cs.field8 ?? 0),
      oilAndGrease_mgL: Number(cs.field9 ?? 0),
      ammoniacalN_mgL: Number(cs.field10 ?? 0),
      dissolvedOxygen_mgL: Number(cs.field11 ?? 0),
      flow_KLD: Number(cs.field12 ?? 0),
      sensorStatus: String(cs.field13 ?? 'online'),
      kmsKeyId: String(cs.field14 ?? ''),
      kmsSigHash: String(cs.field15 ?? ''),
    };
  });
}

export async function fetchEvaluations(): Promise<ComplianceEvaluation[]> {
  const raw = await fetchGuardianTag('evaluations_grid');
  return raw.map((doc) => {
    const cs = extractCredentialSubject(doc as Record<string, unknown>);
    return {
      evaluationId: String(cs.field0 ?? ''),
      facilityId: String(cs.field1 ?? ''),
      evaluatedAt: String(cs.field2 ?? ''),
      limitsSource: String(cs.field3 ?? 'schedule_vi'),
      isZLD: Boolean(cs.field4),
      pH_compliant: Boolean(cs.field5),
      pH_value: Number(cs.field6 ?? 0),
      BOD_compliant: Boolean(cs.field7),
      BOD_value: Number(cs.field8 ?? 0),
      COD_compliant: Boolean(cs.field9),
      COD_value: Number(cs.field10 ?? 0),
      TSS_compliant: Boolean(cs.field11),
      TSS_value: Number(cs.field12 ?? 0),
      temp_compliant: Boolean(cs.field13),
      temp_value: Number(cs.field14 ?? 0),
      chromium_compliant: Boolean(cs.field15),
      chromium_value: Number(cs.field16 ?? 0),
      overallCompliant: Boolean(cs.field17),
      violationCount: Number(cs.field18 ?? 0),
      criticalViolationCount: Number(cs.field19 ?? 0),
      tokenAction: (cs.field20 as ComplianceEvaluation['tokenAction']) ?? 'pending_review',
    };
  });
}

// ── Mirror Node ──

export async function fetchMirrorNode(path: string): Promise<unknown> {
  const res = await fetch(`${MIRROR_NODE_URL}${path}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    console.error(`Mirror Node ${path} failed: ${res.status}`);
    return null;
  }
  return res.json();
}

export async function fetchTokenInfo(tokenId: string): Promise<unknown> {
  return fetchMirrorNode(`/tokens/${tokenId}`);
}

export async function fetchAccountTokens(accountId: string): Promise<unknown> {
  return fetchMirrorNode(`/accounts/${accountId}/tokens`);
}

export async function fetchTopicMessages(topicId: string, limit = 100): Promise<unknown> {
  return fetchMirrorNode(`/topics/${topicId}/messages?limit=${limit}&order=desc`);
}
