'use client';

import { useMemo, useState } from 'react';
import { Challenge } from '@/lib/db';
import { Edit3, Trash2, Search, ArrowUpDown, Filter, Plus, UserRound } from 'lucide-react';

interface ChallengesGridProps {
  challenges: Challenge[];
  onEditChallenge: (challenge: Challenge) => void;
  onDeleteChallenge: (id: string) => void;
  onAddChallenge: () => void;
  canAddChallenge: boolean;
}

type SortField = 'purchase_date' | 'account_name' | 'cost' | 'total';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'profitable' | 'losing';

export default function ChallengesGrid({
  challenges,
  onEditChallenge,
  onDeleteChallenge,
  onAddChallenge,
  canAddChallenge,
}: ChallengesGridProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('purchase_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const getChallengeTotal = (challenge: Challenge) => {
    return (
      (challenge.cost || 0) +
      (challenge.phase2_day1 || 0) +
      (challenge.phase3_day2 || 0) +
      (challenge.phase4_funded_day1 || 0) +
      (challenge.phase5_funded_day2 || 0) +
      (challenge.phase6_funded_day3 || 0) +
      (challenge.phase7_funded_day4 || 0) +
      (challenge.phase8_funded_day5 || 0) +
      (challenge.phase9_payout || 0)
    );
  };

  const getEvaluationTotal = (challenge: Challenge) => {
    return (challenge.phase2_day1 || 0) + (challenge.phase3_day2 || 0);
  };

  const getFundedTotal = (challenge: Challenge) => {
    return (
      (challenge.phase4_funded_day1 || 0) +
      (challenge.phase5_funded_day2 || 0) +
      (challenge.phase6_funded_day3 || 0) +
      (challenge.phase7_funded_day4 || 0) +
      (challenge.phase8_funded_day5 || 0)
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const processedChallenges = useMemo(() => {
    return challenges
      .filter((challenge) => {
        const matchesSearch = challenge.account_name.toLowerCase().includes(search.toLowerCase());
        const total = getChallengeTotal(challenge);

        if (filterType === 'profitable') return matchesSearch && total > 0;
        if (filterType === 'losing') return matchesSearch && total < 0;

        return matchesSearch;
      })
      .sort((a, b) => {
        let valA: string | number | null | undefined = a[sortField as keyof Challenge] as string | number | null | undefined;
        let valB: string | number | null | undefined = b[sortField as keyof Challenge] as string | number | null | undefined;

        if (sortField === 'total') {
          valA = getChallengeTotal(a);
          valB = getChallengeTotal(b);
        }

        if (valA === undefined || valA === null) valA = 0;
        if (valB === undefined || valB === null) valB = 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [challenges, filterType, search, sortField, sortOrder]);

  const formatCellVal = (val: number | null) => {
    if (val === null || val === undefined) return '—';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));

    if (val === 0) return formatted;

    return val < 0 ? `-${formatted}` : `+${formatted}`;
  };

  const formatCompactCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '—';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Math.abs(val));

    if (val === 0) return formatted;

    return val < 0 ? `-${formatted}` : `+${formatted}`;
  };

  const formatDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getPnLColor = (val: number | null) => {
    if (val === null || val === undefined) return 'text-zinc-500';
    if (val > 0) return 'text-emerald-400 font-semibold';
    if (val < 0) return 'text-rose-400 font-semibold';
    return 'text-zinc-300';
  };

  const getTotalBadgeClasses = (val: number) => {
    if (val > 0) return 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300';
    if (val < 0) return 'border-rose-900/60 bg-rose-950/20 text-rose-300';
    return 'border-zinc-800 bg-zinc-950/70 text-zinc-300';
  };

  const resultsLabel =
    search || filterType !== 'all'
      ? `${processedChallenges.length} résultat${processedChallenges.length > 1 ? 's' : ''} après filtres`
      : `${processedChallenges.length} challenge${processedChallenges.length > 1 ? 's' : ''} au total`;

  const emptyState = (
    <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/20 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400">
        <UserRound className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-medium text-zinc-200">Aucun challenge à afficher</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {search || filterType !== 'all'
          ? 'Ajuste la recherche ou les filtres pour retrouver tes données.'
          : 'Commence par sélectionner un profil puis ajoute ton premier challenge.'}
      </p>
    </div>
  );

  return (
    <section className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100">Challenges</h3>
            <p className="mt-1 text-sm text-zinc-500">{resultsLabel}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_230px] md:items-center">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher un compte..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
              />
            </div>

            <div className="flex h-11 items-center rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3">
              <Filter className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full appearance-none bg-transparent text-sm font-medium text-zinc-300 outline-none"
              >
                <option value="all">Tous les PnL</option>
                <option value="profitable">Bénéficiaires</option>
                <option value="losing">Déficitaires</option>
              </select>
            </div>

            <button
              onClick={onAddChallenge}
              disabled={!canAddChallenge}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200/10 bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
            >
              <Plus className="h-4 w-4" />
              Ajouter un challenge
            </button>
          </div>
        </div>

        {!canAddChallenge && (
          <p className="text-sm leading-6 text-zinc-500">
            Sélectionne un profil précis pour créer un challenge et l&apos;associer correctement.
          </p>
        )}
      </div>

      {processedChallenges.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {processedChallenges.map((challenge) => {
              const total = getChallengeTotal(challenge);
              const evaluationTotal = getEvaluationTotal(challenge);
              const fundedTotal = getFundedTotal(challenge);

              return (
                <article
                  key={challenge.id}
                  className="rounded-[24px] border border-zinc-800/70 bg-zinc-950/35 p-4 shadow-lg shadow-black/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        {formatDate(challenge.purchase_date)}
                      </p>
                      <h4 className="mt-1 break-words text-sm font-semibold leading-5 text-zinc-50">
                        {challenge.account_name}
                      </h4>
                    </div>

                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTotalBadgeClasses(total)}`}>
                      {formatCellVal(total)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Coût</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-100">{formatCompactCurrency(challenge.cost)}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Évaluation</p>
                      <p className={`mt-2 text-sm ${getPnLColor(evaluationTotal)}`}>{formatCompactCurrency(evaluationTotal)}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Funded</p>
                      <p className={`mt-2 text-sm ${getPnLColor(fundedTotal)}`}>{formatCompactCurrency(fundedTotal)}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Payout</p>
                      <p className={`mt-2 text-sm ${getPnLColor(challenge.phase9_payout)}`}>{formatCompactCurrency(challenge.phase9_payout)}</p>
                    </div>
                  </div>

                  {challenge.notes && (
                    <div className="mt-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/55 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Notes</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{challenge.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onEditChallenge(challenge)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:text-white"
                    >
                      <Edit3 className="h-4 w-4" />
                      Modifier
                    </button>

                    <button
                      onClick={() => onDeleteChallenge(challenge.id)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 text-sm font-medium text-zinc-300 transition hover:border-rose-900/70 hover:bg-rose-950/20 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-[22px] border border-zinc-900/70 bg-zinc-950/15">
              <table className="w-full min-w-[1380px] table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-900/80 bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <th className="sticky left-0 z-20 w-[320px] min-w-[320px] bg-zinc-950/95 px-5 py-4 shadow-[1px_0_0_0_rgba(39,39,42,0.8)]">
                      <button
                        onClick={() => handleSort('account_name')}
                        className="flex items-center gap-1.5 transition hover:text-zinc-200"
                      >
                        Compte <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="w-[118px] min-w-[118px] px-3 py-4">
                      <button
                        onClick={() => handleSort('purchase_date')}
                        className="flex items-center gap-1.5 transition hover:text-zinc-200"
                      >
                        Date <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="w-[104px] min-w-[104px] px-3 py-4">
                      <button
                        onClick={() => handleSort('cost')}
                        className="flex items-center gap-1.5 transition hover:text-zinc-200"
                      >
                        Coût <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="w-[90px] min-w-[90px] px-2 py-4 text-center">Ph.2 J1</th>
                    <th className="w-[90px] min-w-[90px] px-2 py-4 text-center">Ph.3 J2</th>
                    <th className="w-[84px] min-w-[84px] px-2 py-4 text-center">F1</th>
                    <th className="w-[84px] min-w-[84px] px-2 py-4 text-center">F2</th>
                    <th className="w-[84px] min-w-[84px] px-2 py-4 text-center">F3</th>
                    <th className="w-[84px] min-w-[84px] px-2 py-4 text-center">F4</th>
                    <th className="w-[84px] min-w-[84px] px-2 py-4 text-center">F5</th>
                    <th className="w-[98px] min-w-[98px] px-2 py-4 text-center">Payout</th>
                    <th className="w-[116px] min-w-[116px] px-4 py-4 text-right">
                      <button
                        onClick={() => handleSort('total')}
                        className="ml-auto flex items-center justify-end gap-1.5 transition hover:text-zinc-200"
                      >
                        Total <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="w-[180px] min-w-[180px] px-4 py-4">Notes</th>
                    <th className="w-[100px] min-w-[100px] px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-900/40 text-[12px] text-zinc-300 font-mono-numbers">
                  {processedChallenges.map((challenge) => {
                    const total = getChallengeTotal(challenge);

                    return (
                      <tr key={challenge.id} className="group transition hover:bg-zinc-900/15">
                        <td className={`sticky left-0 z-10 min-w-[320px] bg-[#0c0c10] px-5 py-4 font-sans shadow-[1px_0_0_0_rgba(39,39,42,0.7)] transition group-hover:bg-zinc-900/90`}>
                          <div className="max-w-[340px] whitespace-normal break-words text-sm font-semibold leading-5 tracking-tight text-zinc-50">
                            {challenge.account_name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-sans text-zinc-500">{formatDate(challenge.purchase_date)}</td>
                        <td className="whitespace-nowrap px-3 py-4 font-semibold text-zinc-300">{formatCellVal(challenge.cost)}</td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase2_day1)}`}>
                          {formatCellVal(challenge.phase2_day1)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase3_day2)}`}>
                          {formatCellVal(challenge.phase3_day2)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase4_funded_day1)}`}>
                          {formatCellVal(challenge.phase4_funded_day1)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase5_funded_day2)}`}>
                          {formatCellVal(challenge.phase5_funded_day2)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase6_funded_day3)}`}>
                          {formatCellVal(challenge.phase6_funded_day3)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase7_funded_day4)}`}>
                          {formatCellVal(challenge.phase7_funded_day4)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase8_funded_day5)}`}>
                          {formatCellVal(challenge.phase8_funded_day5)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-4 text-center ${getPnLColor(challenge.phase9_payout)}`}>
                          {formatCellVal(challenge.phase9_payout)}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-4 text-right text-sm font-bold ${getPnLColor(total)}`}>
                          {formatCellVal(total)}
                        </td>
                        <td className="px-4 py-4 font-sans text-zinc-500">
                          <div className="max-w-[180px] whitespace-normal break-words leading-5" title={challenge.notes || ''}>
                            {challenge.notes || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                            <button
                              onClick={() => onEditChallenge(challenge)}
                              className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900/70 hover:text-zinc-100"
                              title="Modifier"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteChallenge(challenge.id)}
                              className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900/70 hover:text-rose-300"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
