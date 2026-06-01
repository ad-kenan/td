import { create } from 'zustand';
import { Trader, Challenge } from '@/lib/db';

interface TraderStore {
  traders: Trader[];
  challenges: Challenge[];
  selectedTraderId: string; // 'all' or specific trader ID
  
  setTraders: (traders: Trader[]) => void;
  setChallenges: (challenges: Challenge[]) => void;
  setSelectedTraderId: (id: string) => void;
  
  // Optimistic updates helper
  addTrader: (trader: Trader) => void;
  removeTrader: (id: string) => void;
  addChallenge: (challenge: Challenge) => void;
  updateChallengeInStore: (challenge: Challenge) => void;
  removeChallenge: (id: string) => void;
}

export const useTraderStore = create<TraderStore>((set) => ({
  traders: [],
  challenges: [],
  selectedTraderId: 'all',
  
  setTraders: (traders) => set({ traders }),
  setChallenges: (challenges) => set({ challenges }),
  setSelectedTraderId: (id) => set({ selectedTraderId: id }),
  
  addTrader: (trader) => set((state) => ({
    traders: [...state.traders, trader].sort((a, b) => a.name.localeCompare(b.name)),
    selectedTraderId: trader.id, // Auto-select newly created trader
  })),
  
  removeTrader: (id) => set((state) => {
    const updatedTraders = state.traders.filter((t) => t.id !== id);
    const newSelectedId = state.selectedTraderId === id ? 'all' : state.selectedTraderId;
    return {
      traders: updatedTraders,
      challenges: state.challenges.filter((c) => c.trader_id !== id),
      selectedTraderId: newSelectedId,
    };
  }),
  
  addChallenge: (challenge) => set((state) => ({
    challenges: [challenge, ...state.challenges].sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()),
  })),
  
  updateChallengeInStore: (challenge) => set((state) => ({
    challenges: state.challenges.map((c) => (c.id === challenge.id ? challenge : c)),
  })),
  
  removeChallenge: (id) => set((state) => ({
    challenges: state.challenges.filter((c) => c.id !== id),
  })),
}));
