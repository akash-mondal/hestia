'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import { TAGS } from '@/lib/hestia-constants';
import type { StepProps } from './hestia-flow';

const DAY_TEMPS = [
  [85, 120, 280, 95, 110, 340, 360, 130, 100, 290, 330, 115, 80, 105, 190, 88],
  [72, 95, 165, 100, 88, 230, 245, 135, 95, 195, 220, 108, 68, 82, 120, 74],
  [52, 56, 64, 54, 53, 70, 74, 60, 55, 67, 72, 57, 50, 52, 58, 51],
];
const DAYS = ['Ignition', 'Active Burn', 'Mop-up'];

export default function StepWork({ state, updateState, guidePhase, advanceGuide, completeStep, pollHcs }: StepProps) {
  const [fuelPost, setFuelPost] = useState(18.5);
  const [containment, setContainment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(!!state.report);
  const [reportId] = useState(() => 'RPT-' + Date.now().toString(36).slice(-4));
  const [burnDay, setBurnDay] = useState(0);

  const treatedAcres = Number(state.plan?.data?.acres) || 118.5;
  const fuelPre = 18.5;
  const reductionNum = fuelPost < fuelPre ? (1 - fuelPost / fuelPre) * 100 : 0;
  const reduction = reductionNum.toFixed(1);
  const temps = DAY_TEMPS[burnDay];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/hestia/guardian/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: TAGS.REPORT_FORM, role: 'operator',
          data: { field0: reportId, field1: 'PL-DEMO', field2: 'TD-DEMO', field3: '2026-03-15', field4: '2026-03-18',
            field5: treatedAcres, field6: fuelPost, field7: Number(reduction), field8: containment, field9: temps.join(','),
            field10: 'QmDemo...', field11: 'J. Martinez, CAL FIRE RX' },
        }),
      });
      if (res.ok) { setSuccess(true); const link = await pollHcs(); updateState({ report: { data: { reportId, fuelPost, reduction, containment, treatedAcres }, hashScanLink: link } }); completeStep(); }
    } catch {}
    setSubmitting(false);
  };

  const pulse = (active: boolean) => active ? { animation: 'gp 2s ease-in-out infinite' } : {};

  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0810' }}>
      <style jsx global>{`@keyframes gp{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0.2)}}`}</style>

      <div className="w-full max-w-4xl px-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[12px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(245,158,11,0.5)' }}>Step 5 · Treatment Report</span>
          <span className="px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', borderRadius: 4 }}>Operator</span>
          <span className="text-[12px] font-mono text-white/65 ml-auto">{treatedAcres} of 640 acres ({((treatedAcres / 640) * 100).toFixed(0)}%)</span>
        </div>

        {/* Hero — fuel reduction percentage */}
        <div className="flex items-end gap-4 mb-8">
          <div className="text-white" style={{ fontSize: 'clamp(4rem, 8vw, 7rem)', fontWeight: 100, lineHeight: 0.85, letterSpacing: '-0.05em' }}>
            {reductionNum > 0 ? reduction : '—'}
          </div>
          <div className="pb-2">
            <div className="text-[13px] text-white/65" style={{ fontWeight: 300 }}>percent fuel reduction</div>
            <div className="text-[11px] font-mono text-white/65">{fuelPre} → {fuelPost.toFixed(1)} tons/acre</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left — fuel slider */}
          <div>
            <div className="flex justify-between text-[12px] mb-2">
              <span className="text-white/55 uppercase tracking-wider">Post-treatment fuel load</span>
              <span className="font-mono" style={{ color: fuelPost <= 5 ? '#10B981' : fuelPost <= 10 ? '#F59E0B' : '#EF4444' }}>{fuelPost.toFixed(1)} T/ac</span>
            </div>

            {/* Before bar */}
            <div className="mb-3">
              <div className="h-6 rounded overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="h-full rounded" style={{ width: `${(fuelPre / 25) * 100}%`, background: 'rgba(239,68,68,0.3)' }} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-white/55">Before: {fuelPre}</span>
              </div>
            </div>

            {/* After slider */}
            <div className="mb-4">
              <div className="h-6 rounded overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="h-full rounded transition-all" style={{ width: `${(fuelPost / 25) * 100}%`, background: fuelPost <= 5 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }} />
              </div>
              <input type="range" min="1" max="18.5" step="0.1" value={fuelPost}
                onChange={e => { const v = Number(e.target.value); setFuelPost(v); if (v < 5 && guidePhase === 1) advanceGuide(); }}
                className="w-full h-1 mt-1 rounded-full appearance-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', ...pulse(guidePhase === 1) }} />
            </div>

            {guidePhase === 1 && <p className="text-[12px] text-amber-400/40">Drag to ~4 tons/acre to report the fuel reduction.</p>}

            {/* Summary stats */}
            <div className="space-y-1.5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {[
                ['Crew Lead', 'J. Martinez, CAL FIRE RX'],
                ['Treatment', '3-day prescribed burn'],
                ['Treated', `${treatedAcres} acres`],
                ['Report ID', reportId],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12px]">
                  <span className="text-white/65">{k}</span>
                  <span className="font-mono text-white/55">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — temperature + containment */}
          <div>
            {/* Day stepper */}
            <div className="flex gap-1 mb-3">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => setBurnDay(i)} className="flex-1 py-1.5 text-[12px] font-medium transition-all"
                  style={{
                    background: burnDay === i ? (i === 2 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)') : 'transparent',
                    color: burnDay === i ? (i === 2 ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.2)',
                    borderBottom: burnDay === i ? `2px solid ${i === 2 ? '#10B981' : '#EF4444'}` : '2px solid transparent',
                  }}>
                  Day {i + 1}: {d}
                </button>
              ))}
            </div>

            {/* Temperature grid */}
            <div className="grid grid-cols-4 gap-px mb-4" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6, overflow: 'hidden' }}>
              {temps.map((t, i) => (
                <div key={i} className="aspect-square flex items-center justify-center text-[12px] font-mono"
                  style={{ background: t > 200 ? 'rgba(239,68,68,0.15)' : t > 100 ? 'rgba(249,115,22,0.1)' : t > 75 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)', color: t > 200 ? '#EF4444' : t > 100 ? '#F97316' : t > 75 ? '#F59E0B' : '#10B981' }}>
                  {t}°
                </div>
              ))}
            </div>

            <div className="text-[11px] font-mono text-white/60 mb-4">
              Cinderard™ ground temp sensors · {burnDay === 2 ? 'All sectors < 80°F' : `${temps.filter(t => t > 100).length} sectors above threshold`}
            </div>

            {/* Containment toggle */}
            <button onClick={() => { if (burnDay < 2) return; setContainment(!containment); if (!containment && guidePhase === 2) advanceGuide(); }}
              disabled={burnDay < 2}
              className="w-full flex items-center justify-between py-3 px-4 transition-all disabled:opacity-30"
              style={{ background: containment ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${containment ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 8, ...pulse(guidePhase === 2 && burnDay >= 2) }}>
              <span className="text-[11px]" style={{ color: containment ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
                Containment {containment ? 'Verified' : 'Unverified'}
              </span>
              {containment ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-white/65" />}
            </button>
            {guidePhase === 2 && burnDay < 2 && <p className="text-[12px] text-amber-400/40 mt-2">Switch to Day 3 to verify containment.</p>}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6">
          {guidePhase >= 3 && !success && (
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 text-[12px] font-medium text-white disabled:opacity-40" style={{ background: '#D97706', borderRadius: 8, ...pulse(!submitting) }}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Submitting Report...</span> : 'Submit Treatment Report to Hedera'}
            </button>
          )}
          {success && (
            <div className="flex items-center justify-between py-3 px-4" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.1)', borderRadius: 8 }}>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /><span className="text-amber-400 text-[12px]">Report submitted · {treatedAcres} acres</span></div>
              <a href={state.report?.hashScanLink} target="_blank" rel="noopener noreferrer" className="text-[12px] font-mono text-orange-400/50 hover:text-orange-400 flex items-center gap-1">HashScan <ExternalLink size={9} /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
