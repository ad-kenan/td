import { TrendingUp, TrendingDown, DollarSign, ShieldAlert, Activity, Sigma } from 'lucide-react';
import { Challenge } from '@/lib/db';

interface KPICardsProps {
  challenges: Challenge[];
}

export default function KPICards({ challenges }: KPICardsProps) {
  // Calculate financial metrics
  // 1. Debt (Dette) = Sum of absolute values of cost (Phase 1)
  const totalDebt = challenges.reduce((sum, c) => sum + Math.abs(c.cost || 0), 0);

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

  const challengeTotals = challenges.map(getChallengeTotal);

  // 2. Total Benefices = Sum of positive challenge totals
  const totalBenefices = challengeTotals.filter(t => t > 0).reduce((sum, t) => sum + t, 0);

  // 3. Total Pertes = Sum of negative challenge totals
  const totalPertes = challengeTotals.filter(t => t < 0).reduce((sum, t) => sum + t, 0);

  // 4. Net PnL = Total Benefices + Total Pertes
  const netPnL = totalBenefices + totalPertes;

  // 5. Winrate = Percentage of challenges with positive PnL
  const winrate = challenges.length > 0 
    ? Math.round((challengeTotals.filter(t => t > 0).length / challenges.length) * 100) 
    : 0;

  // 6. Comptes Actifs = challenges whose cumulative total is still negative
  //    (cost not yet recovered = account still alive / in play)
  const activeAccounts = challengeTotals.filter(t => t < 0).length;

  // 7. Gains Bruts = somme de chaque chiffre positif dans chaque ligne du tableau
  //    (toutes colonnes confondues : cost, phase2..phase9)
  const totalPositifsBruts = challenges.reduce((sum, c) => {
    const positives = [
      c.cost,
      c.phase2_day1,
      c.phase3_day2,
      c.phase4_funded_day1,
      c.phase5_funded_day2,
      c.phase6_funded_day3,
      c.phase7_funded_day4,
      c.phase8_funded_day5,
      c.phase9_payout,
    ].filter((v): v is number => v !== null && v !== undefined && v > 0);
    return sum + positives.reduce((s, v) => s + v, 0);
  }, 0);

  // Format currency helper
  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `-${formatted}` : formatted;
  };

  const metrics = [
    {
      title: 'Dette Cumulée',
      value: formatCurrency(totalDebt),
      description: "Prix d'achat des challenges",
      icon: ShieldAlert,
      color: 'text-zinc-100',
      bgGlow: 'from-zinc-500/10 to-transparent',
      borderColor: 'border-zinc-800/60',
      iconBg: 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400',
    },
    {
      title: 'Bénéfices Totaux',
      value: formatCurrency(totalBenefices),
      description: 'Performance des comptes positifs',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      borderColor: 'group-hover:border-emerald-500/20 border-zinc-800/60',
      iconBg: 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400',
    },
    {
      title: 'Pertes Totales',
      value: formatCurrency(totalPertes),
      description: 'Performance des comptes négatifs',
      icon: TrendingDown,
      color: 'text-rose-400',
      bgGlow: 'from-rose-500/10 to-transparent',
      borderColor: 'group-hover:border-rose-500/20 border-zinc-800/60',
      iconBg: 'bg-rose-950/30 border-rose-900/40 text-rose-400',
    },
    {
      title: 'PnL Net Global',
      value: formatCurrency(netPnL),
      description: `Winrate: ${winrate}% sur ${challenges.length} challenge${challenges.length > 1 ? 's' : ''}`,
      icon: DollarSign,
      color: netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400',
      bgGlow: netPnL >= 0 ? 'from-emerald-500/10 to-transparent' : 'from-rose-500/10 to-transparent',
      borderColor: netPnL >= 0 ? 'group-hover:border-emerald-500/20 border-zinc-800/60' : 'group-hover:border-rose-500/20 border-zinc-800/60',
      iconBg: netPnL >= 0 ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/30 border-rose-900/40 text-rose-400',
    },
    {
      title: 'Comptes Actifs',
      value: `${activeAccounts}`,
      description: `${activeAccounts} sur ${challenges.length} compte${challenges.length > 1 ? 's' : ''} encore actif${activeAccounts > 1 ? 's' : ''}`,
      icon: Activity,
      color: 'text-sky-400',
      bgGlow: 'from-sky-500/10 to-transparent',
      borderColor: 'group-hover:border-sky-500/20 border-zinc-800/60',
      iconBg: 'bg-sky-950/30 border-sky-900/40 text-sky-400',
    },
    {
      title: 'Gains Bruts',
      value: formatCurrency(totalPositifsBruts),
      description: 'Somme de tous les chiffres positifs du tableau',
      icon: Sigma,
      color: 'text-violet-400',
      bgGlow: 'from-violet-500/10 to-transparent',
      borderColor: 'group-hover:border-violet-500/20 border-zinc-800/60',
      iconBg: 'bg-violet-950/30 border-violet-900/40 text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div
            key={idx}
            className={`glass-card group relative min-h-[152px] overflow-hidden rounded-[24px] border p-5 sm:p-6 ${m.borderColor}`}
          >
            <div className={`absolute -right-10 -top-6 h-32 w-32 rounded-full bg-gradient-to-br ${m.bgGlow} opacity-80 blur-3xl transition-all duration-500 group-hover:scale-125`} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)] opacity-50" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {m.title}
                  </span>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${m.iconBg}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
              </div>

              <div>
                <h3 className={`text-2xl font-bold font-mono-numbers tracking-tight xl:text-[2rem] ${m.color}`}>
                  {m.value}
                </h3>
                <p className="mt-1.5 max-w-xs text-sm leading-5 text-zinc-400">
                  {m.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
