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
  User,
  Zap,
} from 'lucide-react';

interface TraderRandomizerWidgetProps {
  traders: Trader[];
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
}

// Generate consistent avatar gradient colors based on trader name
const getTraderGradient = (name: string) => {
  const gradients = [
    'from-violet-600 via-purple-500 to-indigo-600',
    'from-emerald-600 via-teal-500 to-cyan-600',
    'from-amber-500 via-orange-500 to-rose-500',
    'from-blue-600 via-indigo-500 to-sky-500',
    'from-fuchsia-600 via-pink-500 to-rose-600',
    'from-cyan-600 via-blue-500 to-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

// Web Audio API procedural sound synthesizer (0 external dependencies)
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
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // Ignore audio permission or context error
  }
}

function playWinSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.06;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {
    // Ignore audio permission or context error
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

  // Track last chosen trader ID to strictly guarantee no 2 consecutive identical picks
  const lastChosenIdRef = useRef<string | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore last chosen trader and history from localStorage on load
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('last_random_trader_id');
      const savedHistory = localStorage.getItem('random_trader_history');
      const savedSound = localStorage.getItem('random_sound_enabled');

      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }

      if (savedId) {
        lastChosenIdRef.current = savedId;
        const found = traders.find((t) => t.id === savedId);
        if (found) {
          setChosenTrader(found);
          setDisplayedTrader(found);
        }
      }
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [traders]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  // Filter pool with exclusions
  const activePool = useMemo(() => {
    return traders.filter((t) => !excludedIds.has(t.id));
  }, [traders, excludedIds]);

  const toggleExclude = (id: string) => {
    if (activePool.length <= 1 && !excludedIds.has(id)) {
      return; // Keep at least one trader
    }
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

    // Filter out the last chosen trader to GUARANTEE no 2 consecutive picks
    const eligibleTraders =
      activePool.length > 1
        ? activePool.filter((t) => t.id !== lastChosenIdRef.current)
        : activePool;

    // Truly random pick from candidates
    const randomIndex = Math.floor(Math.random() * eligibleTraders.length);
    const selected = eligibleTraders[randomIndex];

    setIsRolling(true);
    let step = 0;
    const totalSteps = 18;
    let speed = 40; // ms

    const runStep = () => {
      step++;
      const randomFlicker = activePool[Math.floor(Math.random() * activePool.length)];
      setDisplayedTrader(randomFlicker);

      if (soundEnabled) {
        playTickSound();
      }

      if (step >= totalSteps) {
        // Final winner landed
        setDisplayedTrader(selected);
        setChosenTrader(selected);
        lastChosenIdRef.current = selected.id;

        if (soundEnabled) {
          playWinSound();
        }

        setHistory((prev) => {
          const nextHistory = [selected.name, ...prev.slice(0, 5)];
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
        // Progressive deceleration curve
        if (step > 12) speed += 45;
        else if (step > 8) speed += 20;
        else if (step > 4) speed += 10;

        animationTimerRef.current = setTimeout(runStep, speed);
      }
    };

    runStep();
  };

  const handleApply = () => {
    if (chosenTrader) {
      onSelectTrader(chosenTrader.id);
    }
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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-[26px] border border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 via-zinc-950/90 to-[#08080c] p-3.5 sm:p-5 lg:p-6 backdrop-blur-2xl shadow-2xl shadow-black/40 animate-fade-in">
      {/* Background ambient neon lighting */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-56 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      {/* TOP BAR: Title, status indicator & sound controls */}
      <div className="relative z-10 flex flex-col gap-3.5 border-b border-zinc-800/70 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/60 to-zinc-950 shadow-inner shadow-violet-500/20">
            <Dices className={`h-4 w-4 sm:h-5 sm:w-5 text-violet-300 transition-transform ${isRolling ? 'animate-spin' : ''}`} />
            {isRolling && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-zinc-100">
                Roulette &amp; Tirage Aléatoire
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-950/40 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-violet-300 shadow-sm">
                <Sparkles className="h-2.5 w-2.5" />
                Anti-doublon
              </span>
            </div>
            <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-400">
              Sélectionnez au hasard le prochain ID trader pour débuter vos sessions.
            </p>
          </div>
        </div>

        {/* Right status badge + sound toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isRolling ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="font-mono font-medium text-zinc-400">
              {isRolling ? 'Tirage en cours' : `${activePool.length} IDs en jeu`}
            </span>
          </div>

          <button
            onClick={toggleSound}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
              soundEnabled
                ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                : 'border-zinc-800/50 bg-zinc-950/50 text-zinc-600 hover:text-zinc-400'
            }`}
            title={soundEnabled ? 'Désactiver les effets sonores' : 'Activer les effets sonores'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* CENTER REEL: Slot Machine / Roulette Arena */}
      <div className="relative z-10 my-3.5 sm:my-5">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-black/80 via-zinc-950/90 to-black/80 p-4 sm:p-6 lg:p-7 shadow-inner shadow-black">
          {/* Glowing laser hairline indicator */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent opacity-30 blur-sm" />

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            {isRolling ? (
              /* ACTIVE SPINNING STATE */
              <div className="flex flex-col items-center gap-2.5 sm:gap-3 py-2 animate-pulse w-full">
                <div
                  className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${
                    displayedTrader ? getTraderGradient(displayedTrader.name) : 'from-violet-600 to-indigo-600'
                  } text-lg sm:text-xl font-extrabold text-white shadow-lg shadow-violet-900/40`}
                >
                  {displayedTrader ? displayedTrader.name.slice(0, 2).toUpperCase() : '🎲'}
                </div>
                <div className="font-mono text-xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md truncate max-w-full px-2">
                  {displayedTrader?.name}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400">
                  <Zap className="h-3.5 w-3.5 animate-bounce" />
                  Sélection aléatoire en cours...
                </span>
              </div>
            ) : chosenTrader ? (
              /* WINNER DISPLAY STATE */
              <div className="flex flex-col items-center gap-2.5 sm:gap-3 py-1 w-full animate-fade-in">
                <div className="relative">
                  <div
                    className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${getTraderGradient(
                      chosenTrader.name
                    )} text-2xl sm:text-3xl font-black text-white shadow-xl shadow-violet-950/60 ring-2 ring-violet-400/40`}
                  >
                    {chosenTrader.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-900 bg-emerald-500 text-zinc-950 shadow-md">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-violet-400">
                    Trader Sélectionné
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg truncate max-w-full px-2">
                    {chosenTrader.name}
                  </h2>
                </div>

                {/* Direct Action Buttons for the winner - stacked full width on mobile, inline on desktop */}
                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                  <button
                    onClick={handleApply}
                    disabled={isCurrentActive}
                    className={`inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 text-xs sm:text-sm font-bold shadow-lg transition-all ${
                      isCurrentActive
                        ? 'border border-emerald-500/40 bg-emerald-950/50 text-emerald-300 shadow-emerald-950/30 cursor-default'
                        : 'bg-white text-zinc-950 hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] shadow-white/10'
                    }`}
                  >
                    {isCurrentActive ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Profil actif sur le Dashboard</span>
                      </>
                    ) : (
                      <>
                        <span>Commencer avec {chosenTrader.name}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRoll}
                    className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 text-xs sm:text-sm font-semibold text-zinc-200 transition hover:border-violet-500/50 hover:bg-zinc-800 hover:text-white active:scale-[0.98]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Relancer (un autre ID)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* INITIAL EMPTY STATE */
              <div className="flex flex-col items-center gap-3 py-3 sm:py-4 text-center w-full">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 shadow-inner">
                  <Dices className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-zinc-200">Prêt pour le tirage</p>
                  <p className="mt-1 max-w-sm text-[11px] sm:text-xs leading-5 text-zinc-400 px-2">
                    Appuyez sur le bouton ci-dessous pour lancer la roulette et déterminer avec quel ID trader vous commencez aujourd&apos;hui.
                  </p>
                </div>
                <button
                  onClick={handleRoll}
                  disabled={activePool.length === 0}
                  className="mt-1 inline-flex h-11 sm:h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-6 sm:px-7 text-xs sm:text-sm font-bold text-white shadow-xl shadow-violet-950/60 transition hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Dices className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Lancer la Roulette</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POOL CHIPS: Traders included in randomization */}
      <div className="relative z-10 border-t border-zinc-800/70 pt-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 mr-1">Pool d&apos;IDs :</span>
            {traders.map((t) => {
              const isExcluded = excludedIds.has(t.id);
              const isChosen = chosenTrader?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => toggleExclude(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium transition ${
                    isChosen
                      ? 'border-violet-500/60 bg-violet-950/50 text-violet-200 ring-1 ring-violet-500/30'
                      : isExcluded
                      ? 'border-zinc-800/40 bg-zinc-950/40 text-zinc-600 line-through opacity-60'
                      : 'border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700 hover:text-white'
                  }`}
                  title={isExcluded ? `Réintégrer ${t.name} au tirage` : `Exclure ${t.name} du tirage`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isChosen ? 'bg-violet-400' : isExcluded ? 'bg-zinc-700' : 'bg-emerald-400'
                    }`}
                  />
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Roll trigger if already has winner */}
          {chosenTrader && !isRolling && (
            <button
              onClick={handleRoll}
              className="inline-flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-violet-950/40 transition hover:bg-violet-500 active:scale-95"
            >
              <Dices className="h-3.5 w-3.5" />
              <span>Nouveau Tirage</span>
            </button>
          )}
        </div>
      </div>

      {/* MINI HISTORY FOOTER: Flushable history */}
      {history.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-zinc-800/50 pt-2.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-zinc-400 text-[10px] sm:text-[11px]">Historique :</span>
            <div className="flex flex-wrap items-center gap-1">
              {history.map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  className={`rounded-lg px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold ${
                    idx === 0
                      ? 'border border-violet-800/50 bg-violet-950/60 text-violet-300'
                      : 'border border-zinc-800/80 bg-zinc-900/60 text-zinc-400'
                  }`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleFlushHistory}
            className="inline-flex items-center gap-1 self-start sm:self-auto rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-2 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-rose-900/60 hover:bg-rose-950/30 hover:text-rose-300"
            title="Vider l'historique et réinitialiser l'anti-doublon"
          >
            <Trash2 className="h-3 w-3" />
            <span>Vider l&apos;historique</span>
          </button>
        </div>
      )}
    </div>
  );
}
