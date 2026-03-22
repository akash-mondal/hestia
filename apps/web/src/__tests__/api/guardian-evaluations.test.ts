import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  fetchEvaluations: vi.fn(),
}));

import { GET } from '@/app/api/guardian/evaluations/route';
import { fetchEvaluations } from '@/lib/api';
import { createEvaluation } from '../mocks/factories';

const mockedFetchEvaluations = vi.mocked(fetchEvaluations);

describe('GET /api/guardian/evaluations', () => {
  it('returns evaluations on success', async () => {
    mockedFetchEvaluations.mockResolvedValue([createEvaluation()]);
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].overallCompliant).toBe(true);
  });

  it('returns empty array on success with no data', async () => {
    mockedFetchEvaluations.mockResolvedValue([]);
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('returns 502 on failure', async () => {
    mockedFetchEvaluations.mockRejectedValue(new Error('fail'));
    const response = await GET();
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('returns multiple evaluations', async () => {
    mockedFetchEvaluations.mockResolvedValue([createEvaluation(), createEvaluation({ evaluationId: 'e2' })]);
    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(2);
  });

  it('calls fetchEvaluations', async () => {
    mockedFetchEvaluations.mockResolvedValue([]);
    await GET();
    expect(mockedFetchEvaluations).toHaveBeenCalled();
  });

  it('returns JSON content type', async () => {
    mockedFetchEvaluations.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
