'use client';

import { useState, useCallback } from 'react';

interface ApproveState {
  processing: string | null; // documentId being processed
  approved: Set<string>;
  rejected: Set<string>;
  error: string | null;
}

export function useGuardianApprove() {
  const [state, setState] = useState<ApproveState>({
    processing: null,
    approved: new Set(),
    rejected: new Set(),
    error: null,
  });

  const approve = useCallback(async (buttonTag: string, documentId: string) => {
    setState(s => ({ ...s, processing: documentId, error: null }));
    try {
      const res = await fetch('/api/hestia/guardian/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonTag, documentId, dialogResult: 'Approved' }),
      });
      if (res.ok) {
        setState(s => ({
          ...s,
          processing: null,
          approved: new Set([...s.approved, documentId]),
        }));
        return true;
      }
      setState(s => ({ ...s, processing: null, error: `Approve failed: ${res.status}` }));
      return false;
    } catch (err) {
      setState(s => ({ ...s, processing: null, error: String(err) }));
      return false;
    }
  }, []);

  const reject = useCallback(async (buttonTag: string, documentId: string, reason: string) => {
    setState(s => ({ ...s, processing: documentId, error: null }));
    try {
      const res = await fetch('/api/hestia/guardian/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonTag, documentId, dialogResult: reason || 'Rejected' }),
      });
      if (res.ok) {
        setState(s => ({
          ...s,
          processing: null,
          rejected: new Set([...s.rejected, documentId]),
        }));
        return true;
      }
      setState(s => ({ ...s, processing: null, error: `Reject failed: ${res.status}` }));
      return false;
    } catch (err) {
      setState(s => ({ ...s, processing: null, error: String(err) }));
      return false;
    }
  }, []);

  const bulkApprove = useCallback(async (buttonTag: string, documentIds: string[], onProgress?: (done: number, total: number) => void) => {
    const results: boolean[] = [];
    for (let i = 0; i < documentIds.length; i++) {
      const ok = await approve(buttonTag, documentIds[i]);
      results.push(ok);
      onProgress?.(i + 1, documentIds.length);
      if (i < documentIds.length - 1) await new Promise(r => setTimeout(r, 500)); // rate limit
    }
    return results;
  }, [approve]);

  return { ...state, approve, reject, bulkApprove };
}
