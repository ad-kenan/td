'use client';

import { useState, useEffect } from 'react';
import { Trader, Challenge } from '@/lib/db';
import { useTraderStore } from '@/store/useTraderStore';
import DashboardHeader from './DashboardHeader';
import KPICards from './KPICards';
import AnalyticsCharts from './AnalyticsCharts';
import ChallengesGrid from './ChallengesGrid';
import ChallengeModal from './ChallengeModal';
import {
  createTraderAction,
  updateTraderAction,
  deleteTraderAction,
  createChallengeAction,
  updateChallengeAction,
  deleteChallengeAction,
} from '@/app/actions';

interface DashboardViewProps {
  initialTraders: Trader[];
  initialChallenges: Challenge[];
}

export default function DashboardView({
  initialTraders,
  initialChallenges,
}: DashboardViewProps) {
  const {
    traders,
    challenges,
    selectedTraderId,
    setTraders,
    setChallenges,
    setSelectedTraderId,
    addTrader,
    removeTrader,
    addChallenge,
    updateChallengeInStore,
    removeChallenge,
  } = useTraderStore();

  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const canAddChallenge = selectedTraderId !== 'all';

  // Initialize store with server data
  useEffect(() => {
    setTraders(initialTraders);
    setChallenges(initialChallenges);
  }, [initialTraders, initialChallenges, setTraders, setChallenges]);

  // Filter challenges based on selection
  const filteredChallenges = selectedTraderId === 'all'
    ? challenges
    : challenges.filter((c) => c.trader_id === selectedTraderId);

  // ----------------------------------------------------
  // ID (TRADER) HANDLERS
  // ----------------------------------------------------
  const handleAddTrader = async (name: string) => {
    const newTrader = await createTraderAction(name);
    addTrader(newTrader);
  };

  const handleEditTrader = async (id: string, name: string) => {
    const updated = await updateTraderAction(id, name);
    setTraders(traders.map((t) => (t.id === id ? updated : t)));
  };

  const handleDeleteTrader = async (id: string) => {
    await deleteTraderAction(id);
    removeTrader(id);
  };

  // ----------------------------------------------------
  // CHALLENGE HANDLERS
  // ----------------------------------------------------
  const handleSaveChallenge = async (challengeData: any) => {
    if (editingChallenge) {
      const updated = await updateChallengeAction(editingChallenge.id, challengeData);
      updateChallengeInStore(updated);
    } else {
      const created = await createChallengeAction(challengeData);
      addChallenge(created);
    }
  };

  const handleTriggerEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setIsChallengeModalOpen(true);
  };

  const handleTriggerAddChallenge = () => {
    if (!canAddChallenge) {
      alert('Sélectionnez un profil avant de créer un challenge.');
      return;
    }

    setEditingChallenge(null);
    setIsChallengeModalOpen(true);
  };

  const handleDeleteChallenge = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce challenge ?')) {
      await deleteChallengeAction(id);
      removeChallenge(id);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030303] px-3 py-4 text-zinc-100 premium-glow-bg sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
      <div className="saas-grid" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1680px] flex-col gap-4 sm:gap-5">
        <DashboardHeader
          traders={traders}
          challengeCount={filteredChallenges.length}
          selectedTraderId={selectedTraderId}
          onSelectTrader={setSelectedTraderId}
          onAddTrader={handleAddTrader}
          onEditTrader={handleEditTrader}
          onDeleteTrader={handleDeleteTrader}
        />

        <KPICards challenges={filteredChallenges} />

        <AnalyticsCharts challenges={filteredChallenges} />

        <ChallengesGrid
          challenges={filteredChallenges}
          onEditChallenge={handleTriggerEditChallenge}
          onDeleteChallenge={handleDeleteChallenge}
          onAddChallenge={handleTriggerAddChallenge}
          canAddChallenge={canAddChallenge}
        />

        {isChallengeModalOpen && (
          <ChallengeModal
            isOpen={isChallengeModalOpen}
            onClose={() => setIsChallengeModalOpen(false)}
            onSave={handleSaveChallenge}
            traderId={selectedTraderId}
            challenge={editingChallenge}
          />
        )}
      </div>
    </div>
  );
}
