import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  fetchReadings: vi.fn(),
}));

import { GET } from '@/app/api/guardian/readings/route';
import { fetchReadings } from '@/lib/api';
import { createReading } from '../mocks/factories';

const mockedFetchReadings = vi.mocked(fetchReadings);

describe('GET /api/guardian/readings', () => {
  it('returns readings on success', async () => {
    mockedFetchReadings.mockResolvedValue([createReading()]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].facilityId).toBe('GPI-UP-001');
  });

  it('returns empty array on success with no data', async () => {
    mockedFetchReadings.mockResolvedValue([]);
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('returns 502 on failure', async () => {
    mockedFetchReadings.mockRejectedValue(new Error('fail'));
    const response = await GET();
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('returns multiple readings', async () => {
    const readings = [createReading(), createReading({ facilityId: 'F2' })];
    mockedFetchReadings.mockResolvedValue(readings);
    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(2);
  });

  it('calls fetchReadings', async () => {
    mockedFetchReadings.mockResolvedValue([]);
    await GET();
    expect(mockedFetchReadings).toHaveBeenCalled();
  });

  it('returns JSON content type', async () => {
    mockedFetchReadings.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
