'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Check,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type {
  CreateTripCreditInput,
  CreateTripExpenseInput,
  TripCredit,
  TripData,
  TripExpense,
  TripExpenseSplit,
  TripParticipant,
} from '@/lib/db';
import {
  createTripCreditAction,
  createTripExpenseAction,
  createTripParticipantAction,
  deleteTripCreditAction,
  deleteTripExpenseAction,
  deleteTripParticipantAction,
  setTripParticipantAsMeAction,
} from '@/app/actions';

interface TripCalculatorViewProps {
  initialData: TripData;
}

interface Transfer {
  fromId: string;
  toId: string;
  rawAmount: number;
  creditApplied: number;
  amountDue: number;
}

interface ParticipantSummary {
  participant: TripParticipant;
  paid: number;
  share: number;
  rawBalance: number;
  credits: number;
  creditUsed: number;
  creditLeft: number;
}

const today = () => new Date().toISOString().split('T')[0];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
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

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
};

export default function TripCalculatorView({ initialData }: TripCalculatorViewProps) {
  const [participants, setParticipants] = useState<TripParticipant[]>(initialData.participants);
  const [expenses, setExpenses] = useState<TripExpense[]>(initialData.expenses);
  const [splits, setSplits] = useState<TripExpenseSplit[]>(initialData.splits);
  const [credits, setCredits] = useState<TripCredit[]>(initialData.credits);

  const [participantName, setParticipantName] = useState('');
  const [participantIsMe, setParticipantIsMe] = useState(participants.length === 0);

  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [expensePayerId, setExpensePayerId] = useState(participants[0]?.id || '');
  const [expenseSplitIds, setExpenseSplitIds] = useState<string[]>(participants.map((p) => p.id));
  const [expenseNotes, setExpenseNotes] = useState('');

  const [creditParticipantId, setCreditParticipantId] = useState(participants[0]?.id || '');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDate, setCreditDate] = useState(today());
  const [creditSource, setCreditSource] = useState('50% bénéfice ajusté');
  const [creditNotes, setCreditNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const participantById = useMemo(() => {
    return new Map(participants.map((participant) => [participant.id, participant]));
  }, [participants]);

  const splitsByExpenseId = useMemo(() => {
    const map = new Map<string, string[]>();
    splits.forEach((split) => {
      const list = map.get(split.expense_id) || [];
      list.push(split.participant_id);
      map.set(split.expense_id, list);
    });
    return map;
  }, [splits]);

  const ledger = useMemo(() => {
    const balances = new Map<string, number>();
    const paidTotals = new Map<string, number>();
    const shareTotals = new Map<string, number>();
    const creditsByParticipant = new Map<string, number>();

    participants.forEach((participant) => {
      balances.set(participant.id, 0);
      paidTotals.set(participant.id, 0);
      shareTotals.set(participant.id, 0);
      creditsByParticipant.set(participant.id, 0);
    });

    expenses.forEach((expense) => {
      const amount = Number(expense.amount || 0);
      const splitIds = splitsByExpenseId.get(expense.id) || [];
      if (!expense.paid_by_participant_id || splitIds.length === 0 || amount <= 0) return;

      paidTotals.set(
        expense.paid_by_participant_id,
        (paidTotals.get(expense.paid_by_participant_id) || 0) + amount
      );
      balances.set(
        expense.paid_by_participant_id,
        (balances.get(expense.paid_by_participant_id) || 0) + amount
      );

      const share = amount / splitIds.length;
      splitIds.forEach((participantId) => {
        shareTotals.set(participantId, (shareTotals.get(participantId) || 0) + share);
        balances.set(participantId, (balances.get(participantId) || 0) - share);
      });
    });

    credits.forEach((credit) => {
      creditsByParticipant.set(
        credit.participant_id,
        (creditsByParticipant.get(credit.participant_id) || 0) + Number(credit.amount || 0)
      );
    });

    const debtors = [...balances.entries()]
      .filter(([, balance]) => balance < -0.005)
      .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = [...balances.entries()]
      .filter(([, balance]) => balance > 0.005)
      .map(([id, balance]) => ({ id, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    const rawTransfers: Transfer[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(debtor.amount, creditor.amount);

      rawTransfers.push({
        fromId: debtor.id,
        toId: creditor.id,
        rawAmount: amount,
        creditApplied: 0,
        amountDue: amount,
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount <= 0.005) debtorIndex += 1;
      if (creditor.amount <= 0.005) creditorIndex += 1;
    }

    const meId = participants.find((participant) => participant.is_me)?.id;
    const creditRemaining = new Map(creditsByParticipant);
    const transfers = rawTransfers.map((transfer) => {
      if (!meId || transfer.toId !== meId) return transfer;

      const availableCredit = creditRemaining.get(transfer.fromId) || 0;
      const creditApplied = Math.min(availableCredit, transfer.rawAmount);
      creditRemaining.set(transfer.fromId, availableCredit - creditApplied);

      return {
        ...transfer,
        creditApplied,
        amountDue: transfer.rawAmount - creditApplied,
      };
    });

    const creditUsedByParticipant = new Map<string, number>();
    transfers.forEach((transfer) => {
      if (transfer.creditApplied <= 0) return;
      creditUsedByParticipant.set(
        transfer.fromId,
        (creditUsedByParticipant.get(transfer.fromId) || 0) + transfer.creditApplied
      );
    });

    const summaries: ParticipantSummary[] = participants.map((participant) => {
      const participantCredits = creditsByParticipant.get(participant.id) || 0;
      const creditUsed = creditUsedByParticipant.get(participant.id) || 0;

      return {
        participant,
        paid: paidTotals.get(participant.id) || 0,
        share: shareTotals.get(participant.id) || 0,
        rawBalance: balances.get(participant.id) || 0,
        credits: participantCredits,
        creditUsed,
        creditLeft: participantCredits - creditUsed,
      };
    });

    return {
      summaries,
      transfers,
      totalExpenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      totalCredits: credits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0),
      totalDueNow: transfers.reduce((sum, transfer) => sum + transfer.amountDue, 0),
      totalCoveredByCredits: transfers.reduce((sum, transfer) => sum + transfer.creditApplied, 0),
      meId,
    };
  }, [credits, expenses, participants, splitsByExpenseId]);

  const handleAddParticipant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participantName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const created = await createTripParticipantAction(participantName, participantIsMe);
      setParticipants((current) => {
        const next = participantIsMe
          ? current.map((participant) => ({ ...participant, is_me: false }))
          : current;
        return [...next, created];
      });
      setExpensePayerId((current) => current || created.id);
      setCreditParticipantId((current) => current || created.id);
      setExpenseSplitIds((current) => [...new Set([...current, created.id])]);
      setParticipantName('');
      setParticipantIsMe(false);
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMe = async (participantId: string) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await setTripParticipantAsMeAction(participantId);
      setParticipants((current) =>
        current.map((participant) => ({ ...participant, is_me: participant.id === participantId }))
      );
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('Supprimer ce participant et ses donnees voyage liees ?')) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await deleteTripParticipantAction(participantId);
      const removedExpenseIds = expenses
        .filter((expense) => expense.paid_by_participant_id === participantId)
        .map((expense) => expense.id);
      setParticipants((current) => current.filter((participant) => participant.id !== participantId));
      setExpenses((current) => current.filter((expense) => expense.paid_by_participant_id !== participantId));
      setSplits((current) =>
        current.filter((split) => split.participant_id !== participantId && !removedExpenseIds.includes(split.expense_id))
      );
      setCredits((current) => current.filter((credit) => credit.participant_id !== participantId));
      setExpenseSplitIds((current) => current.filter((id) => id !== participantId));
      setExpensePayerId((current) => (current === participantId ? '' : current));
      setCreditParticipantId((current) => (current === participantId ? '' : current));
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(expenseAmount);

    const input: CreateTripExpenseInput = {
      description: expenseDescription,
      amount,
      expense_date: expenseDate,
      paid_by_participant_id: expensePayerId,
      split_participant_ids: expenseSplitIds,
      notes: expenseNotes.trim() || null,
    };

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const result = await createTripExpenseAction(input);
      setExpenses((current) => [result.expense, ...current]);
      setSplits((current) => [...current, ...result.splits]);
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseNotes('');
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Supprimer cette depense ?')) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await deleteTripExpenseAction(expenseId);
      setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
      setSplits((current) => current.filter((split) => split.expense_id !== expenseId));
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCredit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(creditAmount);

    const input: CreateTripCreditInput = {
      participant_id: creditParticipantId,
      amount,
      credit_date: creditDate,
      source_label: creditSource,
      notes: creditNotes.trim() || null,
    };

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const credit = await createTripCreditAction(input);
      setCredits((current) => [credit, ...current]);
      setCreditAmount('');
      setCreditNotes('');
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    if (!confirm('Supprimer ce credit ?')) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await deleteTripCreditAction(creditId);
      setCredits((current) => current.filter((credit) => credit.id !== creditId));
    } catch (error) {
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSplitParticipant = (participantId: string) => {
    setExpenseSplitIds((current) => {
      if (current.includes(participantId)) {
        return current.filter((id) => id !== participantId);
      }
      return [...current, participantId];
    });
  };

  const inputClass =
    'h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800';
  const areaClass =
    'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800';
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500';

  return (
    <main className="min-h-screen bg-[#050506] px-3 py-4 text-zinc-100 premium-glow-bg sm:px-5 lg:px-8">
      <div className="saas-grid" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="glass-panel rounded-[24px] border border-zinc-800/70 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/"
                className="mb-4 inline-flex h-10 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/65 px-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Marseille trip calculator
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                Voyage
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Ajoute les participants, les depenses payees sur place et les credits issus des 50% de benefice ajuste. Le calculateur sort ensuite qui doit quoi, avec les credits appliques aux montants dus a la personne marquee comme Moi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[680px]">
              {[
                { label: 'Depenses', value: formatCurrency(ledger.totalExpenses), icon: ReceiptText },
                { label: 'Credits 50%', value: formatCurrency(ledger.totalCredits), icon: Banknote },
                { label: 'Couvert', value: formatCurrency(ledger.totalCoveredByCredits), icon: Check },
                { label: 'A regler', value: formatCurrency(ledger.totalDueNow), icon: Calculator },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-[20px] border border-zinc-800/70 bg-zinc-950/45 p-3">
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{metric.label}</p>
                    <p className="mt-1 font-mono-numbers text-sm font-semibold text-zinc-100">{metric.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/25 px-4 py-3 text-sm text-rose-200">
            {errorMsg}
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <form onSubmit={handleAddParticipant} className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-zinc-300">
                  <UsersRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Participants</h2>
                  <p className="text-sm text-zinc-500">Trois, quatre, cinq: tu choisis par depense.</p>
                </div>
              </div>

              <label className={labelClass}>Nom</label>
              <input
                value={participantName}
                onChange={(event) => setParticipantName(event.target.value)}
                placeholder="Ex: Moi, Anis, Walid"
                className={inputClass}
              />

              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={participantIsMe}
                  onChange={(event) => setParticipantIsMe(event.target.checked)}
                  className="h-4 w-4 accent-zinc-100"
                />
                C&apos;est moi
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>

              <div className="mt-5 space-y-2">
                {participants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                    Ajoute les personnes du voyage pour commencer.
                  </div>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{participant.name}</p>
                        <p className="text-xs text-zinc-500">{participant.is_me ? 'Moi - les credits peuvent compenser les dettes envers toi' : 'Participant'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!participant.is_me && (
                          <button
                            type="button"
                            onClick={() => handleSetMe(participant.id)}
                            className="rounded-xl border border-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
                          >
                            Moi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteParticipant(participant.id)}
                          className="rounded-xl p-2 text-zinc-500 transition hover:bg-rose-950/20 hover:text-rose-300"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </form>

            <form onSubmit={handleAddCredit} className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-900/50 bg-emerald-950/20 text-emerald-300">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Credits 50%</h2>
                  <p className="text-sm text-zinc-500">Argent disponible depuis le benefice ajuste.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Pour qui</label>
                  <select
                    value={creditParticipantId}
                    onChange={(event) => setCreditParticipantId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choisir</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Montant</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditAmount}
                    onChange={(event) => setCreditAmount(event.target.value)}
                    placeholder="Ex: 250"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={creditDate}
                    onChange={(event) => setCreditDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Source</label>
                  <input
                    value={creditSource}
                    onChange={(event) => setCreditSource(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <label className={`${labelClass} mt-3`}>Note</label>
              <textarea
                rows={2}
                value={creditNotes}
                onChange={(event) => setCreditNotes(event.target.value)}
                placeholder="Ex: payout du 12 juillet"
                className={areaClass}
              />

              <button
                type="submit"
                disabled={isSubmitting || participants.length === 0}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Plus className="h-4 w-4" />
                Ajouter un credit
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleAddExpense} className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-zinc-300">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Nouvelle depense</h2>
                    <p className="text-sm text-zinc-500">Choisis qui a paye et entre qui participe au split.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseSplitIds(participants.map((participant) => participant.id))}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-800 px-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                >
                  Diviser entre tous
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className={labelClass}>Description</label>
                  <input
                    value={expenseDescription}
                    onChange={(event) => setExpenseDescription(event.target.value)}
                    placeholder="Ex: Hotel, Uber, restaurant"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Montant</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                    placeholder="Ex: 120"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Paye par</label>
                  <select
                    value={expensePayerId}
                    onChange={(event) => setExpensePayerId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choisir</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <label className={labelClass}>Split entre</label>
                  <div className="flex flex-wrap gap-2">
                    {participants.length === 0 ? (
                      <span className="rounded-2xl border border-dashed border-zinc-800 px-4 py-2 text-sm text-zinc-500">
                        Ajoute des participants d&apos;abord.
                      </span>
                    ) : (
                      participants.map((participant) => {
                        const selected = expenseSplitIds.includes(participant.id);
                        return (
                          <button
                            type="button"
                            key={participant.id}
                            onClick={() => toggleSplitParticipant(participant.id)}
                            className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${
                              selected
                                ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                                : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
                            }`}
                          >
                            {selected && <Check className="h-4 w-4" />}
                            {participant.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <label className={`${labelClass} mt-3`}>Note</label>
              <textarea
                rows={2}
                value={expenseNotes}
                onChange={(event) => setExpenseNotes(event.target.value)}
                placeholder="Contexte, recu, reservation..."
                className={areaClass}
              />

              <button
                type="submit"
                disabled={isSubmitting || participants.length === 0}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Plus className="h-4 w-4" />
                Ajouter la depense
              </button>
            </form>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-zinc-100">Qui doit quoi</h2>
                {participants.length === 0 ? (
                  <EmptyBlock text="Ajoute les participants pour voir les remboursements." />
                ) : ledger.transfers.length === 0 ? (
                  <EmptyBlock text="Tout est equilibre pour le moment." />
                ) : (
                  <div className="space-y-3">
                    {ledger.transfers.map((transfer) => {
                      const from = participantById.get(transfer.fromId);
                      const to = participantById.get(transfer.toId);
                      if (!from || !to) return null;

                      return (
                        <div key={`${transfer.fromId}-${transfer.toId}-${transfer.rawAmount}`} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-zinc-100">
                                {from.name} doit {formatCurrency(transfer.amountDue)} a {to.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Dette brute: {formatCurrency(transfer.rawAmount)}
                                {transfer.creditApplied > 0 && ` · credit utilise: ${formatCurrency(transfer.creditApplied)}`}
                              </p>
                            </div>
                            {transfer.amountDue <= 0.005 ? (
                              <span className="self-start rounded-full border border-emerald-900/60 bg-emerald-950/25 px-3 py-1 text-xs font-semibold text-emerald-300">
                                couvert
                              </span>
                            ) : (
                              <span className="self-start rounded-full border border-amber-900/60 bg-amber-950/25 px-3 py-1 text-xs font-semibold text-amber-300">
                                a payer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-zinc-100">Soldes par personne</h2>
                {ledger.summaries.length === 0 ? (
                  <EmptyBlock text="Aucun solde a afficher." />
                ) : (
                  <div className="space-y-3">
                    {ledger.summaries.map((summary) => (
                      <div key={summary.participant.id} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <UserRound className="h-4 w-4 shrink-0 text-zinc-500" />
                            <p className="truncate text-sm font-semibold text-zinc-100">
                              {summary.participant.name}
                              {summary.participant.is_me ? ' · Moi' : ''}
                            </p>
                          </div>
                          <span className={`font-mono-numbers text-sm font-semibold ${summary.rawBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {summary.rawBalance >= 0 ? '+' : ''}
                            {formatCurrency(summary.rawBalance)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-4">
                          <MiniStat label="Paye" value={formatCurrency(summary.paid)} />
                          <MiniStat label="Part" value={formatCurrency(summary.share)} />
                          <MiniStat label="Credit" value={formatCurrency(summary.credits)} />
                          <MiniStat label="Reste credit" value={formatCurrency(summary.creditLeft)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <HistoryCard
                title="Depenses"
                emptyText="Aucune depense ajoutee."
                items={expenses.map((expense) => {
                  const payer = participantById.get(expense.paid_by_participant_id)?.name || 'Inconnu';
                  const splitNames = (splitsByExpenseId.get(expense.id) || [])
                    .map((participantId) => participantById.get(participantId)?.name)
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <HistoryRow
                      key={expense.id}
                      title={expense.description}
                      detail={`${formatDate(expense.expense_date)} · paye par ${payer} · split: ${splitNames || 'aucun'}`}
                      amount={formatCurrency(Number(expense.amount || 0))}
                      onDelete={() => handleDeleteExpense(expense.id)}
                    />
                  );
                })}
              />

              <HistoryCard
                title="Credits"
                emptyText="Aucun credit ajoute."
                items={credits.map((credit) => {
                  const participant = participantById.get(credit.participant_id)?.name || 'Inconnu';
                  return (
                    <HistoryRow
                      key={credit.id}
                      title={credit.source_label}
                      detail={`${formatDate(credit.credit_date)} · pour ${participant}${credit.notes ? ` · ${credit.notes}` : ''}`}
                      amount={formatCurrency(Number(credit.amount || 0))}
                      onDelete={() => handleDeleteCredit(credit.id)}
                    />
                  );
                })}
              />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">{label}</p>
      <p className="mt-1 font-mono-numbers text-[11px] font-semibold text-zinc-300">{value}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function HistoryCard({ title, emptyText, items }: { title: string; emptyText: string; items: ReactNode[] }) {
  return (
    <div className="glass-card rounded-[24px] border border-zinc-800/70 p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-zinc-100">{title}</h2>
      {items.length === 0 ? <EmptyBlock text={emptyText} /> : <div className="space-y-2">{items}</div>}
    </div>
  );
}

function HistoryRow({
  title,
  detail,
  amount,
  onDelete,
}: {
  title: string;
  detail: string;
  amount: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono-numbers text-sm font-semibold text-zinc-200">{amount}</span>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl p-2 text-zinc-500 transition hover:bg-rose-950/20 hover:text-rose-300"
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
