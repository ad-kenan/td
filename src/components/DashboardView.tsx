'use client';

import { useState, useEffect } from 'react';
import { Trader, Challenge, Payout } from '@/lib/db';
import { useTraderStore } from '@/store/useTraderStore';
import DashboardHeader from './DashboardHeader';
import KPICards from './KPICards';
import AnalyticsCharts from './AnalyticsCharts';
import ChallengesGrid from './ChallengesGrid';
import ChallengeModal from './ChallengeModal';
import PayoutsGrid from './PayoutsGrid';
import PayoutModal from './PayoutModal';
import DailyProfitView from './DailyProfitView';
import InvestmentFilterBar from './InvestmentFilterBar';
import TraderRandomizerWidget from './TraderRandomizerWidget';
import HedgeCalculatorView from './HedgeCalculatorView';
import {
  createTraderAction,
  updateTraderAction,
  deleteTraderAction,
  createChallengeAction,
  updateChallengeAction,
  deleteChallengeAction,
  createPayoutAction,
  updatePayoutAction,
  deletePayoutAction,
} from '@/app/actions';

interface DashboardViewProps {
  initialTraders: Trader[];
  initialChallenges: Challenge[];
  initialPayouts: Payout[];
}

export default function DashboardView({
  initialTraders,
  initialChallenges,
  initialPayouts,
}: DashboardViewProps) {
  const {
    traders,
    challenges,
    payouts,
    selectedTraderId,
    setTraders,
    setChallenges,
    setPayouts,
    setSelectedTraderId,
    addTrader,
    removeTrader,
    addChallenge,
    updateChallengeInStore,
    removeChallenge,
    addPayout,
    updatePayoutInStore,
    removePayout,
  } = useTraderStore();

  const [activeTab, setActiveTab] = useState<'challenges' | 'payouts' | 'daily' | 'hedge'>('challenges');
  
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const canAddChallenge = selectedTraderId !== 'all';

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState<Payout | null>(null);
  const canAddPayout = selectedTraderId !== 'all';

  // Date and investment filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applyToAllViews, setApplyToAllViews] = useState(false);

  // Initialize store with server data
  useEffect(() => {
    setTraders(initialTraders);
    setChallenges(initialChallenges);
    setPayouts(initialPayouts);
  }, [initialTraders, initialChallenges, initialPayouts, setTraders, setChallenges, setPayouts]);

  // Filter challenges based on selection and optional global date filter
  const filteredChallenges = challenges.filter((c) => {
    if (selectedTraderId !== 'all' && c.trader_id !== selectedTraderId) return false;
    if (applyToAllViews) {
      if (startDate && c.purchase_date < startDate) return false;
      if (endDate && c.purchase_date > endDate) return false;
    }
    return true;
  });

  // Filter payouts based on selection and optional global date filter
  const filteredPayouts = payouts.filter((p) => {
    if (selectedTraderId !== 'all' && p.trader_id !== selectedTraderId) return false;
    if (applyToAllViews) {
      if (startDate && p.payout_date < startDate) return false;
      if (endDate && p.payout_date > endDate) return false;
    }
    return true;
  });

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
  const handleSaveChallenge = async (challengeData: Omit<Challenge, 'id'>) => {
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

  // ----------------------------------------------------
  // PAYOUT HANDLERS
  // ----------------------------------------------------
  const handleSavePayout = async (payoutData: Omit<Payout, 'id'>) => {
    if (editingPayout) {
      const updated = await updatePayoutAction(editingPayout.id, payoutData);
      updatePayoutInStore(updated);
    } else {
      const created = await createPayoutAction(payoutData);
      addPayout(created);
    }
  };

  const handleTriggerEditPayout = (payout: Payout) => {
    setEditingPayout(payout);
    setIsPayoutModalOpen(true);
  };

  const handleTriggerAddPayout = () => {
    if (!canAddPayout) {
      alert('Sélectionnez un profil avant de créer un retrait.');
      return;
    }

    setEditingPayout(null);
    setIsPayoutModalOpen(true);
  };

  const handleDeletePayout = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce retrait ?')) {
      await deletePayoutAction(id);
      removePayout(id);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 px-3 py-4 text-slate-900 transition-colors dark:bg-[#09090b] dark:text-zinc-100 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-3.5 sm:gap-4 lg:gap-5">
        <DashboardHeader
          traders={traders}
          challengeCount={filteredChallenges.length}
          selectedTraderId={selectedTraderId}
          onSelectTrader={setSelectedTraderId}
          onAddTrader={handleAddTrader}
          onEditTrader={handleEditTrader}
          onDeleteTrader={handleDeleteTrader}
          onAddChallenge={handleTriggerAddChallenge}
        />

        <TraderRandomizerWidget
          traders={traders}
          selectedTraderId={selectedTraderId}
          onSelectTrader={setSelectedTraderId}
        />

        <InvestmentFilterBar
          challenges={challenges}
          traders={traders}
          selectedTraderId={selectedTraderId}
          onSelectTrader={setSelectedTraderId}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          applyToAllViews={applyToAllViews}
          onToggleApplyToAllViews={setApplyToAllViews}
        />

        <KPICards
          challenges={filteredChallenges}
          payouts={filteredPayouts}
          startDate={applyToAllViews ? startDate : undefined}
          endDate={applyToAllViews ? endDate : undefined}
        />

        <AnalyticsCharts challenges={filteredChallenges} />

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 self-start rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-xs backdrop-blur-md transition-colors dark:border-white/[0.06] dark:bg-[#111216]/90">
          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition ${
              activeTab === 'challenges'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 dark:bg-white/10 dark:text-white dark:border-transparent'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-transparent dark:hover:text-zinc-200'
            }`}
          >
            Challenges
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'challenges' 
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' 
                : 'bg-slate-200/70 text-slate-600 dark:bg-white/[0.05] dark:text-zinc-500'
            }`}>
              {filteredChallenges.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition ${
              activeTab === 'payouts'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 dark:bg-white/10 dark:text-white dark:border-transparent'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-transparent dark:hover:text-zinc-200'
            }`}
          >
            Retraits
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'payouts' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                : 'bg-slate-200/70 text-slate-600 dark:bg-white/[0.05] dark:text-zinc-500'
            }`}>
              {filteredPayouts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition ${
              activeTab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 dark:bg-white/10 dark:text-white dark:border-transparent'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-transparent dark:hover:text-zinc-200'
            }`}
          >
            Journalier
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'daily' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                : 'bg-slate-200/70 text-slate-600 dark:bg-white/[0.05] dark:text-zinc-500'
            }`}>
              /jour
            </span>
          </button>
          <button
            onClick={() => setActiveTab('hedge')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition ${
              activeTab === 'hedge'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 dark:bg-white/10 dark:text-white dark:border-transparent'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-transparent dark:hover:text-zinc-200'
            }`}
          >
            Hedge Calculator
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'hedge' 
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' 
                : 'bg-slate-200/70 text-slate-600 dark:bg-white/[0.05] dark:text-zinc-500'
            }`}>
              NQ
            </span>
          </button>
        </div>

        {activeTab === 'challenges' && (
          <ChallengesGrid
            challenges={filteredChallenges}
            onEditChallenge={handleTriggerEditChallenge}
            onDeleteChallenge={handleDeleteChallenge}
            onAddChallenge={handleTriggerAddChallenge}
            canAddChallenge={canAddChallenge}
          />
        )}

        {activeTab === 'payouts' && (
          <PayoutsGrid
            payouts={filteredPayouts}
            traders={traders}
            selectedTraderId={selectedTraderId}
            onEditPayout={handleTriggerEditPayout}
            onDeletePayout={handleDeletePayout}
            onAddPayout={handleTriggerAddPayout}
            canAddPayout={canAddPayout}
          />
        )}

        {activeTab === 'daily' && (
          <DailyProfitView
            challenges={filteredChallenges}
            payouts={filteredPayouts}
            traders={traders}
            selectedTraderId={selectedTraderId}
          />
        )}

        {activeTab === 'hedge' && (
          <HedgeCalculatorView embedded />
        )}

        {isChallengeModalOpen && (
          <ChallengeModal
            isOpen={isChallengeModalOpen}
            onClose={() => setIsChallengeModalOpen(false)}
            onSave={handleSaveChallenge}
            traderId={selectedTraderId}
            challenge={editingChallenge}
          />
        )}

        {isPayoutModalOpen && (
          <PayoutModal
            isOpen={isPayoutModalOpen}
            onClose={() => setIsPayoutModalOpen(false)}
            onSave={handleSavePayout}
            traderId={selectedTraderId}
            payout={editingPayout}
          />
        )}
      </div>
    </div>
  );
}
