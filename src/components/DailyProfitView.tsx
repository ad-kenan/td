'use client';

import { useMemo, useState, Fragment } from 'react';
import { Challenge, Payout, Trader } from '@/lib/db';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Trophy,
  Coins,
  User,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';

interface DailyProfitViewProps {
  challenges: Challenge[];
  payouts: Payout[];
  traders: Trader[];
  selectedTraderId: string;
}

interface DailyRecord {
  date: string;
  positiveProfit: number;
  specialLoss: number;
  payoutAmount: number;
  netPnL: number;
  beneficeBrut: number;
  beneficeAjuste: number;
  challengeCount: number;
  payoutCount: number;
  traderNames: string[];
  challenges: Challenge[];
  payouts: Payout[];
  isZeroDay?: boolean;
}

// Helper: Get all weekday dates (Monday to Friday, excluding Saturday and Sunday) between start and end date
function getWeekdayDatesRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const [startY, startM, startD] = startDateStr.split('-').map(Number);
  const [endY, endM, endD] = endDateStr.split('-').map(Number);

  if (!startY || !startM || !startD || !endY || !endM || !endD) return [];

  const curr = new Date(Date.UTC(startY, startM - 1, startD));
  const end = new Date(Date.UTC(endY, endM - 1, endD));

  while (curr <= end) {
    const dayOfWeek = curr.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export default function DailyProfitView({
  challenges,
  payouts,
  traders,
  selectedTraderId,
}: DailyProfitViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all_weekdays' | 'active_only'>('all_weekdays');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDateExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Trader ID to Name map
  const traderMap = useMemo(() => {
    const map = new Map<string, string>();
    traders.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [traders]);

  // Helper: calculate total PnL for a single challenge
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

  // Group by date including Monday-Friday weekdays
  const { allRecords, activeOnlyRecords, weekdayCount } = useMemo(() => {
    const map = new Map<
      string,
      {
        positiveProfit: number;
        specialLoss: number;
        payoutAmount: number;
        netPnL: number;
        challengeCount: number;
        payoutCount: number;
        traderIds: Set<string>;
        challenges: Challenge[];
        payouts: Payout[];
      }
    >();

    const getOrCreate = (date: string) => {
      if (!map.has(date)) {
        map.set(date, {
          positiveProfit: 0,
          specialLoss: 0,
          payoutAmount: 0,
          netPnL: 0,
          challengeCount: 0,
          payoutCount: 0,
          traderIds: new Set<string>(),
          challenges: [],
          payouts: [],
        });
      }
      return map.get(date)!;
    };

    const recordedDates: string[] = [];

    // Process Challenges
    challenges.forEach((c) => {
      // Attribute challenge to closed_date if available (date where challenge completed), otherwise fallback to purchase_date
      const date = (c.closed_date && c.closed_date.trim()) ? c.closed_date.trim() : c.purchase_date;
      if (!date) return;

      recordedDates.push(date);
      const total = getChallengeTotal(c);
      const entry = getOrCreate(date);

      entry.netPnL += total;
      entry.challengeCount += 1;
      entry.traderIds.add(c.trader_id);
      entry.challenges.push(c);

      if (total > 0) {
        entry.positiveProfit += total;
      } else if (total < 0) {
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
          entry.specialLoss += total; // negative value
        }
      }
    });

    // Process Payouts
    payouts.forEach((p) => {
      const date = p.payout_date;
      if (!date) return;

      recordedDates.push(date);
      const entry = getOrCreate(date);
      entry.payoutAmount += p.amount || 0;
      entry.payoutCount += 1;
      entry.traderIds.add(p.trader_id);
      entry.payouts.push(p);
    });

    // Find date range
    let weekdaysRange: string[] = [];
    if (recordedDates.length > 0) {
      const sortedDates = [...recordedDates].sort();
      const minDate = sortedDates[0];
      const maxDate = sortedDates[sortedDates.length - 1];
      weekdaysRange = getWeekdayDatesRange(minDate, maxDate);
    }

    // Populate $0 entries for all weekdays where no data was logged
    weekdaysRange.forEach((wDate) => {
      getOrCreate(wDate);
    });

    // Convert map to sorted array (descending date)
    const listAll: DailyRecord[] = Array.from(map.entries()).map(([date, d]) => {
      const beneficeBrut = d.positiveProfit;
      const beneficeAjuste = d.positiveProfit + d.specialLoss - d.payoutAmount;
      const traderNames = Array.from(d.traderIds).map((id) => traderMap.get(id) || 'Profil');
      const isZeroDay = d.challengeCount === 0 && d.payoutCount === 0;

      return {
        date,
        positiveProfit: d.positiveProfit,
        specialLoss: d.specialLoss,
        payoutAmount: d.payoutAmount,
        netPnL: d.netPnL,
        beneficeBrut,
        beneficeAjuste,
        challengeCount: d.challengeCount,
        payoutCount: d.payoutCount,
        traderNames,
        challenges: d.challenges,
        payouts: d.payouts,
        isZeroDay,
      };
    });

    const sortedAll = listAll.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const activeOnly = sortedAll.filter((r) => !r.isZeroDay);

    return {
      allRecords: sortedAll,
      activeOnlyRecords: activeOnly,
      weekdayCount: weekdaysRange.length || activeOnly.length,
    };
  }, [challenges, payouts, traderMap]);

  // Current display list based on filter
  const currentRecords = filterMode === 'all_weekdays' ? allRecords : activeOnlyRecords;

  // Overall Statistics
  const stats = useMemo(() => {
    const totalProfitBrut = allRecords.reduce((sum, r) => sum + r.beneficeBrut, 0);
    const totalProfitAjuste = allRecords.reduce((sum, r) => sum + r.beneficeAjuste, 0);

    const totalDaysToDivide = weekdayCount > 0 ? weekdayCount : activeOnlyRecords.length;

    const avgProfitBrutPerDay = totalDaysToDivide > 0 ? totalProfitBrut / totalDaysToDivide : 0;
    const avgProfitAjustePerDay = totalDaysToDivide > 0 ? totalProfitAjuste / totalDaysToDivide : 0;

    const bestDayRecord = allRecords.reduce<DailyRecord | null>((best, current) => {
      if (!best || current.beneficeBrut > best.beneficeBrut) {
        return current;
      }
      return best;
    }, null);

    return {
      totalTradingDays: totalDaysToDivide,
      activeDaysCount: activeOnlyRecords.length,
      totalProfitBrut,
      totalProfitAjuste,
      avgProfitBrutPerDay,
      avgProfitAjustePerDay,
      bestDayRecord,
    };
  }, [allRecords, activeOnlyRecords, weekdayCount]);

  // Filtered list for search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return currentRecords;
    const q = searchTerm.toLowerCase();
    return currentRecords.filter(
      (r) =>
        r.date.includes(q) ||
        r.traderNames.some((name) => name.toLowerCase().includes(q))
    );
  }, [currentRecords, searchTerm]);

  // Chart data sorted chronologically
  const chartData = useMemo(() => {
    return [...allRecords]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        beneficeBrut: r.beneficeBrut,
        beneficeAjuste: r.beneficeAjuste,
        netPnL: r.netPnL,
      }));
  }, [allRecords]);

  // Currency Formatter
  const formatVal = (val: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `-${formatted}` : formatted;
  };

  const formatDateLabel = (val: string) => {
    if (!val) return '';
    const [year, month, day] = val.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const formatDateTick = (val: string) => {
    if (!val) return '';
    const [year, month, day] = val.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* TOP 4 DAILY KPI CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Moyenne / Jour Ouvré (Brut) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Moyenne / Jour Ouvré (Brut)
              </span>
              <h3 className="mt-1 font-mono text-xl font-bold tracking-tight text-emerald-400 sm:text-2xl">
                {formatVal(stats.avgProfitBrutPerDay)}
                <span className="ml-1 text-xs font-semibold text-emerald-500/80">/j</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Sur {stats.totalTradingDays} jours ouvrés (Lun-Ven)
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-950/30 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 2: Moyenne / Jour Ouvré (Ajusté) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Moyenne / Jour Ouvré (Ajusté)
              </span>
              <h3 className={`mt-1 font-mono text-xl font-bold tracking-tight sm:text-2xl ${
                stats.avgProfitAjustePerDay >= 0 ? 'text-teal-400' : 'text-rose-400'
              }`}>
                {stats.avgProfitAjustePerDay >= 0 ? '+' : ''}{formatVal(stats.avgProfitAjustePerDay)}
                <span className="ml-1 text-xs font-semibold text-teal-500/80">/j</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Après retraits et pertes partielles
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-950/30 text-teal-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Jours Ouvrés */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Total Jours Ouvrés
              </span>
              <h3 className="mt-1 font-mono text-xl font-bold tracking-tight text-white sm:text-2xl">
                {stats.totalTradingDays}{' '}
                <span className="text-xs font-semibold text-zinc-400">jours</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                {stats.activeDaysCount} jours avec activité · Lun-Ven
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-300">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 4: Meilleur Jour */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 transition hover:border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Meilleur Jour
              </span>
              <h3 className="mt-1 font-mono text-xl font-bold tracking-tight text-amber-400 sm:text-2xl">
                {stats.bestDayRecord ? `+${formatVal(stats.bestDayRecord.beneficeBrut)}` : '$0.00'}
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500 truncate max-w-[200px]">
                {stats.bestDayRecord ? formatDateLabel(stats.bestDayRecord.date) : 'Aucun record'}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-950/30 text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* DAILY EVOLUTION BAR CHART */}
      {chartData.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
                Évolution des Bénéfices par Jour Ouvré
              </h4>
              <p className="text-[11px] text-zinc-400">
                Calculé sur l&apos;ensemble des {stats.totalTradingDays} jours ouvrés (hors week-ends).
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1 text-emerald-300 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Bénéfice Brut</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-teal-500/20 bg-teal-950/30 px-2.5 py-1 text-teal-300 font-medium">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                <span>Bénéfice Ajusté</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full font-mono text-xs lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                  interval="preserveStartEnd"
                  tickFormatter={formatDateTick}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${formatVal(v)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121318',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fafafa',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const label = name === 'beneficeBrut' ? 'Bénéfice Brut' : 'Bénéfice Ajusté';
                    return [formatVal(Number(value || 0)), label];
                  }}
                  labelFormatter={(label) => `Date : ${formatDateLabel(String(label))}`}
                />
                <Bar dataKey="beneficeBrut" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-brut-${index}`}
                      fill={entry.beneficeBrut > 0 ? '#10b981' : '#27272a'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="beneficeAjuste" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-ajuste-${index}`}
                      fill={entry.beneficeAjuste >= 0 ? '#14b8a6' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* DAILY RECORDS LIST / TABLE */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
        {/* TOOLBAR */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
              Historique Journalier
            </h4>
            <p className="text-[11px] text-zinc-400">
              Détail jour par jour sur l&apos;ensemble des jours ouvrés ({filteredRecords.length} jour{filteredRecords.length > 1 ? 's' : ''})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1">
              <button
                onClick={() => setFilterMode('all_weekdays')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterMode === 'all_weekdays'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Tous les jours ({allRecords.length})</span>
              </button>
              <button
                onClick={() => setFilterMode('active_only')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterMode === 'active_only'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Actifs uniquement ({activeOnlyRecords.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher une date ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-3 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-violet-500/50"
              />
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
            <Calendar className="mb-2 h-6 w-6 text-zinc-600" />
            <p className="text-sm font-semibold text-zinc-300">Aucune donnée disponible</p>
            <p className="mt-1 text-xs text-zinc-500">
              Les résultats s&apos;afficheront dès l&apos;enregistrement de challenges ou retraits.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#121318]/90 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-4 py-3">Date (Lun-Ven)</th>
                    {selectedTraderId === 'all' && <th className="px-4 py-3">Profil(s)</th>}
                    <th className="px-4 py-3">Activité</th>
                    <th className="px-4 py-3 text-right">Bénéfice Brut</th>
                    <th className="px-4 py-3 text-right">Retraits / Pertes</th>
                    <th className="px-4 py-3 text-right">Bénéfice Ajusté</th>
                    <th className="px-4 py-3 text-right">PnL Net Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredRecords.map((rec) => {
                    const isExpanded = expandedDates.has(rec.date);
                    const hasItems = rec.challengeCount > 0 || rec.payoutCount > 0;

                    return (
                      <Fragment key={rec.date}>
                        <tr
                          onClick={() => hasItems && toggleDateExpanded(rec.date)}
                          className={`transition ${hasItems ? 'cursor-pointer hover:bg-white/[0.04]' : ''} ${
                            rec.isZeroDay
                              ? 'bg-black/10 text-zinc-500 opacity-60 hover:opacity-100 hover:bg-white/[0.02]'
                              : ''
                          } ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                        >
                          <td className="px-4 py-3 font-medium text-zinc-200">
                            <div className="flex items-center gap-2">
                              {hasItems ? (
                                <span className="text-zinc-500 hover:text-zinc-200 transition">
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-violet-400" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              ) : (
                                <span className="w-3.5" />
                              )}
                              <span className="font-mono">{formatDateLabel(rec.date)}</span>
                            </div>
                          </td>

                          {selectedTraderId === 'all' && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-zinc-500" />
                                <span className="text-zinc-400 text-xs truncate max-w-[150px]">
                                  {rec.traderNames.length > 0 ? rec.traderNames.join(', ') : '-'}
                                </span>
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3 text-zinc-400">
                            {rec.isZeroDay ? (
                              <span className="text-zinc-600 italic">Aucune activité ($0)</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                {rec.challengeCount > 0 && `${rec.challengeCount} ch.`}
                                {rec.challengeCount > 0 && rec.payoutCount > 0 && ' · '}
                                {rec.payoutCount > 0 && `${rec.payoutCount} retr.`}
                                {hasItems && (
                                  <span className="ml-1 text-[10px] text-zinc-500 font-sans">
                                    {isExpanded ? '(fermer)' : '(détail)'}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            {rec.beneficeBrut > 0 ? `+${formatVal(rec.beneficeBrut)}` : '$0.00'}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-medium text-amber-400">
                            {rec.payoutAmount > 0 || rec.specialLoss < 0
                              ? `-${formatVal(rec.payoutAmount + Math.abs(rec.specialLoss))}`
                              : '$0.00'}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${
                              rec.beneficeAjuste > 0
                                ? 'text-teal-400'
                                : rec.beneficeAjuste < 0
                                ? 'text-rose-400'
                                : 'text-zinc-500'
                            }`}
                          >
                            {rec.beneficeAjuste > 0
                              ? `+${formatVal(rec.beneficeAjuste)}`
                              : formatVal(rec.beneficeAjuste)}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-mono font-semibold ${
                              rec.netPnL > 0
                                ? 'text-zinc-200'
                                : rec.netPnL < 0
                                ? 'text-rose-400/90'
                                : 'text-zinc-600'
                            }`}
                          >
                            {rec.netPnL > 0 ? `+${formatVal(rec.netPnL)}` : formatVal(rec.netPnL)}
                          </td>
                        </tr>

                        {isExpanded && hasItems && (
                          <tr className="bg-black/40 border-b border-white/[0.06]">
                            <td colSpan={selectedTraderId === 'all' ? 7 : 6} className="px-4 py-3">
                              <div className="rounded-xl border border-white/[0.06] bg-[#0d0e12] p-3.5 space-y-3">
                                {rec.challenges.length > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                        Challenges de cette journée ({rec.challenges.length})
                                      </p>
                                      <span className="text-[10px] text-zinc-500">
                                        Attribué selon clôture (ou achat)
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                      {rec.challenges.map((c) => {
                                        const tot = getChallengeTotal(c);
                                        const isPos = tot > 0;
                                        return (
                                          <div
                                            key={c.id}
                                            className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                                              isPos
                                                ? 'border-emerald-500/20 bg-emerald-950/20'
                                                : 'border-white/[0.06] bg-black/30'
                                            }`}
                                          >
                                            <div className="min-w-0 pr-2">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-zinc-100 truncate">
                                                  {c.account_name}
                                                </span>
                                                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300">
                                                  {traderMap.get(c.trader_id) || 'Profil'}
                                                </span>
                                              </div>
                                              <div className="mt-0.5 text-[11px] text-zinc-500">
                                                Acheté le {c.purchase_date}
                                                {c.closed_date && (
                                                  <span className="text-emerald-400 font-medium">
                                                    {' '}· Clôturé le {c.closed_date}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div
                                                className={`font-mono font-bold text-sm ${
                                                  isPos ? 'text-emerald-400' : 'text-zinc-400'
                                                }`}
                                              >
                                                {isPos ? `+${formatVal(tot)}` : formatVal(tot)}
                                              </div>
                                              {isPos ? (
                                                <span className="inline-flex items-center rounded-md bg-emerald-950/80 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                                                  Bénéfice Brut
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-zinc-500">Non positif</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {rec.payouts.length > 0 && (
                                  <div className="border-t border-white/[0.06] pt-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                                      Retraits personnels ({rec.payouts.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {rec.payouts.map((p) => (
                                        <div
                                          key={p.id}
                                          className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-300"
                                        >
                                          <span className="font-mono font-bold">-{formatVal(p.amount)}</span>
                                          <span className="text-[10px] text-amber-400/80">
                                            ({traderMap.get(p.trader_id) || 'Profil'})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
