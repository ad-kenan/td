'use client';

import { useMemo, useState } from 'react';
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
import { Calendar, TrendingUp, Trophy, Coins, User } from 'lucide-react';

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
}

export default function DailyProfitView({
  challenges,
  payouts,
  traders,
  selectedTraderId,
}: DailyProfitViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

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

  // Group by date
  const dailyRecords = useMemo(() => {
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
        });
      }
      return map.get(date)!;
    };

    // Process Challenges
    challenges.forEach((c) => {
      const date = c.purchase_date;
      if (!date) return;

      const total = getChallengeTotal(c);
      const entry = getOrCreate(date);

      entry.netPnL += total;
      entry.challengeCount += 1;
      entry.traderIds.add(c.trader_id);

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

      const entry = getOrCreate(date);
      entry.payoutAmount += p.amount || 0;
      entry.payoutCount += 1;
      entry.traderIds.add(p.trader_id);
    });

    // Convert map to sorted array (descending date)
    const list: DailyRecord[] = Array.from(map.entries()).map(([date, d]) => {
      const beneficeBrut = d.positiveProfit;
      const beneficeAjuste = d.positiveProfit + d.specialLoss - d.payoutAmount;
      const traderNames = Array.from(d.traderIds).map((id) => traderMap.get(id) || 'Profil');

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
      };
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [challenges, payouts, traderMap]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalActiveDays = dailyRecords.length;
    const totalProfitBrut = dailyRecords.reduce((sum, r) => sum + r.beneficeBrut, 0);
    const totalProfitAjuste = dailyRecords.reduce((sum, r) => sum + r.beneficeAjuste, 0);

    const avgProfitBrutPerDay = totalActiveDays > 0 ? totalProfitBrut / totalActiveDays : 0;
    const avgProfitAjustePerDay = totalActiveDays > 0 ? totalProfitAjuste / totalActiveDays : 0;

    const bestDayRecord = dailyRecords.reduce<DailyRecord | null>((best, current) => {
      if (!best || current.beneficeBrut > best.beneficeBrut) {
        return current;
      }
      return best;
    }, null);

    return {
      totalActiveDays,
      totalProfitBrut,
      totalProfitAjuste,
      avgProfitBrutPerDay,
      avgProfitAjustePerDay,
      bestDayRecord,
    };
  }, [dailyRecords]);

  // Filtered list for search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return dailyRecords;
    const q = searchTerm.toLowerCase();
    return dailyRecords.filter(
      (r) =>
        r.date.includes(q) ||
        r.traderNames.some((name) => name.toLowerCase().includes(q))
    );
  }, [dailyRecords, searchTerm]);

  // Chart data sorted chronologically
  const chartData = useMemo(() => {
    return [...dailyRecords]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        beneficeBrut: r.beneficeBrut,
        beneficeAjuste: r.beneficeAjuste,
        netPnL: r.netPnL,
      }));
  }, [dailyRecords]);

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
    <div className="space-y-5">
      {/* Top 4 Daily KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Moyenne / Jour (Brut) */}
        <div className="glass-card group relative overflow-hidden rounded-[20px] border border-emerald-800/50 p-4 transition-all duration-300 hover:border-emerald-500/30">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent opacity-60 blur-2xl transition-all duration-500 group-hover:scale-125" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                Moyenne / Jour (Brut)
              </span>
              <h3 className="mt-1 font-mono-numbers text-xl font-bold tracking-tight text-emerald-400 sm:text-2xl">
                {formatVal(stats.avgProfitBrutPerDay)}
                <span className="ml-1 text-xs font-semibold text-emerald-500/80">/j</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Total brut : {formatVal(stats.totalProfitBrut)}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 2: Moyenne / Jour (Ajusté) */}
        <div className="glass-card group relative overflow-hidden rounded-[20px] border border-teal-800/50 p-4 transition-all duration-300 hover:border-teal-500/30">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br from-teal-500/10 to-transparent opacity-60 blur-2xl transition-all duration-500 group-hover:scale-125" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                Moyenne / Jour (Ajusté)
              </span>
              <h3 className="mt-1 font-mono-numbers text-xl font-bold tracking-tight text-teal-400 sm:text-2xl">
                {formatVal(stats.avgProfitAjustePerDay)}
                <span className="ml-1 text-xs font-semibold text-teal-500/80">/j</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Après retraits et pertes partielles
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-900/40 bg-teal-950/30 text-teal-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 3: Jours Actifs */}
        <div className="glass-card group relative overflow-hidden rounded-[20px] border border-sky-800/50 p-4 transition-all duration-300 hover:border-sky-500/30">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br from-sky-500/10 to-transparent opacity-60 blur-2xl transition-all duration-500 group-hover:scale-125" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                Jours d&apos;activité
              </span>
              <h3 className="mt-1 font-mono-numbers text-xl font-bold tracking-tight text-sky-400 sm:text-2xl">
                {stats.totalActiveDays} <span className="text-xs font-semibold text-sky-500/80">jours</span>
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Dates avec challenges ou retraits
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-900/40 bg-sky-950/30 text-sky-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Card 4: Meilleur Jour */}
        <div className="glass-card group relative overflow-hidden rounded-[20px] border border-amber-800/50 p-4 transition-all duration-300 hover:border-amber-500/30">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent opacity-60 blur-2xl transition-all duration-500 group-hover:scale-125" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                Meilleur Jour
              </span>
              <h3 className="mt-1 font-mono-numbers text-xl font-bold tracking-tight text-amber-400 sm:text-2xl">
                {stats.bestDayRecord ? formatVal(stats.bestDayRecord.beneficeBrut) : '$0.00'}
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                {stats.bestDayRecord ? formatDateLabel(stats.bestDayRecord.date) : 'Aucun record'}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-900/40 bg-amber-950/30 text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Evolution Bar Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
                Évolution des Bénéfices par Jour
              </h4>
              <p className="text-xs text-zinc-500">
                Comparaison entre bénéfice brut et bénéfice ajusté au quotidien.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <span>Bénéfice Brut</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-teal-400" />
                <span>Bénéfice Ajusté</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full font-mono-numbers lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
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
                    backgroundColor: '#0c0c0e',
                    borderColor: '#1c1c24',
                    borderRadius: '12px',
                    color: '#fafafa',
                    fontSize: '12px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const label = name === 'beneficeBrut' ? 'Bénéfice Brut' : 'Bénéfice Ajusté';
                    return [formatVal(Number(value || 0)), label];
                  }}
                  labelFormatter={(label) => `Date: ${formatDateLabel(String(label))}`}
                />
                <Bar dataKey="beneficeBrut" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-brut-${index}`}
                      fill={entry.beneficeBrut > 0 ? '#34d399' : '#27272a'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="beneficeAjuste" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-ajuste-${index}`}
                      fill={entry.beneficeAjuste >= 0 ? '#2dd4bf' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Records List / Table */}
      <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
              Historique Journalier
            </h4>
            <p className="text-xs text-zinc-500">
              Détail des résultats par date ({filteredRecords.length} jour{filteredRecords.length > 1 ? 's' : ''})
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Rechercher une date ou un nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-800"
            />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 p-6 text-center">
            <Calendar className="mb-2 h-6 w-6 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">Aucune donnée journalière disponible</p>
            <p className="mt-1 text-xs text-zinc-600">
              Les résultats s&apos;afficheront dès l&apos;ajout de vos premiers challenges ou retraits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-numbers">
              <thead>
                <tr className="border-b border-zinc-800/70 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  <th className="pb-3 pl-2">Date</th>
                  {selectedTraderId === 'all' && <th className="pb-3">Profil(s)</th>}
                  <th className="pb-3">Activité</th>
                  <th className="pb-3 text-right">Bénéfice Brut</th>
                  <th className="pb-3 text-right">Retraits / Pertes</th>
                  <th className="pb-3 text-right">Bénéfice Ajusté</th>
                  <th className="pb-3 pr-2 text-right">PnL Net Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredRecords.map((rec) => (
                  <tr key={rec.date} className="transition-colors hover:bg-zinc-900/40">
                    <td className="py-3.5 pl-2 font-semibold text-zinc-200">
                      {formatDateLabel(rec.date)}
                    </td>

                    {selectedTraderId === 'all' && (
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-zinc-500" />
                          <span className="text-zinc-400 font-sans text-xs">
                            {rec.traderNames.join(', ')}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 text-zinc-500 font-sans text-xs">
                      {rec.challengeCount > 0 && `${rec.challengeCount} challenge${rec.challengeCount > 1 ? 's' : ''}`}
                      {rec.challengeCount > 0 && rec.payoutCount > 0 && ' · '}
                      {rec.payoutCount > 0 && `${rec.payoutCount} retrait${rec.payoutCount > 1 ? 's' : ''}`}
                    </td>

                    <td className="py-3.5 text-right font-bold text-emerald-400">
                      {rec.beneficeBrut > 0 ? `+${formatVal(rec.beneficeBrut)}` : '$0.00'}
                    </td>

                    <td className="py-3.5 text-right font-medium text-amber-400">
                      {rec.payoutAmount > 0 || rec.specialLoss < 0
                        ? `-${formatVal(rec.payoutAmount + Math.abs(rec.specialLoss))}`
                        : '$0.00'}
                    </td>

                    <td
                      className={`py-3.5 text-right font-bold ${
                        rec.beneficeAjuste >= 0 ? 'text-teal-400' : 'text-rose-400'
                      }`}
                    >
                      {rec.beneficeAjuste >= 0
                        ? `+${formatVal(rec.beneficeAjuste)}`
                        : formatVal(rec.beneficeAjuste)}
                    </td>

                    <td
                      className={`py-3.5 pr-2 text-right font-semibold ${
                        rec.netPnL >= 0 ? 'text-zinc-300' : 'text-rose-400/90'
                      }`}
                    >
                      {rec.netPnL >= 0 ? `+${formatVal(rec.netPnL)}` : formatVal(rec.netPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
