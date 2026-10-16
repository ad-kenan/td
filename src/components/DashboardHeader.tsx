'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Trader } from '@/lib/db';
import {
  Shield,
  ChevronDown,
  UserCheck,
  UserPlus,
  Edit2,
  Trash2,
  Plane,
  Plus,
  X,
  Layers,
  Calculator,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface DashboardHeaderProps {
  traders: Trader[];
  challengeCount: number;
  selectedTraderId: string;
  onSelectTrader: (id: string) => void;
  onAddTrader: (name: string) => Promise<void>;
  onEditTrader: (id: string, name: string) => Promise<void>;
  onDeleteTrader: (id: string) => Promise<void>;
  onAddChallenge?: () => void;
}

export default function DashboardHeader({
  traders,
  challengeCount,
  selectedTraderId,
  onSelectTrader,
  onAddTrader,
  onEditTrader,
  onDeleteTrader,
  onAddChallenge,
}: DashboardHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTrader = traders.find((t) => t.id === selectedTraderId);
  const activeLabel = activeTrader ? activeTrader.name : 'Vue globale consolidée';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Une erreur est survenue';
  };

  const closeOverlay = () => {
    setIsAdding(false);
    setIsEditing(false);
    setNameInput('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      await onAddTrader(nameInput.trim());
      closeOverlay();
      setIsProfileMenuOpen(false);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !selectedTraderId || selectedTraderId === 'all') return;
    try {
      await onEditTrader(selectedTraderId, nameInput.trim());
      closeOverlay();
      setIsProfileMenuOpen(false);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!selectedTraderId || selectedTraderId === 'all') return;
    const confirmMsg = `Êtes-vous sûr de vouloir supprimer définitivement le profil "${activeTrader?.name}" ? Tous les challenges associés seront effacés.`;
    if (confirm(confirmMsg)) {
      try {
        await onDeleteTrader(selectedTraderId);
        setIsProfileMenuOpen(false);
      } catch (err) {
        alert(getErrorMessage(err));
      }
    }
  };

  const startEdit = () => {
    if (!activeTrader) return;
    setNameInput(activeTrader.name);
    setIsProfileMenuOpen(false);
    setIsAdding(false);
    setIsEditing(true);
  };

  const startAdd = () => {
    setNameInput('');
    setIsProfileMenuOpen(false);
    setIsEditing(false);
    setIsAdding(true);
  };

  return (
    <header className="relative z-30 flex h-auto min-h-[64px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-xl transition-colors duration-200 dark:border-white/[0.06] dark:bg-[#0d0e12]/80 sm:px-5">
      {/* PÔLE GAUCHE : Logo + Titre + Sélecteur de Profil Contextuel */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Brand logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-950/40">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 transition-colors dark:text-zinc-100 sm:text-base">
            Hedge Dashboard
          </span>
        </div>

        {/* Separator divider */}
        <div className="hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />

        {/* Sélecteur de Profil Unifié (Dropdown Pill) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
            title="Changer de profil ou gérer les traders"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-600 dark:bg-violet-600/30 dark:text-violet-300">
              {activeTrader ? activeTrader.name.slice(0, 1).toUpperCase() : <Layers className="h-3 w-3" />}
            </div>
            <span className="max-w-[140px] truncate sm:max-w-[180px]">{activeLabel}</span>
            <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-normal text-slate-600 dark:bg-white/[0.05] dark:text-zinc-400">
              {challengeCount} ch.
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform dark:text-zinc-400 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu Déroulant des Profils & Actions */}
          {isProfileMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-2xl transition-all animate-fade-in z-50 dark:border-white/10 dark:bg-[#121318] dark:shadow-2xl dark:shadow-black/80">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Profils Traders ({traders.length})
              </div>

              {/* Vue globale */}
              <button
                onClick={() => {
                  onSelectTrader('all');
                  setIsProfileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${
                  selectedTraderId === 'all'
                    ? 'bg-violet-50 text-violet-700 font-semibold dark:bg-violet-600/20 dark:text-violet-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/[0.05] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                  <span>Vue globale consolidée</span>
                </div>
                {selectedTraderId === 'all' && <UserCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
              </button>

              {/* Liste des traders */}
              <div className="my-1 max-h-48 overflow-y-auto space-y-0.5">
                {traders.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTrader(t.id);
                      setIsProfileMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                      selectedTraderId === t.id
                        ? 'bg-violet-50 text-violet-700 font-semibold dark:bg-violet-600/20 dark:text-violet-200'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/[0.05] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {t.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate">{t.name}</span>
                    </div>
                    {selectedTraderId === t.id && <UserCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
                  </button>
                ))}
              </div>

              {/* Actions de gestion du profil */}
              <div className="border-t border-slate-100 pt-1 mt-1 space-y-0.5 dark:border-white/[0.06]">
                <button
                  onClick={startAdd}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  <UserPlus className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Nouveau profil</span>
                </button>

                {selectedTraderId !== 'all' && (
                  <>
                    <button
                      onClick={startEdit}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                      <span>Renommer ce profil</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Supprimer le profil</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PÔLE DROIT : ThemeToggle + Navigation transversale + Action Primaire */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Dark / Light / System */}
        <ThemeToggle />

        <Link
          href="/hedge"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-zinc-300 dark:hover:border-white/15 dark:hover:bg-white/[0.05] dark:hover:text-white"
          title="Calculateur de Hedge NQ"
        >
          <Calculator className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span>Hedge NQ</span>
        </Link>

        <Link
          href="/voyage"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-zinc-300 dark:hover:border-white/15 dark:hover:bg-white/[0.05] dark:hover:text-white"
          title="Calculateur de voyage"
        >
          <Plane className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Voyage</span>
        </Link>

        {onAddChallenge && (
          <button
            onClick={onAddChallenge}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-violet-950/30 transition hover:bg-violet-500 active:scale-95"
            title="Créer un nouveau challenge pour ce profil"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Nouveau Challenge</span>
          </button>
        )}
      </div>

      {/* MODALE D'AJOUT / RENOMMAGE DU PROFIL */}
      {(isAdding || isEditing) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-fade-in dark:bg-black/80 dark:backdrop-blur-md"
          onClick={closeOverlay}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition-all dark:border-white/10 dark:bg-[#121318] dark:shadow-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.06]">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                {isAdding ? 'Créer un profil' : 'Renommer le profil'}
              </h3>
              <button
                onClick={closeOverlay}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={isAdding ? handleCreate : handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Nom du trader
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Walid, Adnane..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 dark:border-white/10 dark:bg-black/50 dark:text-zinc-100"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 shadow-sm"
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
