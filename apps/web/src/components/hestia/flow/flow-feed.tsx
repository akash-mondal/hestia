'use client';

import { ExternalLink, Radio } from 'lucide-react';
import type { HcsMessage } from './hestia-flow';

interface FlowFeedProps {
  messages: HcsMessage[];
  wrcBefore: number;
  wrcAfter: number;
}

export default function FlowFeed({ messages, wrcBefore, wrcAfter }: FlowFeedProps) {
  const wrcDelta = wrcAfter - wrcBefore;

  return (
    <div className="fixed right-4 top-16 z-40 w-64 hidden lg:block animate-fade-in" style={{
      background: 'rgba(12, 10, 9, 0.92)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
    }}>
      <div className="px-3 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Radio size={12} className="text-emerald-400 animate-pulse motion-reduce:animate-none" />
        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">On-Chain Activity</span>
      </div>

      <div className="px-3 py-2 space-y-2">
        {messages.slice(0, 3).map((msg, i) => (
          <a key={i} href={msg.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 py-1 hover:opacity-80 transition-opacity">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-mono text-white/50">HCS #{msg.seq}</span>
            </div>
            <ExternalLink size={9} className="text-white/20 shrink-0" />
          </a>
        ))}

        {wrcDelta > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] text-white/40 mb-1">WRC Supply</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-white/50">{(wrcBefore / 100).toLocaleString()}</span>
              <span className="text-[11px] text-white/30">→</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">{(wrcAfter / 100).toLocaleString()}</span>
              <span className="text-[9px] font-mono text-emerald-400/60">(+{(wrcDelta / 100).toFixed(1)})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
