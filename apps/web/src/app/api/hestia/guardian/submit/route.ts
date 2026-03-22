import { NextResponse } from 'next/server';
import { submitToTag } from '@/lib/hestia-api';
import type { HestiaRole } from '@/types/hestia';

export async function POST(request: Request) {
  try {
    const { tag, data, role } = await request.json() as {
      tag: string;
      data: Record<string, unknown>;
      role: HestiaRole;
    };

    if (!tag || !data || !role) {
      return NextResponse.json({ error: 'Missing tag, data, or role' }, { status: 400 });
    }

    const result = await submitToTag(tag, data, role);
    return NextResponse.json({ ok: result.ok, status: result.status });
  } catch (error) {
    console.error('Guardian submit error:', error);
    return NextResponse.json({ error: String(error) }, { status: 502 });
  }
}
