'use client';

import { useState, useCallback } from 'react';
import type { HestiaRole } from '@/types/hestia';

interface SubmitState {
  loading: boolean;
  success: boolean;
  error: string | null;
  hashScanLink: string | null;
}

export function useGuardianSubmit(tag: string, role: HestiaRole) {
  const [state, setState] = useState<SubmitState>({
    loading: false,
    success: false,
    error: null,
    hashScanLink: null,
  });

  const submit = useCallback(async (document: Record<string, unknown>) => {
    setState({ loading: true, success: false, error: null, hashScanLink: null });

    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, data: document, role }),
      });

      if (res.ok) {
        setState({
          loading: false,
          success: true,
          error: null,
          hashScanLink: 'https://hashscan.io/testnet/topic/0.0.8317430',
        });
      } else {
        const err = await res.json().catch(() => ({ error: `Failed: ${res.status}` }));
        setState({ loading: false, success: false, error: err.error || `Status ${res.status}`, hashScanLink: null });
      }
    } catch (err) {
      setState({ loading: false, success: false, error: String(err), hashScanLink: null });
    }
  }, [tag, role]);

  const reset = useCallback(() => {
    setState({ loading: false, success: false, error: null, hashScanLink: null });
  }, []);

  return { ...state, submit, reset };
}
