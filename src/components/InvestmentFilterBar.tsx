'use client';

import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { Challenge, Trader } from '@/lib/db';

interface InvestmentFilterBarProps {
  challenges: Challenge[];
  traders: Trader[];
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  applyToAllViews: boolean;
  onToggleApplyToAllViews: (val: boolean) => void;
}

export default function InvestmentFilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  applyToAllViews,
  onToggleApplyToAllViews,
}: InvestmentFilterBarProps) {
  const currentYear = new Date().getFullYear();

  // Helper date generators for presets
  const handlePresetAugust1 = () => {
    onStartDateChange('2026-08-01');
    onEndDateChange('');
  };

  const handlePresetCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    onStartDateChange(`${year}-${month}-01`);
    onEndDateChange('');
  };

  const handlePresetLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  const handlePresetYTD = () => {
    onStartDateChange(`${currentYear}-01-01`);
    onEndDateChange('');
  };

  const handleResetDates = () => {
    onStartDateChange('');
    onEndDateChange('');
  };

  const isAugustPresetActive = startDate === '2026-08-01' && !endDate;
  const isAllHistoryActive = !startDate && !endDate;

  return (
    <div className="relative z-10 flex min-h-[44px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-xl transition-colors dark:border-white/[0.05] dark:bg-[#111216]/80">
      {/* GAUCHE : Presets temporels (Segmented Control) */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mr-1.5">Période :</span>

        <button
          onClick={handleResetDates}
          className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${
            isAllHistoryActive
              ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-300/80 shadow-2xs dark:bg-white/10 dark:text-white dark:border-transparent'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-200'
          }`}
        >
          Tout l&apos;historique
        </button>

        <button
          onClick={handlePresetAugust1}
          className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${
            isAugustPresetActive
              ? 'bg-violet-100 text-violet-700 font-semibold dark:bg-violet-600/30 dark:text-violet-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-200'
          }`}
        >
          ⭐ 1er Août
        </button>

        <button
          onClick={handlePresetCurrentMonth}
          className="rounded-xl px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-200"
        >
          Mois en cours
        </button>

        <button
          onClick={handlePresetLast30Days}
          className="rounded-xl px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-200"
        >
          30 jours
        </button>

        <button
          onClick={handlePresetYTD}
          className="rounded-xl px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-200"
        >
          {currentYear}
        </button>
      </div>

      {/* DROITE : Date inputs combinés + Checkbox portée globale */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
        {/* Date inputs group */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition-colors dark:border-white/[0.06] dark:bg-black/30 dark:text-zinc-300">
          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-800 dark:text-zinc-200 outline-none"
            title="Date de début"
          />
          <span className="text-slate-400 dark:text-zinc-600">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-800 dark:text-zinc-200 outline-none"
            title="Date de fin (optionnelle)"
          />

          {(startDate || endDate) && (
            <button
              onClick={handleResetDates}
              className="ml-1 text-slate-400 transition hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              title="Effacer la plage manuelle"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Portée globale toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 select-none">
          <input
            type="checkbox"
            checked={applyToAllViews}
            onChange={(e) => onToggleApplyToAllViews(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 bg-white dark:border-white/20 dark:bg-black/50 accent-violet-600 cursor-pointer"
          />
          <span>Appliquer à tout</span>
        </label>
      </div>
    </div>
  );
}
