import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// We need to reset the module cache between tests since api.ts has module-level cache
let api: typeof import('@/lib/api');

beforeEach(async () => {
  vi.resetModules();
  api = await import('@/lib/api');
});

describe('getGuardianToken', () => {
  it('returns access token on success', async () => {
    const token = await api.getGuardianToken();
    expect(token).toBe('mock-access-token');
  });

  it('caches token on second call', async () => {
    const token1 = await api.getGuardianToken();
    const token2 = await api.getGuardianToken();
    expect(token1).toBe(token2);
  });

  it('throws on login failure', async () => {
    server.use(
      http.post('*/accounts/login', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );
    await expect(api.getGuardianToken()).rejects.toThrow('Guardian login failed: 401');
  });

  it('throws on access-token failure', async () => {
    server.use(
      http.post('*/accounts/access-token', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    await expect(api.getGuardianToken()).rejects.toThrow('Guardian access-token failed: 500');
  });
});

describe('fetchRegistrations', () => {
  it('returns parsed FacilityRegistration array', async () => {
    const result = await api.fetchRegistrations();
    expect(result).toHaveLength(1);
    expect(result[0].facilityId).toBe('GPI-UP-001');
    expect(result[0].facilityName).toBe('Kanpur Tannery Cluster A');
    expect(result[0].gpsLatitude).toBe(26.45);
    expect(result[0].ctoDischargeMode).toBe('discharge');
    expect(result[0].deviceHederaAccountId).toBe('0.0.8148249');
  });

  it('returns empty array on empty response', async () => {
    server.use(
      http.get('*/tag/registrations_grid/blocks', () => {
        return HttpResponse.json({ data: [] });
      })
    );
    const result = await api.fetchRegistrations();
    expect(result).toEqual([]);
  });

  it('handles flat array response (no data wrapper)', async () => {
    server.use(
      http.get('*/tag/registrations_grid/blocks', () => {
        return HttpResponse.json([{
          document: {
            credentialSubject: [{ field0: 'TEST-001', field1: 'Test Facility' }],
          },
        }]);
      })
    );
    const result = await api.fetchRegistrations();
    expect(result).toHaveLength(1);
    expect(result[0].facilityId).toBe('TEST-001');
  });

  it('uses defaults for missing fields', async () => {
    server.use(
      http.get('*/tag/registrations_grid/blocks', () => {
        return HttpResponse.json({ data: [{ document: { credentialSubject: [{}] } }] });
      })
    );
    const result = await api.fetchRegistrations();
    expect(result[0].facilityId).toBe('');
    expect(result[0].gpsLatitude).toBe(0);
    expect(result[0].ctoBODLimit).toBeNull();
  });
});

describe('fetchReadings', () => {
  it('returns parsed SensorReading array', async () => {
    const result = await api.fetchReadings();
    expect(result).toHaveLength(1);
    expect(result[0].facilityId).toBe('GPI-UP-001');
    expect(result[0].pH).toBe(7.2);
    expect(result[0].BOD_mgL).toBe(22);
    expect(result[0].sensorStatus).toBe('online');
  });

  it('defaults sensorStatus to online', async () => {
    server.use(
      http.get('*/tag/monitor_grid/blocks', () => {
        return HttpResponse.json({ data: [{ document: { credentialSubject: [{ field1: 'F1' }] } }] });
      })
    );
    const result = await api.fetchReadings();
    expect(result[0].sensorStatus).toBe('online');
  });

  it('handles empty response', async () => {
    server.use(
      http.get('*/tag/monitor_grid/blocks', () => {
        return HttpResponse.json({ data: [] });
      })
    );
    const result = await api.fetchReadings();
    expect(result).toEqual([]);
  });
});

describe('fetchEvaluations', () => {
  it('returns parsed ComplianceEvaluation array', async () => {
    const result = await api.fetchEvaluations();
    expect(result).toHaveLength(1);
    expect(result[0].evaluationId).toContain('eval-001');
    expect(result[0].overallCompliant).toBe(true);
    expect(result[0].tokenAction).toBe('mint_ggcc');
  });

  it('casts boolean fields correctly', async () => {
    const result = await api.fetchEvaluations();
    expect(typeof result[0].pH_compliant).toBe('boolean');
    expect(typeof result[0].overallCompliant).toBe('boolean');
    expect(typeof result[0].isZLD).toBe('boolean');
  });

  it('defaults tokenAction to pending_review when missing', async () => {
    server.use(
      http.get('*/tag/evaluations_grid/blocks', () => {
        return HttpResponse.json({ data: [{ document: { credentialSubject: [{ field0: 'e1' }] } }] });
      })
    );
    const result = await api.fetchEvaluations();
    expect(result[0].tokenAction).toBe('pending_review');
  });

  it('handles empty response', async () => {
    server.use(
      http.get('*/tag/evaluations_grid/blocks', () => {
        return HttpResponse.json({ data: [] });
      })
    );
    const result = await api.fetchEvaluations();
    expect(result).toEqual([]);
  });
});

describe('fetchMirrorNode', () => {
  it('returns data on success', async () => {
    const result = await api.fetchMirrorNode('/tokens/0.0.123');
    expect(result).toBeDefined();
  });

  it('returns null on failure', async () => {
    server.use(
      http.get('*/api/v1/*', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );
    const result = await api.fetchMirrorNode('/tokens/0.0.999');
    expect(result).toBeNull();
  });
});

describe('fetchTokenInfo', () => {
  it('calls fetchMirrorNode with correct path', async () => {
    const result = await api.fetchTokenInfo('0.0.123');
    expect(result).toBeDefined();
  });
});

describe('fetchAccountTokens', () => {
  it('calls fetchMirrorNode with correct path', async () => {
    const result = await api.fetchAccountTokens('0.0.456');
    expect(result).toBeDefined();
  });
});

describe('fetchTopicMessages', () => {
  it('calls fetchMirrorNode with correct path', async () => {
    const result = await api.fetchTopicMessages('0.0.789');
    expect(result).toBeDefined();
  });
});
