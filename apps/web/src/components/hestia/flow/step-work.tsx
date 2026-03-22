'use client';

import { useState } from 'react';
import { Flame, ArrowRight, Loader2, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { TAGS, HASHSCAN_BASE, INSTANCE_TOPIC_ID } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

export default function StepWork({ state, updateState, goToStep, pollHcs }: StepProps) {
  const [containment, setContainment] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.report);

  const fuelPre = 18.5;
  const fuelPost = 4.2;
  const reduction = 77.3;
  const treatedAcres = 118.5;

  const form = {
    reportId: 'TR-' + Date.now().toString(36).slice(-4),
    planId: (state.plan?.data as Record<string, unknown>)?.planId || 'TP-001',
    siteId: 'TD-001',
    treatmentType: 'prescribed_burn',
    treatedAcres,
    fuelPost,
    reduction,
    containment,
    crewLead: 'J. Martinez, CAL FIRE RX Lead',
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.REPORT_FORM,
          role: 'operator',
          data: {
            field0: form.reportId,
            field1: form.planId,
            field2: form.siteId,
            field3: form.treatmentType,
            field4: form.treatedAcres,
            field5: fuelPre,
            field6: form.fuelPost,
            field7: form.reduction,
            field8: form.containment,
            field9: form.crewLead,
          },
        }),
      });

      if (res.ok) {
        const link = `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`;
        updateState({ report: { data: form as unknown as Record<string, unknown>, hashScanLink: link } });
        setSuccess(true);
        await pollHcs();
      }
    } catch { /* handled */ }
    setSubmitting(false);
  };

  const fuelPrePct = (fuelPre / 25) * 100;
  const fuelPostPct = (fuelPost / 25) * 100;

  return (
    <div className="relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0E0905 0%, #1F1208 50%, #0E0905 100%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-16">
        {/* Narrative */}
        <div className="mb-10 animate-fade-in">
          <p className="text-orange-400/60 text-[11px] tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
            Step 5 of 8 · Treatment Report
          </p>
          <h1 className="text-white text-4xl font-extralight mb-3" style={{ letterSpacing: '-0.03em' }}>The Work</h1>
          <p className="text-white/45 text-[15px] leading-[1.65] max-w-xl">
            Three days of controlled burn. Martinez's crew treated 118.5 of the planned 120 acres — 98.75% completion. Fuel loading dropped from 18.5 to 4.2 tons per acre. The forest floor is clean. Containment is verified.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(234,88,12,0.1)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.2)' }}>
              Role: Operator
            </span>
            <span className="font-mono">fresh_oper</span>
          </div>
        </div>

        {/* Fuel load visualization */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-white/80 text-sm font-medium">Fuel Load Reduction</h3>
            <p className="text-white/30 text-[10px] mt-0.5">Measured in tons per acre. Target: below 5 tons/acre for defensible space.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Before bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Before Treatment</span>
                <span className="text-[14px] font-mono font-bold text-red-400">{fuelPre} tons/acre</span>
              </div>
              <div className="h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-full rounded-lg transition-all duration-1000" style={{
                  width: `${fuelPrePct}%`,
                  background: 'linear-gradient(90deg, #DC2626, #EA580C)',
                }} />
              </div>
            </div>

            {/* After bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>After Treatment</span>
                <span className="text-[14px] font-mono font-bold text-emerald-400">{fuelPost} tons/acre</span>
              </div>
              <div className="h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-full rounded-lg transition-all duration-1000" style={{
                  width: `${fuelPostPct}%`,
                  background: 'linear-gradient(90deg, #059669, #10B981)',
                }} />
              </div>
            </div>

            {/* Reduction callout */}
            <div className="text-center py-3 rounded-lg" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.1)' }}>
              <span className="text-emerald-400 text-2xl font-mono font-bold">{reduction}%</span>
              <span className="text-white/40 text-[11px] ml-2">fuel load reduction</span>
            </div>
          </div>
        </div>

        {/* Containment toggle */}
        <div className="rounded-xl overflow-hidden mb-6 animate-fade-in stagger-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <button onClick={() => !submitting && !success && setContainment(!containment)}
                className="shrink-0 mt-1 w-14 h-8 rounded-full transition-all relative"
                style={{
                  background: containment ? 'rgba(5,150,105,0.3)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${containment ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                <div className="absolute top-1 w-6 h-6 rounded-full transition-all" style={{
                  left: containment ? '28px' : '2px',
                  background: containment ? '#059669' : 'rgba(255,255,255,0.3)',
                }} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={containment ? 'text-emerald-400' : 'text-white/30'} />
                  <span className="text-white/80 text-sm font-medium">
                    {containment ? 'Containment Verified' : 'Containment Unverified'}
                  </span>
                </div>
                <p className="text-white/30 text-[11px] mt-1 leading-relaxed max-w-lg">
                  Cinderard ground temperature monitoring confirms the prescribed burn is fully contained.
                  No smoldering embers detected. All hotspots below 150°F at 48-hour post-burn check.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form details + submit */}
        <div className="rounded-xl overflow-hidden animate-fade-in stagger-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-white/80 text-sm font-medium">Treatment Report</h3>
            <p className="text-white/30 text-[10px] mt-0.5">Creates a Verifiable Credential with treatment outcomes on Hedera.</p>
          </div>

          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Report ID', value: form.reportId },
              { label: 'Plan ID', value: String(form.planId) },
              { label: 'Site ID', value: form.siteId },
              { label: 'Treated Acres', value: `${form.treatedAcres} acres` },
              { label: 'Fuel Post', value: `${form.fuelPost} tons/acre` },
              { label: 'Reduction', value: `${form.reduction}%` },
              { label: 'Containment', value: containment ? 'Verified' : 'Pending' },
              { label: 'Crew Lead', value: form.crewLead },
              { label: 'Completion', value: '98.75%' },
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
                <span className="text-emerald-400 text-[12px] font-medium">Treatment report recorded on Hedera</span>
                <a href={state.report?.hashScanLink || `${HASHSCAN_BASE}/topic/${INSTANCE_TOPIC_ID}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[10px] font-mono text-orange-400/70 hover:text-orange-400">
                  View on HashScan <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#EA580C' }}>
                {submitting ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Flame size={16} />}
                {submitting ? 'Recording on Hedera...' : 'Submit Treatment Report to Hedera'}
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        {success && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-white/30 text-[11px] mb-4">Treatment complete. Now the satellite confirms what the crew did on the ground.</p>
            <button onClick={() => goToStep(5)}
              className="flex items-center gap-3 mx-auto px-8 py-4 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
              style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
              Run Risk Assessment <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
