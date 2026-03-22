import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// We need to test the route handler which uses fetch internally
describe('GET /api/mirror', () => {
  let GET: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/mirror/route');
    GET = mod.GET;
  });

  function makeRequest(path?: string) {
    const url = path
      ? `http://localhost:3000/api/mirror?path=${encodeURIComponent(path)}`
      : 'http://localhost:3000/api/mirror';
    return new NextRequest(url);
  }

  it('returns 400 when path is missing', async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing path parameter');
  });

  it('proxies mirror node request on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tokens: [] }),
    });

    const response = await GET(makeRequest('/tokens/0.0.123'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ tokens: [] });
  });

  it('returns error status when mirror node fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const response = await GET(makeRequest('/tokens/0.0.999'));
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('Mirror Node returned 404');
  });

  it('returns 502 when mirror node is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET(makeRequest('/tokens/0.0.123'));
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toBe('Mirror Node unreachable');
  });

  it('passes correct URL to mirror node', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await GET(makeRequest('/tokens/0.0.123'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tokens/0.0.123'),
      expect.any(Object)
    );
  });

  it('sends Accept header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await GET(makeRequest('/tokens/0.0.123'));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('returns JSON content type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const response = await GET(makeRequest('/tokens/0.0.123'));
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('handles topic messages path', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    const response = await GET(makeRequest('/topics/0.0.789/messages'));
    const data = await response.json();
    expect(data).toEqual({ messages: [] });
  });
});
