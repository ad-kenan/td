'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trader } from '@/lib/db';
import { Dices, Sparkles, Check, RotateCcw, ArrowRight } from 'lucide-react';

interface TraderRandomizerWidgetProps {
  traders: Trader[];
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
}

export default function TraderRandomizerWidget({
  traders,
  selectedTraderId,
  onSelectTrader,
}: TraderRandomizerWidgetProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayedName, setDisplayedName] = useState<string | null>(null);
  const [chosenTrader, setChosenTrader] = useState<Trader | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Track last chosen trader ID to strictly guarantee no 2 consecutive identical picks
  const lastChosenIdRef = useRef<string | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore last chosen trader and history from localStorage on load
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('last_random_trader_id');
      const savedHistory = localStorage.getItem('random_trader_history');
      if (savedId) {
        lastChosenIdRef.current = savedId;
        const found = traders.find((t) => t.id === savedId);
        if (found) {
          setChosenTrader(found);
          setDisplayedName(found.name);
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
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, []);

  const handleRoll = () => {
    if (!traders || traders.length === 0 || isRolling) return;

    // Filter out the last chosen trader so we NEVER get the same trader twice in a row
    const eligibleTraders = traders.length > 1
      ? traders.filter((t) => t.id !== lastChosenIdRef.current)
      : traders;

    // Pick truly random trader from eligible candidates
    const randomIndex = Math.floor(Math.random() * eligibleTraders.length);
    const selected = eligibleTraders[randomIndex];

    // Start rolling animation
    setIsRolling(true);
    let step = 0;
    const totalSteps = 16;
    let speed = 50; // ms

    const runStep = () => {
      step++;
      // Show random name during the roll animation
      const randomFlicker = traders[Math.floor(Math.random() * traders.length)];
      setDisplayedName(randomFlicker.name);

      if (step >= totalSteps) {
        // Animation finished, lock on final winner
        setDisplayedName(selected.name);
        setChosenTrader(selected);
        lastChosenIdRef.current = selected.id;
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
        // Decelerate the animation gradually
        if (step > 10) speed += 35;
        else if (step > 6) speed += 15;
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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-md shadow-lg shadow-black/20">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-600/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-indigo-600/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left info / label */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/40 text-violet-300 shadow-inner">
            <Dices className={`h-5 w-5 ${isRolling ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Randomizer ID Trader
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-950/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                <Sparkles className="h-2.5 w-2.5" />
                Anti-doublon consécutif
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Tirez un nom au sort parmi vos traders pour décider par lequel commencer la session.
            </p>
          </div>
        </div>

        {/* Center / Right: Result & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Displayed Result Card */}
          <div className="flex min-h-[42px] min-w-[170px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 shadow-inner">
            {isRolling ? (
              <span className="animate-pulse font-mono text-base font-bold text-violet-400">
                🎲 {displayedName}...
              </span>
            ) : chosenTrader ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Départ :</span>
                <span className="font-bold text-sm sm:text-base text-zinc-100 bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
                  {chosenTrader.name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400">Aucun tirage lancé</span>
            )}
          </div>

          {/* Roll Button */}
          <button
            onClick={handleRoll}
            disabled={isRolling || traders.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-950/50 transition hover:from-violet-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50"
            title="Lancer le tirage aléatoire d'un trader"
          >
            {isRolling ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                Tirage en cours...
              </>
            ) : (
              <>
                <Dices className="h-4 w-4" />
                {chosenTrader ? 'Relancer (Random)' : 'Lancer le tirage'}
              </>
            )}
          </button>

          {/* Quick Apply / Select Button */}
          {chosenTrader && (
            <button
              onClick={handleApply}
              disabled={selectedTraderId === chosenTrader.id}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                selectedTraderId === chosenTrader.id
                  ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300 cursor-default'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-violet-500/50 hover:bg-zinc-800 hover:text-white'
              }`}
              title={`Sélectionner ${chosenTrader.name} dans le tableau de bord`}
            >
              {selectedTraderId === chosenTrader.id ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Actif
                </>
              ) : (
                <>
                  <span>Commencer avec {chosenTrader.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mini history trail */}
      {history.length > 1 && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-zinc-900 pt-2 text-[11px] text-zinc-400">
          <span className="font-medium text-zinc-400">Derniers tirages :</span>
          <div className="flex flex-wrap items-center gap-1">
            {history.map((name, idx) => (
              <span
                key={`${name}-${idx}`}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                  idx === 0
                    ? 'bg-violet-950/60 text-violet-300 border border-violet-800/40'
                    : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
