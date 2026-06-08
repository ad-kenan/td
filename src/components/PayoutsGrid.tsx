'use client';

import { useMemo, useState } from 'react';
import { Payout } from '@/lib/db';
import { Edit3, Trash2, Search, ArrowUpDown, Plus, Coins } from 'lucide-react';

interface PayoutsGridProps {
  payouts: Payout[];
  onEditPayout: (payout: Payout) => void;
  onDeletePayout: (id: string) => void;
  onAddPayout: () => void;
  canAddPayout: boolean;
}

type SortField = 'payout_date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function PayoutsGrid({
  payouts,
  onEditPayout,
  onDeletePayout,
  onAddPayout,
  canAddPayout,
}: PayoutsGridProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('payout_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
        const matchesSearch = payout.notes?.toLowerCase().includes(search.toLowerCase()) || false;
        return search === '' ? true : matchesSearch;
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
  }, [payouts, search, sortField, sortOrder]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
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

  const resultsLabel =
    search
      ? `${processedPayouts.length} retrait${processedPayouts.length > 1 ? 's' : ''} trouvé${processedPayouts.length > 1 ? 's' : ''}`
      : `${processedPayouts.length} retrait${processedPayouts.length > 1 ? 's' : ''} enregistré${processedPayouts.length > 1 ? 's' : ''}`;

  const emptyState = (
    <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/20 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400">
        <Coins className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-medium text-zinc-200">Aucun retrait enregistré</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {search
          ? 'Ajuste ta recherche pour retrouver tes données.'
          : 'Commence par sélectionner un profil puis ajoute ton premier retrait de bénéfices.'}
      </p>
    </div>
  );

  return (
    <section className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100">Retraits de bénéfices personnels</h3>
            <p className="mt-1 text-sm text-zinc-500">{resultsLabel}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_230px] md:items-center">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher dans les notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
              />
            </div>

            <button
              onClick={onAddPayout}
              disabled={!canAddPayout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200/10 bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-500"
            >
              <Plus className="h-4 w-4" />
              Ajouter un retrait
            </button>
          </div>
        </div>

        {!canAddPayout && (
          <p className="text-sm leading-6 text-zinc-500">
            Sélectionne un profil précis pour ajouter un retrait et le lier à ses bénéfices.
          </p>
        )}
      </div>

      {processedPayouts.length === 0 ? (
        emptyState
      ) : (
        <>
          {/* Mobile view */}
          <div className="space-y-3 md:hidden">
            {processedPayouts.map((payout) => (
              <article
                key={payout.id}
                className="rounded-[24px] border border-zinc-800/70 bg-zinc-950/35 p-4 shadow-lg shadow-black/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {formatDate(payout.payout_date)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400 leading-5">
                      {payout.notes || '—'}
                    </p>
                  </div>

                  <span className="rounded-full border border-amber-900/60 bg-amber-950/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    {formatCurrency(payout.amount)}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onEditPayout(payout)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:text-white"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </button>

                  <button
                    onClick={() => onDeletePayout(payout.id)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 text-sm font-medium text-zinc-300 transition hover:border-rose-900/70 hover:bg-rose-950/20 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-[22px] border border-zinc-900/70 bg-zinc-950/15">
              <table className="w-full table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-900/80 bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <th className="px-5 py-4 w-[160px]">
                      <button
                        onClick={() => handleSort('payout_date')}
                        className="flex items-center gap-1.5 transition hover:text-zinc-200"
                      >
                        Date <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="px-5 py-4 w-[200px]">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-1.5 transition hover:text-zinc-200"
                      >
                        Montant <ArrowUpDown className="h-3 w-3 text-zinc-600" />
                      </button>
                    </th>
                    <th className="px-5 py-4">Notes</th>
                    <th className="px-5 py-4 text-right w-[120px]">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-900/40 text-[12px] text-zinc-300 font-mono-numbers">
                  {processedPayouts.map((payout) => (
                    <tr key={payout.id} className="group transition hover:bg-zinc-900/15">
                      <td className="px-5 py-4 font-sans text-zinc-400">
                        {formatDate(payout.payout_date)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-amber-300">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-5 py-4 font-sans text-zinc-300">
                        <div className="max-w-[500px] break-words whitespace-normal leading-5">
                          {payout.notes || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                          <button
                            onClick={() => onEditPayout(payout)}
                            className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900/70 hover:text-zinc-100"
                            title="Modifier"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeletePayout(payout.id)}
                            className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900/70 hover:text-rose-300"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
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
