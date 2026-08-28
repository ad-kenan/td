'use client';

import { useMemo, useState } from 'react';
import { Challenge, Trader } from '@/lib/db';
import {
  Calendar,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Filter,
  TrendingDown,
  ReceiptText,
} from 'lucide-react';

interface InvestmentFilterBarProps {
  challenges: Challenge[];
  traders: Trader[];
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  applyToAllViews: boolean;
  onToggleApplyToAllViews: (val: boolean) => void;
}

export default function InvestmentFilterBar({
  challenges,
  traders,
  selectedTraderId,
  onSelectTrader,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  applyToAllViews,
  onToggleApplyToAllViews,
}: InvestmentFilterBarProps) {
  const [showDetails, setShowDetails] = useState(false);

  const traderMap = useMemo(() => {
    const map = new Map<string, string>();
    traders.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [traders]);

  // Determine current year for presets
  const currentYear = new Date().getFullYear();

  // Helper to extract daily negative amounts (accumulated daily debt/losses) for a challenge
  const getDailyLosses = (c: Challenge): number => {
    const dailyPhases = [
      c.phase2_day1,
      c.phase3_day2,
      c.phase4_funded_day1,
      c.phase5_funded_day2,
      c.phase6_funded_day3,
      c.phase7_funded_day4,
      c.phase8_funded_day5,
    ];

    return dailyPhases.reduce<number>((sum: number, phaseVal) => {
      if (typeof phaseVal === 'number' && phaseVal < 0) {
        return sum + Math.abs(phaseVal);
      }
      return sum;
    }, 0);
  };

  // Filter challenges based on the selected identity and the date range
  const targetedChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Identity filter
      if (selectedTraderId !== 'all' && c.trader_id !== selectedTraderId) {
        return false;
      }
      // Date start filter
      if (startDate && c.purchase_date < startDate) {
        return false;
      }
      // Date end filter
      if (endDate && c.purchase_date > endDate) {
        return false;
      }
      return true;
    });
  }, [challenges, selectedTraderId, startDate, endDate]);

  // Calculations:
  // 1. Pure challenge purchase price (prix pur du challenge)
  const totalChallengePrice = useMemo(() => {
    return targetedChallenges.reduce((sum, c) => sum + Math.abs(c.cost || 0), 0);
  }, [targetedChallenges]);

  // 2. Accumulated daily debt (dettes accumulées à chaque jour négatif, sans bénéfice)
  const totalDailyLosses = useMemo(() => {
    return targetedChallenges.reduce((sum, c) => sum + getDailyLosses(c), 0);
  }, [targetedChallenges]);

  // 3. Total Investment & Debt = Challenge Price + Daily Accumulated Debt
  const totalInvestmentWithDailyDebt = totalChallengePrice + totalDailyLosses;

  const countChallenges = targetedChallenges.length;
  const avgCostPerChallenge = countChallenges > 0 ? totalInvestmentWithDailyDebt / countChallenges : 0;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Presets handlers
  const handlePresetAugust1 = () => {
    const today = new Date();
    const aug1Current = new Date(today.getFullYear(), 7, 1);
    const targetYear = today >= aug1Current ? today.getFullYear() : today.getFullYear() - 1;
    onStartDateChange(`${targetYear}-08-01`);
    onEndDateChange('');
  };

  const handlePresetCurrentMonth = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    onStartDateChange(`${y}-${m}-01`);
    onEndDateChange('');
  };

  const handlePresetLast30Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onStartDateChange(`${y}-${m}-${day}`);
    onEndDateChange('');
  };

  const handlePresetYTD = () => {
    onStartDateChange(`${currentYear}-01-01`);
    onEndDateChange('');
  };

  const handleResetDates = () => {
    onStartDateChange('');
    onEndDateChange('');
  };

  const activeTraderName =
    selectedTraderId === 'all'
      ? 'Toutes les identités (Vue globale)'
      : traderMap.get(selectedTraderId) || 'Profil sélectionné';

  const isAugustPresetActive = startDate.endsWith('-08-01') && !endDate;

  return (
    <div className="glass-panel relative overflow-hidden rounded-[24px] border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-zinc-950/80 to-zinc-950 p-4 shadow-xl sm:p-5 lg:p-6 animate-fade-in">
      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-36 w-36 rounded-full bg-rose-500/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-800/70 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/40 text-amber-400 shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
                  Calculateur d'Investissement & Dette Cumulée
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/50 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  Prix Challenge + Dettes/Pertes Jour
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Calcule le montant investi incluant le <strong>prix d'achat du challenge</strong> + les <strong>dettes/pertes accumulées chaque jour</strong>, sans inclure les bénéfices.
              </p>
            </div>
          </div>

          {/* Identity & Global View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs">
              <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-zinc-500">Identité :</span>
              <select
                value={selectedTraderId}
                onChange={(e) => onSelectTrader(e.target.value)}
                className="bg-transparent font-semibold text-zinc-200 outline-none cursor-pointer"
              >
                <option value="all">Toutes les identités</option>
                {traders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle apply to all views */}
            <button
              onClick={() => onToggleApplyToAllViews(!applyToAllViews)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                applyToAllViews
                  ? 'border-amber-500/50 bg-amber-950/40 text-amber-300 shadow-sm'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Filtrer l'ensemble des KPIs, graphiques et grilles sur cette période"
            >
              <Filter className="h-3.5 w-3.5" />
              {applyToAllViews ? 'Filtre appliqué au Dashboard' : 'Filtrer tout le Dashboard'}
            </button>
          </div>
        </div>

        {/* Date Selectors & Presets */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] items-center">
          {/* Inputs Date */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-amber-400" />
                Depuis le (Date de début)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 text-xs font-medium text-zinc-100 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Jusqu'au (Optionnel)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 text-xs font-medium text-zinc-100 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={handleResetDates}
                className="self-end mb-0.5 inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                title="Réinitialiser la période"
              >
                <RotateCcw className="h-3 w-3" />
                Effacer
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            <span className="text-[11px] font-semibold text-zinc-400 mr-1">Raccourcis :</span>
            <button
              onClick={handlePresetAugust1}
              className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                isAugustPresetActive
                  ? 'border-amber-500 bg-amber-950/60 text-amber-200 font-semibold'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              ⭐ 1er Août
            </button>
            <button
              onClick={handlePresetCurrentMonth}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Mois en cours
            </button>
            <button
              onClick={handlePresetLast30Days}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              30 derniers jours
            </button>
            <button
              onClick={handlePresetYTD}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
            >
              Année {currentYear}
            </button>
            <button
              onClick={handleResetDates}
              className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                !startDate && !endDate
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              Tout l'historique
            </button>
          </div>
        </div>

        {/* Results Banner Cards - 4 Columns */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* 1. Total Investment & Global Debt */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-zinc-950/90 p-4 shadow-lg ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <span>Investissement Total & Dette</span>
              <span className="text-xs">💰</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono-numbers tracking-tight text-amber-300 sm:text-3xl">
                {formatCurrency(totalInvestmentWithDailyDebt)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Prix challenges ({formatCurrency(totalChallengePrice)}) + Dettes/Pertes ({formatCurrency(totalDailyLosses)})
            </p>
          </div>

          {/* 2. Pure Challenge Price */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <span>Prix des Challenges (Pur)</span>
              <ReceiptText className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-numbers tracking-tight text-zinc-100 sm:text-3xl">
                {formatCurrency(totalChallengePrice)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              {countChallenges} challenge{countChallenges > 1 ? 's' : ''} acheté{countChallenges > 1 ? 's' : ''} sur la période
            </p>
          </div>

          {/* 3. Daily Accumulated Losses / Debt */}
          <div className="rounded-2xl border border-rose-900/40 bg-rose-950/15 p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-300">
              <span>Dettes / Pertes Journalières</span>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-numbers tracking-tight text-rose-400 sm:text-3xl">
                {formatCurrency(totalDailyLosses)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Somme des pertes de chaque jour (hors gains)
            </p>
          </div>

          {/* 4. Average per challenge */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <span>Moyenne / Challenge</span>
              <CheckCircle2 className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-numbers tracking-tight text-zinc-100 sm:text-3xl">
                {formatCurrency(avgCostPerChallenge)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Prix d'achat + dettes jour par compte
            </p>
          </div>
        </div>

        {/* Toggle details button */}
        {countChallenges > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-900/60 hover:text-zinc-200"
            >
              <span>
                {showDetails
                  ? `Masquer le détail des ${countChallenges} challenge(s) inclus`
                  : `Voir le détail des ${countChallenges} challenge(s) inclus (Total: ${formatCurrency(totalInvestmentWithDailyDebt)})`}
              </span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDetails && (
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90 animate-fade-in">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Date d'achat</th>
                        <th className="px-3 py-2">Compte</th>
                        <th className="px-3 py-2">Identité</th>
                        <th className="px-3 py-2 text-right">Prix Challenge</th>
                        <th className="px-3 py-2 text-right">Dettes/Pertes Jour</th>
                        <th className="px-3 py-2 text-right text-amber-300">Total Investi (Dette+Prix)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {targetedChallenges.map((c) => {
                        const buyCost = Math.abs(c.cost || 0);
                        const dailyLoss = getDailyLosses(c);
                        const rowTotal = buyCost + dailyLoss;

                        return (
                          <tr key={c.id} className="hover:bg-zinc-900/40 transition">
                            <td className="px-3 py-2 font-mono text-zinc-400">
                              {formatDateDisplay(c.purchase_date)}
                            </td>
                            <td className="px-3 py-2 font-semibold text-zinc-100">
                              {c.account_name}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">
                                {traderMap.get(c.trader_id) || 'Inconnu'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-zinc-200">
                              {formatCurrency(buyCost)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-rose-400">
                              {dailyLoss > 0 ? formatCurrency(dailyLoss) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-300">
                              {formatCurrency(rowTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
