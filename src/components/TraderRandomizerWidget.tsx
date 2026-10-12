'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trader } from '@/lib/db';
import {
  Dices,
  Sparkles,
  Check,
  RotateCcw,
  ArrowRight,
  Trash2,
  Volume2,
  VolumeX,
  ChevronDown,
} from 'lucide-react';

interface TraderRandomizerWidgetProps {
  traders: Trader[];
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
}

// Procedural Web Audio API sound synthesizer
function playTickSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // Ignore
  }
}

function playWinSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.05;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.07, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  } catch {
    // Ignore
  }
}

export default function TraderRandomizerWidget({
  traders,
  selectedTraderId,
  onSelectTrader,
}: TraderRandomizerWidgetProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayedTrader, setDisplayedTrader] = useState<Trader | null>(null);
  const [chosenTrader, setChosenTrader] = useState<Trader | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [isPoolMenuOpen, setIsPoolMenuOpen] = useState(false);

  const lastChosenIdRef = useRef<string | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const poolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('last_random_trader_id');
      const savedHistory = localStorage.getItem('random_trader_history');
      const savedSound = localStorage.getItem('random_sound_enabled');

      if (savedSound !== null) setSoundEnabled(savedSound === 'true');

      if (savedId) {
        lastChosenIdRef.current = savedId;
        const found = traders.find((t) => t.id === savedId);
        if (found) {
          setChosenTrader(found);
          setDisplayedTrader(found);
        }
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch {
      // Ignore
    }
  }, [traders]);

  // Click outside listener for pool menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (poolRef.current && !poolRef.current.contains(event.target as Node)) {
        setIsPoolMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  const activePool = useMemo(() => {
    return traders.filter((t) => !excludedIds.has(t.id));
  }, [traders, excludedIds]);

  const toggleExclude = (id: string) => {
    if (activePool.length <= 1 && !excludedIds.has(id)) return;
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('random_sound_enabled', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleRoll = () => {
    if (activePool.length === 0 || isRolling) return;

    // Guaranteed anti-consecutive duplicate
    const eligibleTraders =
      activePool.length > 1
        ? activePool.filter((t) => t.id !== lastChosenIdRef.current)
        : activePool;

    const randomIndex = Math.floor(Math.random() * eligibleTraders.length);
    const selected = eligibleTraders[randomIndex];

    setIsRolling(true);
    let step = 0;
    const totalSteps = 16;
    let speed = 40;

    const runStep = () => {
      step++;
      const randomFlicker = activePool[Math.floor(Math.random() * activePool.length)];
      setDisplayedTrader(randomFlicker);

      if (soundEnabled) playTickSound();

      if (step >= totalSteps) {
        setDisplayedTrader(selected);
        setChosenTrader(selected);
        lastChosenIdRef.current = selected.id;

        if (soundEnabled) playWinSound();

        setHistory((prev) => {
          const nextHistory = [selected.name, ...prev.slice(0, 4)];
          try {
            localStorage.setItem('last_random_trader_id', selected.id);
            localStorage.setItem('random_trader_history', JSON.stringify(nextHistory));
          } catch {
            // ignore
          }
          return nextHistory;
        });

        setIsRolling(false);
      } else {
        if (step > 11) speed += 40;
        else if (step > 7) speed += 20;
        else if (step > 4) speed += 10;

        animationTimerRef.current = setTimeout(runStep, speed);
      }
    };

    runStep();
  };

  const handleApply = () => {
    if (chosenTrader) onSelectTrader(chosenTrader.id);
  };

  const handleFlushHistory = () => {
    setHistory([]);
    lastChosenIdRef.current = null;
    try {
      localStorage.removeItem('random_trader_history');
      localStorage.removeItem('last_random_trader_id');
    } catch {
      // ignore
    }
  };

  const isCurrentActive = Boolean(chosenTrader && selectedTraderId === chosenTrader.id);

  return (
    <div className="relative z-20 flex min-h-[48px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-[#111216]/90 px-3.5 py-2 backdrop-blur-xl">
      {/* GAUCHE : Bouton de tirage + Cadre résultat & activation */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Bouton de tirage compact */}
        <button
          onClick={handleRoll}
          disabled={isRolling || activePool.length === 0}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-violet-600/90 px-3 text-xs font-semibold text-white shadow-sm shadow-violet-950/40 transition hover:bg-violet-600 active:scale-95 disabled:opacity-40"
          title="Tirer un trader au sort pour démarrer la session"
        >
          <Dices className={`h-3.5 w-3.5 ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'Tirage...' : chosenTrader ? 'Relancer' : 'Lancer le tirage'}</span>
        </button>

        {/* Cadre de résultat compact */}
        <div className="flex h-8 min-w-[130px] items-center gap-2 rounded-xl border border-white/[0.07] bg-black/40 px-3 text-xs">
          {isRolling ? (
            <span className="font-mono font-bold text-violet-400 animate-pulse">
              🎲 {displayedTrader?.name}...
            </span>
          ) : chosenTrader ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Départ :</span>
              <span className="font-bold text-zinc-100">{chosenTrader.name}</span>
            </div>
          ) : (
            <span className="text-zinc-500 text-[11px]">En attente de tirage</span>
          )}
        </div>

        {/* Bouton d'activation rapide vers le trader */}
        {chosenTrader && !isRolling && (
          <button
            onClick={handleApply}
            disabled={isCurrentActive}
            className={`inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium transition ${
              isCurrentActive
                ? 'bg-emerald-950/30 text-emerald-400 cursor-default'
                : 'bg-white/[0.05] text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
            title={`Filtrer le dashboard sur ${chosenTrader.name}`}
          >
            {isCurrentActive ? (
              <>
                <Check className="h-3 w-3" />
                <span>Actif</span>
              </>
            ) : (
              <>
                <span>Commencer avec {chosenTrader.name}</span>
                <ArrowRight className="h-3 w-3 text-zinc-400" />
              </>
            )}
          </button>
        )}
      </div>

      {/* DROITE : Pool compact ▾ + Anti-doublon + Historique + Son */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Micro-badge anti-doublon */}
        <span
          className="hidden items-center gap-1 rounded-lg bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-zinc-400 lg:inline-flex"
          title="Garantit qu'aucun trader n'est tiré 2 fois consécutivement"
        >
          <Sparkles className="h-2.5 w-2.5 text-violet-400" />
          Anti-doublon actif
        </span>

        {/* Popover du Pool d'IDs */}
        <div className="relative" ref={poolRef}>
          <button
            onClick={() => setIsPoolMenuOpen(!isPoolMenuOpen)}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            title="Gérer les traders inclus dans le tirage"
          >
            <span>Pool : {activePool.length} IDs</span>
            <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isPoolMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPoolMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#121318] p-2 shadow-2xl backdrop-blur-2xl animate-fade-in z-50">
              <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Inclus dans le tirage
              </div>
              <div className="space-y-0.5">
                {traders.map((t) => {
                  const isExcluded = excludedIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleExclude(t.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-2 py-1 text-xs transition ${
                        !isExcluded
                          ? 'text-zinc-200 hover:bg-white/[0.06]'
                          : 'text-zinc-500 line-through hover:bg-white/[0.03]'
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className={`h-2 w-2 rounded-full ${!isExcluded ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tags d'historique + Vider */}
        {history.length > 0 && (
          <div className="flex items-center gap-1 border-l border-white/[0.06] pl-2">
            <div className="hidden sm:flex items-center gap-1">
              {history.slice(0, 3).map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400"
                >
                  {name}
                </span>
              ))}
            </div>
            <button
              onClick={handleFlushHistory}
              className="p-1 text-zinc-500 transition hover:text-rose-400"
              title="Vider l'historique du tirage"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Toggle son */}
        <button
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-300"
          title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
