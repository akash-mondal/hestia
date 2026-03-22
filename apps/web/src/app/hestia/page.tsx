'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ChevronRight, ChevronLeft, ChevronDown, X, Share2, Menu } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import Image from 'next/image';
import { HESTIA_CHAPTERS, HESTIA_CHAPTER_ACCENTS, HESTIA_ROLES, HESTIA_PARTNERS } from '@/lib/hestia-chapter-data';
import CloudOverlay from '@/components/landing/cloud-overlay';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

const CHAPTER_HEIGHT = 100;
const TOTAL_CHAPTERS = HESTIA_CHAPTERS.length + 1;

// Reuse Zeno chapter images (fire-appropriate landscapes)
const CHAPTER_IMAGES = [
  '/images/chapters/ch1.webp',
  '/images/chapters/ch2.webp',
  '/images/chapters/ch3.webp',
  '/images/chapters/ch4.webp',
  '/images/chapters/ch5.webp',
  '/images/chapters/ch6.webp',
  '/images/chapters/ch7.webp',
];

export default function HestiaLanding() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [activeChapter, setActiveChapter] = useState(-1);
  const lastChapterRef = useRef(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ═══ MAPBOX GLOBE — California/Western US ═══
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-120.23, 39.34], // Tahoe Donner
      zoom: 12,
      pitch: 50,
      bearing: -30,
      projection: 'globe',
      interactive: false,
      fadeDuration: 0,
    });

    map.on('style.load', () => {
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
      // Warm amber fog — fire theme
      map.setFog({
        color: 'rgb(21, 10, 0)',
        'high-color': 'rgb(50, 25, 10)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(15, 5, 0)',
        'star-intensity': 0.4,
      });
      setMapLoaded(true);
    });

    mapRef.current = map;
    return () => { map.remove(); };
  }, []);

  // Slow pan across fire-prone Western US
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const FIRE_WAYPOINTS: [number, number][] = [
      [-120.23, 39.34],  // Tahoe Donner
      [-121.44, 39.76],  // Paradise (Camp Fire)
      [-118.56, 34.05],  // Malibu
      [-122.42, 37.77],  // San Francisco
      [-120.23, 39.34],  // back to Tahoe
    ];
    let idx = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const flyNext = () => {
      if (!mapRef.current) return;
      idx = (idx + 1) % FIRE_WAYPOINTS.length;
      mapRef.current.flyTo({
        center: FIRE_WAYPOINTS[idx],
        zoom: 11 + Math.random() * 2,
        pitch: 40 + Math.random() * 20,
        bearing: -40 + Math.random() * 80,
        duration: 18000,
        essential: true,
      });
      timeout = setTimeout(flyNext, 19000);
    };
    timeout = setTimeout(flyNext, 5000);
    return () => clearTimeout(timeout);
  }, [mapLoaded]);

  // Scroll → chapter detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const chapterIndex = Math.floor(scrollY / (vh * (CHAPTER_HEIGHT / 100)));
      const newChapter = Math.min(chapterIndex - 1, HESTIA_CHAPTERS.length - 1);
      if (newChapter !== lastChapterRef.current) {
        lastChapterRef.current = newChapter;
        setActiveChapter(newChapter);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToChapter = useCallback((index: number) => {
    const vh = window.innerHeight;
    const targetScroll = (index + 1) * vh * (CHAPTER_HEIGHT / 100);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeChapter < HESTIA_CHAPTERS.length - 1) goToChapter(activeChapter + 1);
        else if (activeChapter === -1) goToChapter(0);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeChapter > -1) goToChapter(activeChapter - 1);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeChapter, goToChapter]);

  const currentChapter = activeChapter >= 0 ? HESTIA_CHAPTERS[activeChapter] : null;
  const accentColor = HESTIA_CHAPTER_ACCENTS[(activeChapter + 1)] || '#FB923C';
  const isHero = activeChapter === -1;

  return (
    <>
      <style jsx global>{`
        html, body { background: #150A00 !important; margin: 0; padding: 0; }
        body.noise::before { display: none !important; }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>

      {/* Globe */}
      <div className="fixed inset-0 z-[10] transition-opacity duration-1000"
        style={{ opacity: isHero ? 1 : 0, pointerEvents: isHero ? 'auto' : 'none' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <CloudOverlay visible={isHero} />

      {/* Chapter Images */}
      <div className="fixed inset-0 z-[10] transition-opacity duration-700" style={{ opacity: !isHero ? 1 : 0 }}>
        {CHAPTER_IMAGES.map((src, i) => (
          <Image key={src} src={src} alt="" fill className="object-cover transition-opacity duration-700"
            style={{ opacity: activeChapter === i ? 1 : 0 }} priority={i < 2} sizes="100vw" quality={95} />
        ))}
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 z-[13] pointer-events-none" style={{
        background: isHero
          ? 'radial-gradient(ellipse at center, transparent 30%, rgba(21,10,0,0.5) 100%)'
          : 'linear-gradient(to right, rgba(21,10,0,0.1) 0%, rgba(21,10,0,0.65) 55%, rgba(21,10,0,0.85) 75%, rgba(21,10,0,0.9) 100%)',
      }} />

      <div aria-hidden="true" style={{ height: `${TOTAL_CHAPTERS * CHAPTER_HEIGHT}vh` }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-8 py-6">
        <div />
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-400" />
          <span className="text-white font-semibold text-lg" style={{ letterSpacing: '-0.02em' }}>HESTIA</span>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors pointer-events-auto px-4 py-2 rounded-full border border-white/20 hover:border-white/40 text-xs tracking-widest uppercase backdrop-blur-sm">
          CHAPTERS <Menu size={14} />
        </button>
      </header>

      {/* Hero */}
      <AnimatePresence>
        {isHero && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[20] flex flex-col items-center justify-center pointer-events-none">
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="text-orange-400 text-xs tracking-[0.2em] uppercase mb-6" style={{ fontFamily: 'var(--font-mono)' }}>
              &#9632; HESTIA 2026 &middot; WILDFIRE RESILIENCE CREDITS
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-white text-center leading-[0.9] px-4"
              style={{ fontSize: 'clamp(3rem, 11vw, 9rem)', fontWeight: 200, letterSpacing: '-0.04em' }}>
              Guardians<br />of the Forest
            </motion.h1>
            <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
              onClick={() => goToChapter(0)}
              className="mt-10 flex items-center gap-3 px-8 py-4 rounded-full text-white text-xs tracking-[0.15em] uppercase transition-all hover:scale-105 pointer-events-auto"
              style={{ background: 'rgba(234, 88, 12, 0.25)', border: '1.5px solid rgba(234, 88, 12, 0.6)', backdropFilter: 'blur(12px)' }}>
              ENTER EXPERIENCE <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </motion.button>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }} className="mt-16">
              <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase text-center mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                &#9632; POWERED BY
              </p>
              <div className="flex items-center gap-8">
                {HESTIA_PARTNERS.map(p => (
                  <span key={p.name} className="text-white/50 text-xs tracking-wider uppercase font-medium">{p.name}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters 1-6 */}
      <AnimatePresence mode="wait">
        {currentChapter && currentChapter.index < 7 && (
          <motion.div key={currentChapter.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-12 top-1/2 -translate-y-1/2 z-[20] max-w-md pointer-events-none">
            <div className="absolute -inset-8 rounded-2xl backdrop-blur-xl"
              style={{ background: 'rgba(21, 10, 0, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div className="relative">
              <p className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'var(--font-mono)', color: accentColor }}>
                &#9632; {currentChapter.label}
              </p>
              <p className="text-white/50 text-[11px] tracking-[0.15em] uppercase mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                {currentChapter.subtitle}
              </p>
              <h2 className="text-white mb-4 leading-[1.05]" style={{
                fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 300, letterSpacing: '-0.03em',
              }}>{currentChapter.title}</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">{currentChapter.body}</p>
              <div className="mb-6">
                <span className="block leading-none" style={{
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 200,
                  fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: accentColor,
                }}>{currentChapter.stat}</span>
                <span className="text-white/40 text-[11px] tracking-[0.15em] uppercase mt-1 block" style={{ fontFamily: 'var(--font-mono)' }}>
                  {currentChapter.statLabel}
                </span>
              </div>
              {currentChapter.cta && (
                <Link href={currentChapter.cta.href} target={currentChapter.cta.href.startsWith('http') ? '_blank' : undefined}
                  className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/30 hover:border-white/60 text-white text-xs tracking-[0.12em] uppercase transition-all hover:scale-105 pointer-events-auto backdrop-blur-sm">
                  {currentChapter.cta.label}
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter 7: Role Selector */}
      <AnimatePresence>
        {activeChapter === 6 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20] flex flex-col items-center justify-center pointer-events-none">
            <p className="text-orange-400 text-[11px] tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              &#9632; CHAPTER 07
            </p>
            <h2 className="text-white mb-2 text-center" style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, letterSpacing: '-0.03em',
            }}>Choose Your Portal</h2>
            <p className="text-white/50 text-sm mb-10 text-center max-w-md">
              Four perspectives on wildfire resilience. Real Guardian data, real Hedera transactions, real satellite imagery.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl px-6 pointer-events-auto">
              {HESTIA_ROLES.map((role, i) => (
                <motion.div key={role.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                  <Link href={role.href}
                    className="group block p-5 rounded-2xl border border-white/15 hover:border-white/40 backdrop-blur-md transition-all hover:scale-[1.03]"
                    style={{ background: 'rgba(21,10,0,0.6)' }}>
                    <div className={`h-1 rounded-full bg-gradient-to-r ${role.gradient} mb-4 w-12 group-hover:w-full transition-all duration-500`} />
                    <h3 className="text-white font-medium text-base mb-0.5">{role.title}</h3>
                    <p className="text-white/40 text-xs tracking-wider uppercase">{role.subtitle}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll Indicator */}
      {!isHero && activeChapter < HESTIA_CHAPTERS.length - 1 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[20] flex flex-col items-center gap-2 pointer-events-auto cursor-pointer"
          onClick={() => goToChapter(activeChapter + 1)}>
          <div className="relative w-6 h-10 rounded-full border-2 border-white/30 flex justify-center">
            <motion.div className="w-1 h-1 rounded-full bg-white/60 mt-1.5"
              animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <span className="text-white/30 text-[9px] tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>SCROLL</span>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-[30] flex items-center px-8 py-5 pointer-events-none">
        <div className="flex-1 text-white/30 text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
          &#9632; 2026<br /><span className="text-[9px]">GUARDIANS OF THE FOREST</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => activeChapter > -1 ? goToChapter(activeChapter - 1) : null}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all pointer-events-auto ${activeChapter <= -1 ? 'opacity-0' : 'opacity-100 hover:scale-110'}`}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ChevronLeft size={16} className="text-white/80" />
          </button>
          {[-1, ...HESTIA_CHAPTERS.map((_, i) => i)].map((idx) => (
            <button key={idx} onClick={() => idx === -1 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : goToChapter(idx)}
              className="rounded-full transition-all pointer-events-auto hover:scale-125"
              style={{
                width: activeChapter === idx ? 10 : 6,
                height: activeChapter === idx ? 10 : 6,
                backgroundColor: activeChapter === idx ? (HESTIA_CHAPTER_ACCENTS[idx + 1] || '#FB923C') : 'rgba(255,255,255,0.4)',
                boxShadow: activeChapter === idx ? `0 0 8px ${HESTIA_CHAPTER_ACCENTS[idx + 1] || '#FB923C'}` : 'none',
              }} />
          ))}
          <button onClick={() => activeChapter < HESTIA_CHAPTERS.length - 1 ? goToChapter(activeChapter + 1) : null}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all pointer-events-auto ${activeChapter >= HESTIA_CHAPTERS.length - 1 ? 'opacity-0' : 'opacity-100 hover:scale-110'}`}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ChevronRight size={16} className="text-white/80" />
          </button>
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors pointer-events-auto text-xs tracking-wider uppercase">
            SHARE <Share2 size={12} />
          </button>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 pointer-events-auto" onClick={() => setDrawerOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] z-[70] bg-white pointer-events-auto overflow-y-auto">
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <h3 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.02em', color: '#1A1A1A' }}>Chapters</h3>
                <button onClick={() => setDrawerOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                {HESTIA_CHAPTERS.map((ch) => (
                  <button key={ch.id} onClick={() => goToChapter(ch.index - 1)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors ${activeChapter === ch.index - 1 ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${HESTIA_CHAPTER_ACCENTS[ch.index]}22, ${HESTIA_CHAPTER_ACCENTS[ch.index]}44)` }}>
                      <span className="text-lg font-light" style={{ fontFamily: 'var(--font-mono)', color: HESTIA_CHAPTER_ACCENTS[ch.index] }}>
                        {String(ch.index).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.1em] uppercase mb-0.5" style={{ fontFamily: 'var(--font-mono)', color: HESTIA_CHAPTER_ACCENTS[ch.index] }}>
                        {ch.label}
                      </p>
                      <p className="text-gray-900 font-medium text-sm">{ch.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#150A00' }}>
            <div className="text-center">
              <Flame size={32} className="text-orange-400 mx-auto mb-4 animate-pulse" />
              <p className="text-white/50 text-xs tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>LOADING HESTIA</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
