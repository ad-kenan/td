import { TrendingUp, TrendingDown, DollarSign, ShieldAlert, Activity, Coins, ArrowDownToLine } from 'lucide-react';
import { Challenge, Payout } from '@/lib/db';

interface KPICardsProps {
  challenges: Challenge[];
  payouts?: Payout[];
}

export default function KPICards({ challenges, payouts = [] }: KPICardsProps) {
  // Calculate financial metrics
  // 1. Debt (Dette) = Sum of absolute values of cost (Phase 1)
  const totalDebt = challenges.reduce((sum, c) => sum + Math.abs(c.cost || 0), 0);

  // 2. Personal Payouts = Sum of all personal payouts
  const totalPayouts = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

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

  // 3. Total Benefices = Sum of positive challenge totals
  const totalBenefices = challengeTotals.filter(t => t > 0).reduce((sum, t) => sum + t, 0);

  // 4. Total Pertes = Sum of negative challenge totals
  const totalPertes = challengeTotals.filter(t => t < 0).reduce((sum, t) => sum + t, 0);

  // 5. Net PnL = Total Benefices + Total Pertes
  const netPnL = totalBenefices + totalPertes;

  // 6. Winrate = Percentage of challenges with positive PnL
  const winrate = challenges.length > 0 
    ? Math.round((challengeTotals.filter(t => t > 0).length / challenges.length) * 100) 
    : 0;

  // 7. Comptes Actifs = challenges whose cumulative total is still negative
  //    (cost not yet recovered = account still alive / in play)
  const activeAccounts = challengeTotals.filter(t => t < 0).length;

  // 8. Bénéfices Ajustés = Total Benefices - absolute totals of negative challenges that have at least one positive phase value in their row - totalPayouts
  const specialChallengesTotalLoss = challenges.reduce((sum, c) => {
    const total = getChallengeTotal(c);
    if (total >= 0) return sum;

    // Check if there is a positive value in the row phases (excluding cost)
    const hasPositivePhase = [
      c.phase2_day1,
      c.phase3_day2,
      c.phase4_funded_day1,
      c.phase5_funded_day2,
      c.phase6_funded_day3,
      c.phase7_funded_day4,
      c.phase8_funded_day5,
      c.phase9_payout,
    ].some(val => val !== null && val > 0);

    if (hasPositivePhase) {
      return sum + total; // total is negative, so adding it reduces the sum (subtracts the loss)
    }
    return sum;
  }, 0);

  const adjustedBenefices = totalBenefices + specialChallengesTotalLoss - totalPayouts;

  // Active dates count for daily average calculation
  const activeDates = new Set([
    ...challenges.map((c) => c.purchase_date).filter(Boolean),
    ...payouts.map((p) => p.payout_date).filter(Boolean),
  ]).size;

  const avgBeneficePerDay = activeDates > 0 ? totalBenefices / activeDates : 0;
  const avgAdjustedPerDay = activeDates > 0 ? adjustedBenefices / activeDates : 0;

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
      title: 'Dette',
      value: formatCurrency(totalDebt),
      description: "Prix d'achat des challenges",
      icon: ShieldAlert,
      color: 'text-zinc-100',
      bgGlow: 'from-zinc-500/10 to-transparent',
      borderColor: 'border-zinc-800/60',
      iconBg: 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400',
    },
    {
      title: 'Bénéfices',
      value: formatCurrency(totalBenefices),
      description: activeDates > 0 ? `Moy. ${formatCurrency(avgBeneficePerDay)}/j` : 'Comptes en positif',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      borderColor: 'group-hover:border-emerald-500/20 border-zinc-800/60',
      iconBg: 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400',
    },
    {
      title: 'Bénéf. ajustés',
      value: formatCurrency(adjustedBenefices),
      description: activeDates > 0 ? `Moy. ${formatCurrency(avgAdjustedPerDay)}/j` : 'Après retraits et pertes',
      icon: Coins,
      color: 'text-teal-400',
      bgGlow: 'from-teal-500/10 to-transparent',
      borderColor: 'group-hover:border-teal-500/20 border-zinc-800/60',
      iconBg: 'bg-teal-950/30 border-teal-900/40 text-teal-400',
    },
    {
      title: 'Retraits perso',
      value: formatCurrency(totalPayouts),
      description: 'Fonds retirés des bénéfices',
      icon: ArrowDownToLine,
      color: 'text-amber-400',
      bgGlow: 'from-amber-500/10 to-transparent',
      borderColor: 'group-hover:border-amber-500/20 border-zinc-800/60',
      iconBg: 'bg-amber-950/30 border-amber-900/40 text-amber-400',
    },
    {
      title: 'Pertes',
      value: formatCurrency(totalPertes),
      description: 'Comptes en négatif',
      icon: TrendingDown,
      color: 'text-rose-400',
      bgGlow: 'from-rose-500/10 to-transparent',
      borderColor: 'group-hover:border-rose-500/20 border-zinc-800/60',
      iconBg: 'bg-rose-950/30 border-rose-900/40 text-rose-400',
    },
    {
      title: 'PnL Net',
      value: formatCurrency(netPnL),
      description: `Winrate: ${winrate}% · ${challenges.length} challenge${challenges.length > 1 ? 's' : ''}`,
      icon: DollarSign,
      color: netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400',
      bgGlow: netPnL >= 0 ? 'from-emerald-500/10 to-transparent' : 'from-rose-500/10 to-transparent',
      borderColor: netPnL >= 0 ? 'group-hover:border-emerald-500/20 border-zinc-800/60' : 'group-hover:border-rose-500/20 border-zinc-800/60',
      iconBg: netPnL >= 0 ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/30 border-rose-900/40 text-rose-400',
    },
    {
      title: 'Comptes actifs',
      value: `${activeAccounts}`,
      description: `${activeAccounts}/${challenges.length} encore en cours`,
      icon: Activity,
      color: 'text-sky-400',
      bgGlow: 'from-sky-500/10 to-transparent',
      borderColor: 'group-hover:border-sky-500/20 border-zinc-800/60',
      iconBg: 'bg-sky-950/30 border-sky-900/40 text-sky-400',
    },
  ];


  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div
            key={idx}
            className={`glass-card group relative min-h-[130px] rounded-[20px] border p-4 ${m.borderColor}`}
          >
            <div className={`absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br ${m.bgGlow} opacity-60 blur-2xl transition-all duration-500 group-hover:scale-125`} />
            <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_45%)] opacity-50" />

            <div className="relative flex h-full flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 leading-tight">
                  {m.title}
                </span>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${m.iconBg}`}>
                  <IconComponent className="h-3 w-3" />
                </div>
              </div>

              <div>
                <h3 className={`text-base font-bold font-mono-numbers tracking-tight sm:text-lg xl:text-xl ${m.color}`}>
                  {m.value}
                </h3>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-600">
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

