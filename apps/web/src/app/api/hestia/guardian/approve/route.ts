import { NextResponse } from 'next/server';
import { approveDocument } from '@/lib/hestia-api';

export async function POST(request: Request) {
  try {
    const { buttonTag, documentId, dialogResult } = await request.json() as {
      buttonTag: string;
      documentId: string;
      dialogResult?: string;
    };

    if (!buttonTag || !documentId) {
      return NextResponse.json({ error: 'Missing buttonTag or documentId' }, { status: 400 });
    }

    const result = await approveDocument(buttonTag, documentId, dialogResult || 'Approved');
    return NextResponse.json({ ok: result.ok, status: result.status });
  } catch (error) {
    console.error('Guardian approve error:', error);
    return NextResponse.json({ error: String(error) }, { status: 502 });
  }
}
