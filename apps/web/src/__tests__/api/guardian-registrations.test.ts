import { describe, it, expect, vi } from 'vitest';

// Mock the api module
vi.mock('@/lib/api', () => ({
  fetchRegistrations: vi.fn(),
}));

import { GET } from '@/app/api/guardian/registrations/route';
import { fetchRegistrations } from '@/lib/api';
import { createFacility } from '../mocks/factories';

const mockedFetchRegistrations = vi.mocked(fetchRegistrations);

describe('GET /api/guardian/registrations', () => {
  it('returns registrations on success', async () => {
    const facility = createFacility();
    mockedFetchRegistrations.mockResolvedValue([facility]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].facilityId).toBe('GPI-UP-001');
  });

  it('returns empty array on success with no data', async () => {
    mockedFetchRegistrations.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns 502 on failure', async () => {
    mockedFetchRegistrations.mockRejectedValue(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual([]);
  });

  it('returns multiple registrations', async () => {
    const facilities = [createFacility({ facilityId: 'F1' }), createFacility({ facilityId: 'F2' })];
    mockedFetchRegistrations.mockResolvedValue(facilities);

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(2);
  });

  it('calls fetchRegistrations', async () => {
    mockedFetchRegistrations.mockResolvedValue([]);
    await GET();
    expect(mockedFetchRegistrations).toHaveBeenCalled();
  });

  it('returns JSON content type', async () => {
    mockedFetchRegistrations.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
