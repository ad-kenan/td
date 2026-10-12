'use client';

import { useState, useEffect } from 'react';
import { Payout } from '@/lib/db';
import { X, Save, AlertCircle } from 'lucide-react';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payoutData: Omit<Payout, 'id'>) => Promise<void>;
  traderId: string;
  payout?: Payout | null;
}

export default function PayoutModal({
  isOpen,
  onClose,
  onSave,
  traderId,
  payout,
}: PayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payout) {
      setAmount(payout.amount ? String(payout.amount) : '');
      setPayoutDate(payout.payout_date || '');
      setNotes(payout.notes || '');
    } else {
      setAmount('');
      setPayoutDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setErrorMsg('');
  }, [payout, isOpen]);

  if (!isOpen) return null;

  const isCreateBlocked = !payout && traderId === 'all';

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30';
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400';
  const sectionClass = 'rounded-xl border border-white/[0.06] bg-black/30 p-4';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreateBlocked) {
      setErrorMsg("Sélectionnez d'abord un profil pour rattacher ce retrait.");
      return;
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Le montant doit être un nombre supérieur à 0.');
      return;
    }

    if (!payoutDate) {
      setErrorMsg('La date de retrait est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payoutData = {
        trader_id: payout ? payout.trader_id : traderId,
        amount: amountNum,
        payout_date: payoutDate,
        notes: notes.trim() || null,
      };

      await onSave(payoutData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-stretch justify-center p-0 sm:items-center sm:p-4">
        <div
          className="relative flex h-screen w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#121318] shadow-2xl shadow-black sm:h-auto sm:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">
                {payout ? 'Modifier le retrait' : 'Ajouter un retrait'}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Enregistrez un retrait de gains pour ajuster votre trésorerie.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
              {isCreateBlocked && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Sélectionnez un profil précis avant d&apos;enregistrer un retrait.</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={sectionClass}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Montant ($)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Ex: 1250"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Date de retrait</label>
                    <input
                      type="date"
                      required
                      value={payoutDate}
                      onChange={(e) => setPayoutDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelClass}>Notes ou référence</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Virement reçu sur compte..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCreateBlocked}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Enregistrement...' : 'Sauvegarder'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
