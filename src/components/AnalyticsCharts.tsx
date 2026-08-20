'use client';

import { useMemo } from 'react';
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
} from 'recharts';
import { Challenge } from '@/lib/db';
import { ArrowUpRight, BarChart3, LineChart } from 'lucide-react';

interface AnalyticsChartsProps {
  challenges: Challenge[];
}

export default function AnalyticsCharts({ challenges }: AnalyticsChartsProps) {
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
          name: c.account_name.split('-').pop() || c.account_name, // keep short name
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

  if (challenges.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card group relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-zinc-800 p-6 text-center select-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />
          <div className="mb-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-3 text-zinc-500 transition-colors duration-300 group-hover:text-zinc-300">
            <LineChart className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-100">Courbe d&apos;équité cumulative</h4>
          <p className="mt-2 max-w-[260px] text-sm leading-6 text-zinc-500">
            Saisissez vos challenges pour voir l&apos;évolution en temps réel de votre performance globale sous forme de graphique.
          </p>
        </div>

        <div className="glass-card group relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-zinc-800 p-6 text-center select-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />
          <div className="mb-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-3 text-zinc-500 transition-colors duration-300 group-hover:text-zinc-300">
            <BarChart3 className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-100">Analyse par compte</h4>
          <p className="mt-2 max-w-[260px] text-sm leading-6 text-zinc-500">
            La répartition individuelle de vos gains et pertes par compte de challenge s&apos;affichera ici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-zinc-100">Courbe d&apos;équité cumulative</h4>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Évolution chronologique de votre PnL net cumulé.</p>
          </div>

          <div className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${netPnL >= 0 ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300' : 'border-rose-900/60 bg-rose-950/20 text-rose-300'}`}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            {formatVal(netPnL)}
          </div>
        </div>

        <div className="h-64 w-full font-mono-numbers lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurveData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
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
                formatter={(value: unknown) => [formatVal(Number(value || 0)), 'Équité']}
                labelFormatter={(label) => `Date d'achat: ${formatDateLabel(String(label))}`}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#ffffff"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#equityGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-zinc-100">Performance par compte</h4>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Résultat net final individuel par challenge.</p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs font-semibold text-zinc-300">
            <BarChart3 className="h-3.5 w-3.5" />
            {profitableAccounts}/{sortedData.length} rentables
          </div>
        </div>

        <div className="h-64 w-full font-mono-numbers lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={18}
                interval="preserveStartEnd"
                tickFormatter={(value) => String(value).slice(-6)}
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
                formatter={(value: unknown) => [formatVal(Number(value || 0)), 'PnL Net']}
                labelFormatter={(label, items) => {
                  const item = items[0]?.payload;
                  return item ? `Compte: ${item.fullName}` : `Compte: ${label}`;
                }}
              />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? '#ffffff' : '#27272a'}
                    stroke={entry.pnl >= 0 ? '#ffffff' : '#2e2e3f'}
                    strokeWidth={0.75}
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
