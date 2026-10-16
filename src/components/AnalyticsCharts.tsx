'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Challenge } from '@/lib/db';
import { ArrowUpRight, ArrowDownRight, BarChart3, LineChart } from 'lucide-react';

interface AnalyticsChartsProps {
  challenges: Challenge[];
}

export default function AnalyticsCharts({ challenges }: AnalyticsChartsProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = !mounted || resolvedTheme === 'dark';

  // 1. Calculate challenge totals and sort chronologically
  const sortedData = useMemo(() => {
    return [...challenges]
      .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
      .map((c) => {
        const total =
          (c.cost || 0) +
          (c.phase2_day1 || 0) +
          (c.phase3_day2 || 0) +
          (c.phase4_funded_day1 || 0) +
          (c.phase5_funded_day2 || 0) +
          (c.phase6_funded_day3 || 0) +
          (c.phase7_funded_day4 || 0) +
          (c.phase8_funded_day5 || 0) +
          (c.phase9_payout || 0);

        return {
          id: c.id,
          name: c.account_name.split('-').pop() || c.account_name,
          fullName: c.account_name,
          date: c.purchase_date,
          pnl: total,
          cost: Math.abs(c.cost || 0),
        };
      });
  }, [challenges]);

  // 2. Generate running equity curve
  const equityCurveData = useMemo(() => {
    const data: Array<(typeof sortedData)[number] & { equity: number }> = [];
    let runningSum = 0;
    for (const d of sortedData) {
      runningSum += d.pnl;
      data.push({
        ...d,
        equity: runningSum,
      });
    }
    return data;
  }, [sortedData]);

  // 3. Format Currency
  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTick = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  const formatDateLabel = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const netPnL = sortedData.reduce((sum, item) => sum + item.pnl, 0);
  const profitableAccounts = sortedData.filter((item) => item.pnl > 0).length;

  const chartTheme = {
    grid: isDark ? '#1f2028' : '#e2e8f0',
    refLine: isDark ? '#3f3f46' : '#cbd5e1',
    axisText: isDark ? '#71717a' : '#64748b',
    tooltipBg: isDark ? '#121318' : '#ffffff',
    tooltipBorder: isDark ? '#27272a' : '#e2e8f0',
    tooltipColor: isDark ? '#fafafa' : '#0f172a',
    tooltipShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.7)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  };

  if (challenges.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs transition-colors dark:border-white/[0.05] dark:bg-[#0d0e12]">
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
            <LineChart className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Courbe d&apos;équité cumulative</h4>
          <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500 dark:text-zinc-500">
            Enregistrez vos challenges pour visualiser l&apos;évolution de votre capital cumulé.
          </p>
        </div>

        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs transition-colors dark:border-white/[0.05] dark:bg-[#0d0e12]">
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Performance par compte</h4>
          <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500 dark:text-zinc-500">
            La distribution de vos gains et pertes par challenge apparaîtra ici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* 1. COURBE D'ÉQUITÉ CUMULATIVE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#0d0e12] dark:hover:border-white/10 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-zinc-100">
              Courbe d&apos;équité cumulative
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Évolution chronologique de votre PnL net cumulé.</p>
          </div>

          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono font-bold ${
              netPnL >= 0
                ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {netPnL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{netPnL >= 0 ? `+${formatVal(netPnL)}` : formatVal(netPnL)}</span>
          </div>
        </div>

        <div className="h-60 w-full font-mono lg:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurveData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGlowGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="equityGlowRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <ReferenceLine y={0} stroke={chartTheme.refLine} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke={chartTheme.axisText}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                interval="preserveStartEnd"
                tickFormatter={formatDateTick}
              />
              <YAxis
                stroke={chartTheme.axisText}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${formatVal(v)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltipBg,
                  borderColor: chartTheme.tooltipBorder,
                  borderRadius: '12px',
                  color: chartTheme.tooltipColor,
                  fontSize: '12px',
                  boxShadow: chartTheme.tooltipShadow,
                }}
                formatter={(value: unknown) => [formatVal(Number(value || 0)), 'Équité Cumulée']}
                labelFormatter={(label) => `Date d'achat : ${formatDateLabel(String(label))}`}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={netPnL >= 0 ? '#10b981' : '#f43f5e'}
                strokeWidth={2}
                fillOpacity={1}
                fill={netPnL >= 0 ? 'url(#equityGlowGreen)' : 'url(#equityGlowRed)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. PERFORMANCE PAR COMPTE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#0d0e12] dark:hover:border-white/10 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-zinc-100">
              Performance par compte
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Résultat net final individuel par challenge.</p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>{profitableAccounts}/{sortedData.length} rentables</span>
          </div>
        </div>

        <div className="h-60 w-full font-mono lg:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <ReferenceLine y={0} stroke={chartTheme.refLine} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke={chartTheme.axisText}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={18}
                interval="preserveStartEnd"
                tickFormatter={(value) => String(value).slice(-6)}
              />
              <YAxis
                stroke={chartTheme.axisText}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${formatVal(v)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltipBg,
                  borderColor: chartTheme.tooltipBorder,
                  borderRadius: '12px',
                  color: chartTheme.tooltipColor,
                  fontSize: '12px',
                  boxShadow: chartTheme.tooltipShadow,
                }}
                formatter={(value: unknown) => [formatVal(Number(value || 0)), 'PnL Net']}
                labelFormatter={(label, items) => {
                  const item = items[0]?.payload;
                  return item ? `Compte : ${item.fullName}` : `Compte : ${label}`;
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
