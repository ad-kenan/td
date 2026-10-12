'use client';

import React, { useMemo } from 'react';
import { Challenge, Payout } from '@/lib/db';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownToLine,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface KPICardsProps {
  challenges: Challenge[];
  payouts?: Payout[];
  startDate?: string;
  endDate?: string;
}

export default function KPICards({ challenges, payouts = [] }: KPICardsProps) {
  // 1. Debt (Dette Phase 1) = Sum of absolute values of cost
  const totalDebt = useMemo(() => {
    return challenges.reduce((sum, c) => sum + Math.abs(c.cost || 0), 0);
  }, [challenges]);

  // 2. Personal Payouts = Sum of all personal payouts
  const totalPayouts = useMemo(() => {
    return payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payouts]);

  // Helper: calculate total PnL for a challenge
  const getChallengeTotal = (c: Challenge) => {
    return (
      (c.cost || 0) +
      (c.phase2_day1 || 0) +
      (c.phase3_day2 || 0) +
      (c.phase4_funded_day1 || 0) +
      (c.phase5_funded_day2 || 0) +
      (c.phase6_funded_day3 || 0) +
      (c.phase7_funded_day4 || 0) +
      (c.phase8_funded_day5 || 0) +
      (c.phase9_payout || 0)
    );
  };

  const challengeTotals = useMemo(() => challenges.map(getChallengeTotal), [challenges]);

  // 3. Total Benefices = Sum of positive challenge totals
  const totalBenefices = useMemo(() => {
    return challengeTotals.filter((t) => t > 0).reduce((sum, t) => sum + t, 0);
  }, [challengeTotals]);

  // 4. Total Pertes = Sum of negative challenge totals
  const totalPertes = useMemo(() => {
    return challengeTotals.filter((t) => t < 0).reduce((sum, t) => sum + t, 0);
  }, [challengeTotals]);

  // 5. Net PnL = Total Benefices + Total Pertes (THE DOMINANT METRIC)
  const netPnL = totalBenefices + totalPertes;

  // 6. Comptes Actifs = challenges whose cumulative total is still negative (cost not yet recovered)
  const activeAccounts = useMemo(() => {
    return challengeTotals.filter((t) => t < 0).length;
  }, [challengeTotals]);

  // 7. Bénéfices Ajustés = Total Benefices - absolute totals of negative challenges that have at least one positive phase value - totalPayouts
  const specialChallengesTotalLoss = useMemo(() => {
    return challenges.reduce((sum, c) => {
      const total = getChallengeTotal(c);
      if (total >= 0) return sum;

      const hasPositivePhase = [
        c.phase2_day1,
        c.phase3_day2,
        c.phase4_funded_day1,
        c.phase5_funded_day2,
        c.phase6_funded_day3,
        c.phase7_funded_day4,
        c.phase8_funded_day5,
        c.phase9_payout,
      ].some((val) => val !== null && val > 0);

      if (hasPositivePhase) {
        return sum + total;
      }
      return sum;
    }, 0);
  }, [challenges]);

  const adjustedBenefices = totalBenefices + specialChallengesTotalLoss - totalPayouts;

  // 8. Daily losses & Investment from challenges
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

  const totalPurchaseCost = useMemo(() => {
    return challenges.reduce((sum, c) => sum + Math.abs(c.cost || 0), 0);
  }, [challenges]);

  const totalDailyLosses = useMemo(() => {
    return challenges.reduce((sum, c) => sum + getDailyLosses(c), 0);
  }, [challenges]);

  const totalInvestmentWithDailyDebt = totalPurchaseCost + totalDailyLosses;
  const countChallenges = challenges.length;
  const avgCostPerChallenge = countChallenges > 0 ? totalInvestmentWithDailyDebt / countChallenges : 0;

  // Format currency helpers
  const formatCurrency = (val: number, showSign = false) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));

    if (val === 0) return formatted;
    if (showSign) {
      return val > 0 ? `+${formatted}` : `-${formatted}`;
    }
    return val < 0 ? `-${formatted}` : formatted;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* NIVEAU 1 — CARTE HERO PILIER : PnL NET GLOBAL CONSOLIDÉ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1015] p-5 shadow-xl sm:p-6">
        {/* Subtle top edge glow */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${
            netPnL >= 0
              ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent'
              : 'bg-gradient-to-r from-transparent via-rose-500/50 to-transparent'
          }`}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Main Net PnL number */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                PnL Net Consolidé
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  netPnL >= 0
                    ? 'border border-emerald-500/20 bg-emerald-950/40 text-emerald-300'
                    : 'border border-rose-500/20 bg-rose-950/40 text-rose-300'
                }`}
              >
                {netPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {netPnL >= 0 ? 'Bénéficiaire' : 'Déficitaire'}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-3">
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight ${
                  netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(netPnL, true)}
              </h1>
            </div>
          </div>

          {/* Integrated Sub-metrics row: Bénéfices Bruts | Bénéfices Ajustés | Pertes */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 border-t border-white/[0.06] pt-3 lg:border-t-0 lg:pt-0">
            {/* Bénéfices bruts */}
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Bénéfices Bruts
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                +{formatCurrency(totalBenefices)}
              </span>
            </div>

            <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

            {/* Bénéfices ajustés */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Bénéfices Ajustés
                </span>
                <span title="Bénéfices après déduction des pertes avec phases positives et des payouts">
                  <HelpCircle className="h-2.5 w-2.5 text-zinc-500" />
                </span>
              </div>
              <span
                className={`text-base sm:text-lg font-bold font-mono ${
                  adjustedBenefices >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(adjustedBenefices, true)}
              </span>
            </div>

            <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

            {/* Pertes */}
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Pertes Totales
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-rose-400">
                {formatCurrency(totalPertes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NIVEAU 2 — 4 CARTES SECONDAIRES HOMOGÈNES */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Investissement Total & Dette */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Investissement Total &amp; Dette</span>
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            {formatCurrency(totalInvestmentWithDailyDebt)}
          </div>
          <div className="mt-2 space-y-0.5 border-t border-white/[0.05] pt-2 text-[11px] text-zinc-400">
            <div className="flex justify-between">
              <span>Prix des challenges :</span>
              <span className="font-mono text-zinc-300">{formatCurrency(totalPurchaseCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Dettes / Pertes jour :</span>
              <span className="font-mono text-rose-400">{formatCurrency(totalDailyLosses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Moyenne / challenge :</span>
              <span className="font-mono text-zinc-300">{formatCurrency(avgCostPerChallenge)}</span>
            </div>
          </div>
        </div>

        {/* 2. Retraits Personnels (Payouts) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Retraits Personnels</span>
            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalPayouts)}
          </div>
          <div className="mt-2 border-t border-white/[0.05] pt-2 text-[11px] text-zinc-400">
            <p>{payouts.length} virement{payouts.length > 1 ? 's' : ''} de payout perçu{payouts.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* 3. Dette Globale (Somme coûts Phase 1) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Dette Cumulée (Achats)</span>
            <Activity className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-rose-400">
            -{formatCurrency(totalDebt)}
          </div>
          <div className="mt-2 border-t border-white/[0.05] pt-2 text-[11px] text-zinc-400">
            <p>Somme des coûts initiaux de Phase 1</p>
          </div>
        </div>

        {/* 4. Comptes Actifs */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Comptes Actifs</span>
            <Layers className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            <span>{activeAccounts}</span>
            <span className="text-sm font-normal text-zinc-500">/ {challenges.length}</span>
          </div>
          <div className="mt-2 border-t border-white/[0.05] pt-2 text-[11px] text-zinc-400">
            <p>Challenges dont le coût n&apos;est pas encore amorti</p>
          </div>
        </div>
      </div>
    </div>
  );
}
