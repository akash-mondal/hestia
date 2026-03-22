'use client';

import { useState } from 'react';
import { Send, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import type { HestiaRole } from '@/types/hestia';
import { HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

interface GuardianFormProps {
  tag: string;
  role: HestiaRole;
  fields: FieldConfig[];
  title: string;
  description?: string;
  onSuccess?: () => void;
}

export default function GuardianForm({ tag, role, fields, title, description, onSuccess }: GuardianFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    fields.forEach(f => { init[f.name] = f.defaultValue ?? (f.type === 'number' ? 0 : f.type === 'boolean' ? false : ''); });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Build document with field0, field1, etc.
    const document: Record<string, unknown> = {};
    fields.forEach((f, i) => {
      let val = values[f.name];
      if (f.type === 'number') val = Number(val);
      if (f.type === 'boolean') val = Boolean(val);
      document[`field${i}`] = val;
    });

    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, data: document, role }),
      });

      if (res.ok) {
        setSuccess(true);
        onSuccess?.();
        setTimeout(() => setSuccess(false), 8000);
      } else {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        setError(err.error || `Failed: ${res.status}`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
          {collapsed ? 'EXPAND' : 'COLLAPSE'}
        </span>
      </button>

      {!collapsed && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.name} className={f.type === 'boolean' ? 'col-span-1' : ''}>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  {f.label} {f.required && <span style={{ color: 'var(--violation)' }}>*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={String(values[f.name] ?? '')}
                    onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select...</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[f.name])}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.checked }))}
                      className="w-4 h-4 rounded accent-orange-600"
                    />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Yes</span>
                  </label>
                ) : (
                  <input
                    type={f.type}
                    value={String(values[f.name] ?? '')}
                    onChange={e => setValues(v => ({ ...v, [f.name]: f.type === 'number' ? e.target.value : e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.required}
                    step={f.type === 'number' ? 'any' : undefined}
                    className="w-full px-3 py-2 rounded-md text-xs font-mono border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="text-[11px] px-3 py-2 rounded-md" style={{ color: 'var(--violation)', background: 'rgba(220,38,38,0.08)' }}>
              {error}
            </div>
          )}

          {success ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: 'rgba(5,150,105,0.08)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--compliant)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--compliant)' }}>Submitted to Hedera!</span>
              <a href={`${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                View on HashScan <ExternalLink size={10} />
              </a>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)' }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? 'Submitting to Hedera...' : 'Submit to Guardian'}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
