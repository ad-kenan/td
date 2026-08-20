'use client';

import { useState, useEffect } from 'react';
import { Challenge } from '@/lib/db';
import { X, Save, AlertCircle } from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (challengeData: Omit<Challenge, 'id'>) => Promise<void>;
  traderId: string;
  challenge?: Challenge | null;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  onSave,
  traderId,
  challenge,
}: ChallengeModalProps) {
  const [accountName, setAccountName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [cost, setCost] = useState('');
  const [phase2, setPhase2] = useState('');
  const [phase3, setPhase3] = useState('');
  const [phase4, setPhase4] = useState('');
  const [phase5, setPhase5] = useState('');
  const [phase6, setPhase6] = useState('');
  const [phase7, setPhase7] = useState('');
  const [phase8, setPhase8] = useState('');
  const [phase9, setPhase9] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (challenge) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountName(challenge.account_name || '');
      setPurchaseDate(challenge.purchase_date || '');
      setCost(challenge.cost ? String(Math.abs(challenge.cost)) : '');
      setPhase2(challenge.phase2_day1 !== null ? String(challenge.phase2_day1) : '');
      setPhase3(challenge.phase3_day2 !== null ? String(challenge.phase3_day2) : '');
      setPhase4(challenge.phase4_funded_day1 !== null ? String(challenge.phase4_funded_day1) : '');
      setPhase5(challenge.phase5_funded_day2 !== null ? String(challenge.phase5_funded_day2) : '');
      setPhase6(challenge.phase6_funded_day3 !== null ? String(challenge.phase6_funded_day3) : '');
      setPhase7(challenge.phase7_funded_day4 !== null ? String(challenge.phase7_funded_day4) : '');
      setPhase8(challenge.phase8_funded_day5 !== null ? String(challenge.phase8_funded_day5) : '');
      setPhase9(challenge.phase9_payout !== null ? String(challenge.phase9_payout) : '');
      setNotes(challenge.notes || '');
    } else {
      setAccountName('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setCost('');
      setPhase2('');
      setPhase3('');
      setPhase4('');
      setPhase5('');
      setPhase6('');
      setPhase7('');
      setPhase8('');
      setPhase9('');
      setNotes('');
    }

    setErrorMsg('');
  }, [challenge, isOpen]);

  if (!isOpen) return null;

  const isCreateBlocked = !challenge && traderId === 'all';

  const inputClass =
    'w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800';
  const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500';
  const sectionClass = 'rounded-[24px] border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5';

  const toNumOrNull = (val: string) => {
    if (val.trim() === '') return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreateBlocked) {
      setErrorMsg('Sélectionnez d\'abord un profil pour rattacher ce challenge.');
      return;
    }

    if (!accountName.trim()) {
      setErrorMsg('Le nom de compte est obligatoire.');
      return;
    }

    if (!purchaseDate) {
      setErrorMsg("La date d'achat est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const costNum = toNumOrNull(cost) || 0;
      const finalCost = -Math.abs(costNum);

      const challengeData = {
        trader_id: challenge ? challenge.trader_id : traderId,
        account_name: accountName.trim(),
        purchase_date: purchaseDate,
        cost: finalCost,
        phase2_day1: toNumOrNull(phase2),
        phase3_day2: toNumOrNull(phase3),
        phase4_funded_day1: toNumOrNull(phase4),
        phase5_funded_day2: toNumOrNull(phase5),
        phase6_funded_day3: toNumOrNull(phase6),
        phase7_funded_day4: toNumOrNull(phase7),
        phase8_funded_day5: toNumOrNull(phase8),
        phase9_payout: toNumOrNull(phase9),
        notes: notes.trim() || null,
      };

      await onSave(challengeData);
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
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-stretch justify-center p-0 sm:items-center sm:p-4">
        <div
          className="glass-panel flex h-screen w-full max-w-4xl flex-col border border-zinc-800/70 bg-[#080809]/95 sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-zinc-800/70 px-4 py-4 sm:px-6">
            <div className="pr-4">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-100">
                {challenge ? 'Modifier le challenge' : 'Ajouter un challenge'}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Renseigne les résultats du challenge pour garder un suivi clair et propre sur mobile comme sur desktop.
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
                    <span>Sélectionne un profil précis avant de créer un nouveau challenge.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <section className={sectionClass}>
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">1. Informations de base</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>Nom du compte</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: LFE050-TEST001"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Date d&apos;achat</label>
                      <input
                        type="date"
                        required
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Coût payé</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 84.00"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">2. Phases d&apos;évaluation</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Phase 2 - Jour 1</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 104.94 ou -85.97"
                        value={phase2}
                        onChange={(e) => setPhase2(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Phase 3 - Jour 2</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 198.71 ou -166.16"
                        value={phase3}
                        onChange={(e) => setPhase3(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">3. Phase funded et payout</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {[
                      { label: 'Funded J1', value: phase4, onChange: setPhase4 },
                      { label: 'Funded J2', value: phase5, onChange: setPhase5 },
                      { label: 'Funded J3', value: phase6, onChange: setPhase6 },
                      { label: 'Funded J4', value: phase7, onChange: setPhase7 },
                      { label: 'Funded J5', value: phase8, onChange: setPhase8 },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className={labelClass}>{field.label}</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className={labelClass}>Premier payout retiré</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1786.00"
                      value={phase9}
                      onChange={(e) => setPhase9(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">4. Notes</p>
                  </div>

                  <label className={labelClass}>Commentaires</label>
                  <textarea
                    rows={4}
                    placeholder="Notes complémentaires, rappel de recalcul, contexte du compte..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} min-h-[104px] resize-y`}
                  />
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
