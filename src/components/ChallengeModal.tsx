'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [closedDate, setClosedDate] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (challenge) {
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
      setClosedDate(challenge.closed_date || '');
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
      setClosedDate('');
      setNotes('');
    }

    setErrorMsg('');
  }, [challenge, isOpen]);

  const previewTotal = useMemo(() => {
    const costNum = cost.trim() !== '' ? -Math.abs(Number(cost) || 0) : 0;
    const p2 = Number(phase2) || 0;
    const p3 = Number(phase3) || 0;
    const p4 = Number(phase4) || 0;
    const p5 = Number(phase5) || 0;
    const p6 = Number(phase6) || 0;
    const p7 = Number(phase7) || 0;
    const p8 = Number(phase8) || 0;
    const p9 = Number(phase9) || 0;
    return costNum + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
  }, [cost, phase2, phase3, phase4, phase5, phase6, phase7, phase8, phase9]);

  if (!isOpen) return null;

  const isCreateBlocked = !challenge && traderId === 'all';

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs font-mono text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30';
  const labelClass = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400';
  const sectionClass = 'rounded-xl border border-white/[0.06] bg-black/30 p-4';

  const toNumOrNull = (val: string) => {
    if (val.trim() === '') return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreateBlocked) {
      setErrorMsg("Sélectionnez d'abord un profil pour rattacher ce challenge.");
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

    const costNum = Number(cost);
    if (cost.trim() !== '' && (Number.isNaN(costNum) || costNum < 0)) {
      setErrorMsg('Le coût doit être un nombre positif ou nul.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const challengeData: Omit<Challenge, 'id'> = {
        trader_id: challenge ? challenge.trader_id : traderId,
        account_name: accountName.trim(),
        purchase_date: purchaseDate,
        cost: cost.trim() !== '' ? -Math.abs(costNum) : 0,
        phase2_day1: toNumOrNull(phase2),
        phase3_day2: toNumOrNull(phase3),
        phase4_funded_day1: toNumOrNull(phase4),
        phase5_funded_day2: toNumOrNull(phase5),
        phase6_funded_day3: toNumOrNull(phase6),
        phase7_funded_day4: toNumOrNull(phase7),
        phase8_funded_day5: toNumOrNull(phase8),
        phase9_payout: toNumOrNull(phase9),
        closed_date: closedDate.trim() ? closedDate.trim() : null,
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-stretch justify-center p-0 sm:items-center sm:p-4">
        <div
          className="relative flex h-screen w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#121318] shadow-2xl shadow-black sm:h-auto sm:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">
                {challenge ? 'Modifier le challenge' : 'Ajouter un challenge'}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Saisissez les résultats et phases de votre compte de trading.
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
                  <span>Sélectionnez un profil précis avant de créer un nouveau challenge.</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Base info */}
              <section className={sectionClass}>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  1. Informations générales
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>Nom du compte</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: LFE050-TEST001"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className={inputClass}
                      autoFocus
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
                    <label className={labelClass}>Prix d&apos;achat ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 84.00"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Date de clôture
                      </label>
                      <button
                        type="button"
                        onClick={() => setClosedDate(new Date().toISOString().split('T')[0])}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300"
                      >
                        Aujourd&apos;hui
                      </button>
                    </div>
                    <input
                      type="date"
                      value={closedDate}
                      onChange={(e) => setClosedDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              {/* 2. Evaluation Phases */}
              <section className={sectionClass}>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  2. Phases d&apos;évaluation
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Phase 2 — Jour 1 ($)</label>
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
                    <label className={labelClass}>Phase 3 — Jour 2 ($)</label>
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

              {/* 3. Funded Phases & Payout */}
              <section className={sectionClass}>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  3. Phases Funded &amp; Payout
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
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

                <div className="mt-3">
                  <label className={labelClass}>Payout Retiré ($)</label>
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

              {/* 4. Notes */}
              <section className={sectionClass}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  4. Notes &amp; Observations
                </div>
                <textarea
                  rows={3}
                  placeholder="Notes complémentaires, contexte du compte, règles prop firm..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} font-sans resize-none`}
                />
              </section>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-medium">PnL Net Calculé :</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    previewTotal > 0
                      ? 'text-emerald-400'
                      : previewTotal < 0
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {previewTotal > 0 ? '+' : ''}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(previewTotal)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
