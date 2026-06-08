'use client';

import { useState, useEffect } from 'react';
import { Payout } from '@/lib/db';
import { X, Save, AlertCircle } from 'lucide-react';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payoutData: any) => Promise<void>;
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
    'w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800';
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500';
  const sectionClass = 'rounded-[24px] border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5';

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
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-stretch justify-center p-0 sm:items-center sm:p-4">
        <div
          className="glass-panel flex h-screen w-full max-w-xl flex-col border border-zinc-800/70 bg-[#080809]/95 sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-zinc-800/70 px-4 py-4 sm:px-6">
            <div className="pr-4">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-100">
                {payout ? 'Modifier le retrait de bénéfices' : 'Enregistrer un retrait de bénéfices'}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Déclarez les fonds retirés des bénéfices ajustés pour ce trader.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="space-y-4">
                {isCreateBlocked && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Sélectionnez un profil précis avant de déclarer un retrait.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <section className={sectionClass}>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Montant retiré ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ex: 500.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={inputClass}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Date du retrait</label>
                      <input
                        type="date"
                        required
                        value={payoutDate}
                        onChange={(e) => setPayoutDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Commentaires / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Ex: Retrait Crypto, Virement bancaire, Payout mensuel..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`${inputClass} min-h-[80px] resize-y`}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-800/70 bg-[#080809]/95 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-800 px-4 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isCreateBlocked}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
