'use client';

import { useMemo, useState } from 'react';
import { Challenge } from '@/lib/db';
import { Edit3, Trash2, Search, ArrowUpDown, Filter, Plus, ShieldAlert } from 'lucide-react';

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
    if (val === null || val === undefined) return '–';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));

    if (val === 0) return formatted;
    return val < 0 ? `-${formatted}` : `+${formatted}`;
  };

  const formatCompactCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '–';

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
    if (val === null || val === undefined) return 'text-slate-400 dark:text-zinc-600';
    if (val > 0) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    if (val < 0) return 'text-rose-600 dark:text-rose-400 font-semibold';
    return 'text-slate-500 dark:text-zinc-400';
  };

  const emptyState = (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-white/10 dark:bg-black/20">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-xs dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">Aucun challenge trouvé</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        {search || filterType !== 'all'
          ? 'Modifiez votre recherche ou réinitialisez les filtres.'
          : 'Sélectionnez un profil et commencez par ajouter votre premier challenge.'}
      </p>
    </div>
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-colors dark:border-white/[0.06] dark:bg-[#0d0e12] sm:p-5">
      {/* TOOLBAR DU TABLEAU : Recherche + Filtres + Action d'ajout */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-zinc-100">
            Challenges &amp; Opérations
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {processedChallenges.length} compte{processedChallenges.length > 1 ? 's' : ''} visible{processedChallenges.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Recherche */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher un compte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 dark:border-white/[0.08] dark:bg-black/40 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-violet-500/50"
            />
          </div>

          {/* Filtre PnL */}
          <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 transition-colors dark:border-white/[0.08] dark:bg-black/40">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer dark:text-zinc-300"
            >
              <option value="all">Tous les PnL</option>
              <option value="profitable">Bénéficiaires</option>
              <option value="losing">Déficitaires</option>
            </select>
          </div>

          {/* Bouton Ajouter un Challenge */}
          <button
            onClick={onAddChallenge}
            disabled={!canAddChallenge}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {processedChallenges.length === 0 ? (
        emptyState
      ) : (
        <>
          {/* VUE MOBILE : Cartes condensées */}
          <div className="space-y-2.5 md:hidden">
            {processedChallenges.map((challenge) => {
              const total = getChallengeTotal(challenge);
              const evaluationTotal = getEvaluationTotal(challenge);
              const fundedTotal = getFundedTotal(challenge);

              return (
                <article
                  key={challenge.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-xs transition-colors dark:border-white/[0.06] dark:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500">
                        {formatDate(challenge.purchase_date)}
                        {challenge.closed_date && (
                          <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">· Fin: {formatDate(challenge.closed_date)}</span>
                        )}
                      </p>
                      <h4 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {challenge.account_name}
                      </h4>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-0.5 font-mono text-xs font-bold ${
                        total >= 0
                          ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {formatCellVal(total)}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-white/[0.02]">
                      <span className="text-slate-500 dark:text-zinc-500">Coût</span>
                      <p className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{formatCompactCurrency(challenge.cost)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-white/[0.02]">
                      <span className="text-slate-500 dark:text-zinc-500">Éval</span>
                      <p className={`font-mono ${getPnLColor(evaluationTotal)}`}>{formatCompactCurrency(evaluationTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-white/[0.02]">
                      <span className="text-slate-500 dark:text-zinc-500">Funded</span>
                      <p className={`font-mono ${getPnLColor(fundedTotal)}`}>{formatCompactCurrency(fundedTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-white/[0.02]">
                      <span className="text-slate-500 dark:text-zinc-500">Payout</span>
                      <p className={`font-mono ${getPnLColor(challenge.phase9_payout)}`}>{formatCompactCurrency(challenge.phase9_payout)}</p>
                    </div>
                  </div>

                  {challenge.notes && (
                    <p className="mt-2 text-[11px] text-slate-500 italic dark:text-zinc-400">
                      {challenge.notes}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onEditChallenge(challenge)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onDeleteChallenge(challenge.id)}
                      className="flex-1 rounded-lg border border-rose-200 bg-rose-50/50 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100/50 dark:border-rose-900/40 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-950/20"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* VUE DESKTOP : Tableau Financier Institutionnel */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-white/[0.06] dark:bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-[#121318]/90 dark:text-zinc-400">
                    <th className="sticky left-0 z-20 w-[280px] min-w-[280px] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] dark:bg-[#121318] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.06)]">
                      <button
                        onClick={() => handleSort('account_name')}
                        className="flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-white"
                      >
                        Compte &amp; Date <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                      </button>
                    </th>
                    <th className="w-[100px] px-3 py-3 text-right">
                      <button
                        onClick={() => handleSort('cost')}
                        className="ml-auto flex items-center justify-end gap-1 transition hover:text-slate-900 dark:hover:text-white"
                      >
                        Coût <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                      </button>
                    </th>
                    <th className="w-[85px] px-2 py-3 text-right">Ph.2 J1</th>
                    <th className="w-[85px] px-2 py-3 text-right">Ph.3 J2</th>
                    <th className="w-[75px] px-2 py-3 text-right">F1</th>
                    <th className="w-[75px] px-2 py-3 text-right">F2</th>
                    <th className="w-[75px] px-2 py-3 text-right">F3</th>
                    <th className="w-[75px] px-2 py-3 text-right">F4</th>
                    <th className="w-[75px] px-2 py-3 text-right">F5</th>
                    <th className="w-[95px] px-3 py-3 text-right">Payout</th>
                    <th className="w-[125px] px-3 py-3 text-right">
                      <button
                        onClick={() => handleSort('total')}
                        className="ml-auto flex items-center justify-end gap-1 transition hover:text-slate-900 dark:hover:text-white"
                      >
                        PnL Total <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                      </button>
                    </th>
                    <th className="w-[160px] px-3 py-3">Notes</th>
                    <th className="w-[80px] px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-mono dark:divide-white/[0.04]">
                  {processedChallenges.map((challenge) => {
                    const total = getChallengeTotal(challenge);

                    return (
                      <tr key={challenge.id} className="group transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                        {/* Compte & Date d'achat (Sticky Left) */}
                        <td className="sticky left-0 z-10 min-w-[280px] bg-white px-4 py-3 font-sans shadow-[1px_0_0_0_rgba(0,0,0,0.06)] group-hover:bg-slate-50 dark:bg-[#0d0e12] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.06)] dark:group-hover:bg-[#13141a]">
                          <div className="font-semibold text-slate-900 truncate max-w-[260px] dark:text-zinc-100">
                            {challenge.account_name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500 font-mono dark:text-zinc-500">
                            {formatDate(challenge.purchase_date)}
                            {challenge.closed_date && (
                              <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">· Fin: {formatDate(challenge.closed_date)}</span>
                            )}
                          </div>
                        </td>

                        {/* Coût d'achat */}
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 dark:text-zinc-400">
                          {formatCellVal(challenge.cost)}
                        </td>

                        {/* Évaluation Phase 2 & 3 */}
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase2_day1)}`}>
                          {formatCellVal(challenge.phase2_day1)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase3_day2)}`}>
                          {formatCellVal(challenge.phase3_day2)}
                        </td>

                        {/* Funded Phases F1 à F5 */}
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase4_funded_day1)}`}>
                          {formatCellVal(challenge.phase4_funded_day1)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase5_funded_day2)}`}>
                          {formatCellVal(challenge.phase5_funded_day2)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase6_funded_day3)}`}>
                          {formatCellVal(challenge.phase6_funded_day3)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase7_funded_day4)}`}>
                          {formatCellVal(challenge.phase7_funded_day4)}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right ${getPnLColor(challenge.phase8_funded_day5)}`}>
                          {formatCellVal(challenge.phase8_funded_day5)}
                        </td>

                        {/* Phase 9 Payout */}
                        <td className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${getPnLColor(challenge.phase9_payout)}`}>
                          {formatCellVal(challenge.phase9_payout)}
                        </td>

                        {/* PnL Total Clé */}
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                              total >= 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 border border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                          >
                            {formatCellVal(total)}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-3 font-sans text-[11px] text-slate-500 dark:text-zinc-500">
                          <div className="max-w-[160px] truncate" title={challenge.notes || ''}>
                            {challenge.notes || '–'}
                          </div>
                        </td>

                        {/* Actions (apparaissent au hover) */}
                        <td className="px-3 py-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              onClick={() => onEditChallenge(challenge)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                              title="Modifier"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteChallenge(challenge.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
