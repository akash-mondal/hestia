import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('GET /api/satellite', () => {
  let GET: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/satellite/route');
    GET = mod.GET;
  });

  function makeRequest(params?: Record<string, string>) {
    const url = new URL('http://localhost:3000/api/satellite');
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    return new NextRequest(url);
  }

  it('calls health endpoint by default', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
  });

  it('proxies validate action', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'validated' }),
    });

    const response = await GET(makeRequest({ action: 'validate', facility_id: 'F1', ocems_tss_mg_l: '65' }));
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/validate?'), expect.any(Object));
  });

  it('proxies water-quality action', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ turbidity: 10 }),
    });

    const response = await GET(makeRequest({ action: 'water-quality', lat: '26.45', lon: '80.33' }));
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/water-quality?'), expect.any(Object));
  });

  it('returns satellite API error status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const response = await GET(makeRequest({ action: 'validate', facility_id: 'F1', ocems_tss_mg_l: '65' }));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Satellite API returned 500');
  });

  it('returns 502 when satellite API is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toBe('Satellite API unreachable');
    expect(data.status).toBe('unavailable');
  });

  it('returns JSON content type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    const response = await GET(makeRequest());
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('passes Accept header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await GET(makeRequest());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('includes facility_id in validate URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await GET(makeRequest({ action: 'validate', facility_id: 'GPI-UP-001', ocems_tss_mg_l: '65' }));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('facility_id=GPI-UP-001'), expect.any(Object));
  });
});
