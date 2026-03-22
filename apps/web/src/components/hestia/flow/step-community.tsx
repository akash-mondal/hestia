'use client';

import { useState } from 'react';
import { Flame, ArrowRight, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

export default function StepCommunity({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.site);

  const [siteId] = useState(() => 'TD-DEMO-' + Date.now().toString(36).slice(-4));
  const form = {
    siteId,
    siteName: 'Tahoe Donner Unit 7',
    ownerEntity: 'Tahoe Donner Association',
    state: 'California', county: 'Nevada County',
    lat: 39.3406, lon: -120.2346,
    acres: 640, wui: 187, vegetation: 'mixed conifer', risk: 78,
    insurer: 'Swiss Re', premium: 285000, hedera: '0.0.8316646',
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.SITE_FORM, role: 'land-manager',
          data: {
            field0: form.siteId, field1: form.siteName, field2: form.ownerEntity,
            field3: form.state, field4: form.county, field5: form.lat, field6: form.lon,
            field7: form.acres, field8: form.wui, field9: form.vegetation,
            field10: form.risk, field11: form.insurer, field12: form.premium, field13: form.hedera,
          },
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({ site: { data: form as unknown as Record<string, unknown>, hashScanLink: link } });
        setSuccess(true);
        await pollHcs();
      }
    } catch { /* handled */ }
    setSubmitting(false);
  };

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 2 of 8 · Site Registration
          </p>
          <h1 className="text-white text-3xl font-light mb-3" style={{ letterSpacing: '-0.03em' }}>The Community</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xl">
            Maria is on the board of the Tahoe Donner HOA. 187 homes sit in the wildland-urban interface. She's registering her community's forest for treatment.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Land Manager
            </span>
            <span className="font-mono">fresh_land</span>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-white/80 text-sm font-medium">Site Registration — Tahoe Donner</h3>
            <p className="text-white/30 text-[10px] mt-0.5">Pre-filled with real Tahoe Donner HOA data. This will create a Verifiable Credential on Hedera.</p>
          </div>

          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Site Name', value: form.siteName },
              { label: 'Owner', value: form.ownerEntity },
              { label: 'Location', value: `${form.lat}°N, ${Math.abs(form.lon)}°W` },
              { label: 'Acreage', value: `${form.acres} acres` },
              { label: 'Structures at Risk', value: `${form.wui} homes` },
              { label: 'Vegetation', value: form.vegetation },
              { label: 'Current Risk Score', value: `${form.risk}/100 (Extreme)` },
              { label: 'Insurer', value: form.insurer },
              { label: 'Annual Premium', value: `$${form.premium.toLocaleString()}` },
            ].map(f => (
              <div key={f.label}>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
                <div className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            {success ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-400 text-[12px] font-medium">Site registered on Hedera</span>
                <a href={state.site?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                  View on HashScan <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#EA580C' }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                {submitting ? 'Registering on Hedera...' : 'Register Site on Hedera'}
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Your site is registered. Now it needs approval from a fire inspector.</p>
            <button onClick={() => goToStep(2)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Proceed to Inspection <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
