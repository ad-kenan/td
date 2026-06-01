'use client';

import { useState } from 'react';
import { Trader } from '@/lib/db';
import { UserPlus, Edit2, Trash2, Globe, Users, X } from 'lucide-react';

interface DashboardHeaderProps {
  traders: Trader[];
  challengeCount: number;
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
  onAddTrader: (name: string) => Promise<void>;
  onEditTrader: (id: string, name: string) => Promise<void>;
  onDeleteTrader: (id: string) => Promise<void>;
}

export default function DashboardHeader({
  traders,
  challengeCount,
  selectedTraderId,
  onSelectTrader,
  onAddTrader,
  onEditTrader,
  onDeleteTrader,
}: DashboardHeaderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const activeTrader = traders.find((t) => t.id === selectedTraderId);
  const activeLabel = activeTrader ? activeTrader.name : 'Vue globale';

  const closeOverlay = () => {
    setIsAdding(false);
    setIsEditing(false);
    setNameInput('');
  };

  const profileCountLabel = `${traders.length} ${traders.length > 1 || traders.length === 0 ? 'profils' : 'profil'}`;
  const challengeCountLabel = `${challengeCount} ${challengeCount > 1 || challengeCount === 0 ? 'challenges visibles' : 'challenge visible'}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      await onAddTrader(nameInput.trim());
      closeOverlay();
    } catch (err: any) {
      alert(err.message || 'Une erreur est survenue');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !selectedTraderId || selectedTraderId === 'all') return;
    try {
      await onEditTrader(selectedTraderId, nameInput.trim());
      closeOverlay();
    } catch (err: any) {
      alert(err.message || 'Une erreur est survenue');
    }
  };

  const handleDelete = async () => {
    if (!selectedTraderId || selectedTraderId === 'all') return;
    const confirmMsg = `Êtes-vous sûr de vouloir supprimer définitivement le profil "${activeTrader?.name}" ? Tous les challenges associés seront effacés.`;
    if (confirm(confirmMsg)) {
      try {
        await onDeleteTrader(selectedTraderId);
      } catch (err: any) {
        alert(err.message || 'Une erreur est survenue');
      }
    }
  };

  const startEdit = () => {
    if (!activeTrader) return;
    setNameInput(activeTrader.name);
    setIsAdding(false);
    setIsEditing(true);
  };

  return (
    <header className="glass-panel relative rounded-[24px] border border-zinc-800/70 p-4 sm:p-5 lg:p-6 animate-fade-in">
      <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(480px,700px)] lg:items-end">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-lg shadow-black/20">
              <Globe className="h-5 w-5 text-zinc-100 animate-spin-slow" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Trading control center
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                Hedge Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-[15px]">
                Suivez vos profils, vos challenges et votre performance dans une interface plus claire, plus propre et plus simple à utiliser.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-zinc-200">
              {selectedTraderId === 'all' ? 'Vue globale active' : `Profil actif : ${activeLabel}`}
            </span>
            <span className="rounded-full border border-zinc-800/80 bg-zinc-950/40 px-3 py-1.5 text-zinc-400">
              {profileCountLabel}
            </span>
            <span className="rounded-full border border-zinc-800/80 bg-zinc-950/40 px-3 py-1.5 text-zinc-400">
              {challengeCountLabel}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Profil affiché
          </label>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 items-center rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 shadow-inner shadow-black/10">
              <Users className="mr-3 h-4 w-4 shrink-0 text-zinc-500" />
              <select
                value={selectedTraderId}
                onChange={(e) => onSelectTrader(e.target.value)}
                className="h-11 w-full appearance-none bg-transparent text-sm font-medium text-zinc-100 outline-none"
              >
                <option value="all">Vue globale consolidée</option>
                {traders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
              <button
                onClick={() => {
                  setNameInput('');
                  setIsEditing(false);
                  setIsAdding(true);
                }}
                className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-950 hover:text-white"
                title="Créer un nouveau profil"
              >
                <UserPlus className="h-4 w-4" />
                Nouveau profil
              </button>

              {selectedTraderId !== 'all' && (
                <>
                  <button
                    onClick={startEdit}
                    className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-950 hover:text-white"
                    title="Modifier le nom du profil"
                  >
                    <Edit2 className="h-4 w-4" />
                    Renommer
                  </button>

                  <button
                    onClick={handleDelete}
                    className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-semibold text-zinc-300 transition hover:border-rose-900/70 hover:bg-rose-950/20 hover:text-rose-300"
                    title="Supprimer le profil"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {(isAdding || isEditing) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 p-4 backdrop-blur-md animate-fade-in"
          onClick={closeOverlay}
        >
          <div
            className="glass-panel relative w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-800/70 p-5 shadow-2xl shadow-black/40 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

            <div className="relative mb-5 flex items-center justify-between border-b border-zinc-800/70 pb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                  {isAdding ? 'Créer un profil' : 'Modifier le nom'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {isAdding
                    ? 'Ajoutez un nouveau trader pour commencer à rattacher ses challenges.'
                    : 'Mettez à jour le nom affiché dans votre dashboard.'}
                </p>
              </div>
              <button
                onClick={closeOverlay}
                className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={isAdding ? handleCreate : handleUpdate} className="relative space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Nom du profil
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Walid, Anis..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-100 outline-none transition focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
                  autoFocus
                />
                <p className="mt-2 text-sm text-zinc-500">
                  Exemple : Walid, Anis, Team A...
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-800 px-4 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white"
                >
                  {isAdding ? 'Créer' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
