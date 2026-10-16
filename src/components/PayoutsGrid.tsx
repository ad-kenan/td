'use client';

import { useMemo, useState } from 'react';
import { Payout, Trader } from '@/lib/db';
import { Edit3, Trash2, Search, ArrowUpDown, Plus, ArrowDownToLine, User } from 'lucide-react';

interface PayoutsGridProps {
  payouts: Payout[];
  traders?: Trader[];
  selectedTraderId?: string;
  onEditPayout: (payout: Payout) => void;
  onDeletePayout: (id: string) => void;
  onAddPayout: () => void;
  canAddPayout: boolean;
}

type SortField = 'payout_date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function PayoutsGrid({
  payouts,
  traders = [],
  selectedTraderId = 'all',
  onEditPayout,
  onDeletePayout,
  onAddPayout,
  canAddPayout,
}: PayoutsGridProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('payout_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const traderMap = useMemo(() => {
    const map = new Map<string, string>();
    traders.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [traders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortOrder('desc');
  };

  const processedPayouts = useMemo(() => {
    return payouts
      .filter((payout) => {
        const matchesNotes = payout.notes?.toLowerCase().includes(search.toLowerCase()) || false;
        const matchesTrader =
          traderMap.get(payout.trader_id)?.toLowerCase().includes(search.toLowerCase()) || false;
        return search === '' ? true : matchesNotes || matchesTrader;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (sortField === 'payout_date') {
          const dateA = new Date(valA || 0).getTime();
          const dateB = new Date(valB || 0).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
      });
  }, [payouts, search, sortField, sortOrder, traderMap]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));
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

  const totalAmount = processedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const emptyState = (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-white/10 dark:bg-black/20">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-xs dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
        <ArrowDownToLine className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">Aucun retrait trouvé</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
        {search
          ? 'Aucun résultat ne correspond à votre recherche.'
          : 'Sélectionnez un profil pour ajouter votre premier retrait.'}
      </p>
    </div>
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-colors dark:border-white/[0.06] dark:bg-[#0d0e12] sm:p-5">
      {/* TOOLBAR */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-zinc-100">
              Retraits de Bénéfices Personnels
            </h3>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              +{formatCurrency(totalAmount)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {processedPayouts.length} virement{processedPayouts.length > 1 ? 's' : ''} enregistré{processedPayouts.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Recherche */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher par note ou trader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 dark:border-white/[0.08] dark:bg-black/40 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-violet-500/50"
            />
          </div>

          <button
            onClick={onAddPayout}
            disabled={!canAddPayout}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Ajouter un retrait</span>
          </button>
        </div>
      </div>

      {processedPayouts.length === 0 ? (
        emptyState
      ) : (
        <>
          {/* MOBILE VIEW */}
          <div className="space-y-2.5 md:hidden">
            {processedPayouts.map((payout) => (
              <article
                key={payout.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-xs transition-colors dark:border-white/[0.06] dark:bg-black/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-zinc-500">
                        {formatDate(payout.payout_date)}
                      </span>
                      {selectedTraderId === 'all' && (
                        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/[0.06] dark:text-zinc-300">
                          {traderMap.get(payout.trader_id) || 'Profil'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-700 leading-snug dark:text-zinc-300">
                      {payout.notes || 'Sans note particulière'}
                    </p>
                  </div>

                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 shrink-0 dark:bg-emerald-950/40 dark:text-emerald-300">
                    +{formatCurrency(payout.amount)}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onEditPayout(payout)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onDeletePayout(payout.id)}
                    className="flex-1 rounded-lg border border-rose-200 bg-rose-50/50 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100/50 dark:border-rose-900/40 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-950/20"
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-white/[0.06] dark:bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-[#121318]/90 dark:text-zinc-400">
                    <th className="px-4 py-3 w-[150px]">
                      <button
                        onClick={() => handleSort('payout_date')}
                        className="flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-white"
                      >
                        Date <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                      </button>
                    </th>
                    {selectedTraderId === 'all' && (
                      <th className="px-4 py-3 w-[140px]">Profil</th>
                    )}
                    <th className="px-4 py-3 w-[160px] text-right">
                      <button
                        onClick={() => handleSort('amount')}
                        className="ml-auto flex items-center justify-end gap-1 transition hover:text-slate-900 dark:hover:text-white"
                      >
                        Montant <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Notes &amp; Détails</th>
                    <th className="px-4 py-3 text-right w-[100px]">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs dark:divide-white/[0.04]">
                  {processedPayouts.map((payout) => (
                    <tr key={payout.id} className="group transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-400">
                        {formatDate(payout.payout_date)}
                      </td>
                      {selectedTraderId === 'all' && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                            <span className="text-slate-800 font-medium dark:text-zinc-300">
                              {traderMap.get(payout.trader_id) || 'Profil'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(payout.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                        <div className="max-w-[480px] truncate leading-5" title={payout.notes || ''}>
                          {payout.notes || '–'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => onEditPayout(payout)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                            title="Modifier"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDeletePayout(payout.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
