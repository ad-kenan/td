import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Interfaces for our data model
export interface Trader {
  id: string;
  name: string;
  created_at?: string;
}

export interface Challenge {
  id: string;
  trader_id: string;
  account_name: string;
  purchase_date: string; // YYYY-MM-DD
  cost: number; // Price paid, e.g., -84.0
  phase2_day1: number | null;
  phase3_day2: number | null;
  phase4_funded_day1: number | null;
  phase5_funded_day2: number | null;
  phase6_funded_day3: number | null;
  phase7_funded_day4: number | null;
  phase8_funded_day5: number | null;
  phase9_payout: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payout {
  id: string;
  trader_id: string;
  amount: number;
  payout_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at?: string;
}

export interface TripParticipant {
  id: string;
  name: string;
  is_me: boolean;
  created_at?: string;
}

export interface TripExpense {
  id: string;
  description: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  paid_by_participant_id: string;
  notes: string | null;
  created_at?: string;
}

export interface TripExpenseSplit {
  expense_id: string;
  participant_id: string;
}

export interface TripCredit {
  id: string;
  participant_id: string;
  amount: number;
  credit_date: string; // YYYY-MM-DD
  source_label: string;
  notes: string | null;
  created_at?: string;
}

export interface TripData {
  participants: TripParticipant[];
  expenses: TripExpense[];
  splits: TripExpenseSplit[];
  credits: TripCredit[];
}

export interface CreateTripExpenseInput {
  description: string;
  amount: number;
  expense_date: string;
  paid_by_participant_id: string;
  split_participant_ids: string[];
  notes: string | null;
}

export interface CreateTripCreditInput {
  participant_id: string;
  amount: number;
  credit_date: string;
  source_label: string;
  notes: string | null;
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL_PROD;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

const isSupabaseEnabled = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

// Local JSON Fallback Configuration
const LOCAL_DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

interface LocalDB {
  traders: Trader[];
  challenges: Challenge[];
  payouts: Payout[];
  trip_participants: TripParticipant[];
  trip_expenses: TripExpense[];
  trip_expense_splits: TripExpenseSplit[];
  trip_credits: TripCredit[];
}

const createEmptyLocalDB = (): LocalDB => ({
  traders: [],
  challenges: [],
  payouts: [],
  trip_participants: [],
  trip_expenses: [],
  trip_expense_splits: [],
  trip_credits: [],
});

function initLocalDB(): LocalDB {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDB = createEmptyLocalDB();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
    return defaultDB;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.payouts) {
      parsed.payouts = [];
    }
    if (!parsed.trip_participants) {
      parsed.trip_participants = [];
    }
    if (!parsed.trip_expenses) {
      parsed.trip_expenses = [];
    }
    if (!parsed.trip_expense_splits) {
      parsed.trip_expense_splits = [];
    }
    if (!parsed.trip_credits) {
      parsed.trip_credits = [];
    }
    return parsed;
  } catch (e) {
    console.error('Error reading local DB, resetting:', e);
    const defaultDB = createEmptyLocalDB();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
    return defaultDB;
  }
}

function saveLocalDB(data: LocalDB) {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------------------------------------------
// DATABASE API ACTIONS (TRADERS)
// ----------------------------------------------------

export async function getTraders(): Promise<Trader[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('traders')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Supabase getTraders error:', error.message);
    } else if (data) {
      return data;
    }
  }

  // Local JSON fallback
  const db = initLocalDB();
  return db.traders.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTrader(name: string): Promise<Trader> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Name cannot be empty');

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('traders')
      .insert([{ id: newId, name: cleanName }])
      .select()
      .single();
    if (error) {
      console.error('Supabase createTrader error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  if (db.traders.some((t) => t.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('A trader with this name already exists');
  }
  const newTrader: Trader = {
    id: newId,
    name: cleanName,
    created_at: new Date().toISOString(),
  };
  db.traders.push(newTrader);
  saveLocalDB(db);
  return newTrader;
}

export async function updateTrader(id: string, name: string): Promise<Trader> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Name cannot be empty');

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('traders')
      .update({ name: cleanName })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase updateTrader error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  const index = db.traders.findIndex((t) => t.id === id);
  if (index === -1) throw new Error('Trader not found');
  if (db.traders.some((t) => t.id !== id && t.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('A trader with this name already exists');
  }
  db.traders[index].name = cleanName;
  saveLocalDB(db);
  return db.traders[index];
}

export async function deleteTrader(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('traders')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deleteTrader error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  // Local JSON fallback
  const db = initLocalDB();
  db.traders = db.traders.filter((t) => t.id !== id);
  // Cascade delete challenges
  db.challenges = db.challenges.filter((c) => c.trader_id !== id);
  // Cascade delete payouts
  db.payouts = db.payouts.filter((p) => p.trader_id !== id);
  saveLocalDB(db);
}

// ----------------------------------------------------
// DATABASE API ACTIONS (CHALLENGES)
// ----------------------------------------------------

export async function getChallenges(traderId?: string): Promise<Challenge[]> {
  if (isSupabaseEnabled && supabase) {
    let query = supabase.from('challenges').select('*');
    if (traderId) {
      query = query.eq('trader_id', traderId);
    }
    const { data, error } = await query.order('purchase_date', { ascending: false });
    if (error) {
      console.error('Supabase getChallenges error:', error.message);
    } else if (data) {
      return data;
    }
  }

  // Local JSON fallback
  const db = initLocalDB();
  let list = db.challenges;
  if (traderId) {
    list = list.filter((c) => c.trader_id === traderId);
  }
  return list.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
}

export async function createChallenge(challenge: Omit<Challenge, 'id'>): Promise<Challenge> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const cleanChallenge = {
    ...challenge,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('challenges')
      .insert([cleanChallenge])
      .select()
      .single();
    if (error) {
      console.error('Supabase createChallenge error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  db.challenges.push(cleanChallenge);
  saveLocalDB(db);
  return cleanChallenge;
}

export async function updateChallenge(id: string, challenge: Partial<Omit<Challenge, 'id' | 'trader_id'>>): Promise<Challenge> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('challenges')
      .update({ ...challenge, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase updateChallenge error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  const index = db.challenges.findIndex((c) => c.id === id);
  if (index === -1) throw new Error('Challenge not found');

  db.challenges[index] = {
    ...db.challenges[index],
    ...challenge,
    updated_at: new Date().toISOString(),
  };
  saveLocalDB(db);
  return db.challenges[index];
}

export async function deleteChallenge(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deleteChallenge error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  // Local JSON fallback
  const db = initLocalDB();
  db.challenges = db.challenges.filter((c) => c.id !== id);
  saveLocalDB(db);
}

// ----------------------------------------------------
// DATABASE API ACTIONS (PAYOUTS / RETRAITS PERSO)
// ----------------------------------------------------

export async function getPayouts(traderId?: string): Promise<Payout[]> {
  if (isSupabaseEnabled && supabase) {
    let query = supabase.from('payouts').select('*');
    if (traderId) {
      query = query.eq('trader_id', traderId);
    }
    const { data, error } = await query.order('payout_date', { ascending: false });
    if (error) {
      console.error('Supabase getPayouts error:', error.message);
    } else if (data) {
      return data;
    }
  }

  // Local JSON fallback
  const db = initLocalDB();
  let list = db.payouts || [];
  if (traderId) {
    list = list.filter((p) => p.trader_id === traderId);
  }
  return list.sort((a, b) => new Date(b.payout_date).getTime() - new Date(a.payout_date).getTime());
}

export async function createPayout(payout: Omit<Payout, 'id'>): Promise<Payout> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const cleanPayout = {
    ...payout,
    id: newId,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('payouts')
      .insert([cleanPayout])
      .select()
      .single();
    if (error) {
      console.error('Supabase createPayout error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  if (!db.payouts) db.payouts = [];
  db.payouts.push(cleanPayout);
  saveLocalDB(db);
  return cleanPayout;
}

export async function updatePayout(id: string, payout: Partial<Omit<Payout, 'id' | 'trader_id'>>): Promise<Payout> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('payouts')
      .update(payout)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase updatePayout error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  // Local JSON fallback
  const db = initLocalDB();
  if (!db.payouts) db.payouts = [];
  const index = db.payouts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Payout not found');

  db.payouts[index] = {
    ...db.payouts[index],
    ...payout,
  };
  saveLocalDB(db);
  return db.payouts[index];
}

export async function deletePayout(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deletePayout error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  // Local JSON fallback
  const db = initLocalDB();
  if (!db.payouts) db.payouts = [];
  db.payouts = db.payouts.filter((p) => p.id !== id);
  saveLocalDB(db);
}

// ----------------------------------------------------
// DATABASE API ACTIONS (TRIP EXPENSE CALCULATOR)
// ----------------------------------------------------

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
}

export async function getTripData(): Promise<TripData> {
  const [participants, expenses, splits, credits] = await Promise.all([
    getTripParticipants(),
    getTripExpenses(),
    getTripExpenseSplits(),
    getTripCredits(),
  ]);

  return { participants, expenses, splits, credits };
}

export async function getTripParticipants(): Promise<TripParticipant[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_participants')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase getTripParticipants error:', error.message);
    } else if (data) {
      return data;
    }
  }

  const db = initLocalDB();
  return db.trip_participants;
}

export async function createTripParticipant(name: string, isMe = false): Promise<TripParticipant> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Name cannot be empty');

  const participant: TripParticipant = {
    id: createId(),
    name: cleanName,
    is_me: isMe,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseEnabled && supabase) {
    if (isMe) {
      await supabase.from('trip_participants').update({ is_me: false }).eq('is_me', true);
    }

    const { data, error } = await supabase
      .from('trip_participants')
      .insert([participant])
      .select()
      .single();
    if (error) {
      console.error('Supabase createTripParticipant error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  const db = initLocalDB();
  if (db.trip_participants.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('A participant with this name already exists');
  }
  if (isMe) {
    db.trip_participants = db.trip_participants.map((p) => ({ ...p, is_me: false }));
  }
  db.trip_participants.push(participant);
  saveLocalDB(db);
  return participant;
}

export async function setTripParticipantAsMe(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error: resetError } = await supabase
      .from('trip_participants')
      .update({ is_me: false })
      .eq('is_me', true);
    if (resetError) {
      console.error('Supabase resetTripParticipantAsMe error:', resetError.message);
      throw new Error(resetError.message);
    }

    const { error } = await supabase
      .from('trip_participants')
      .update({ is_me: true })
      .eq('id', id);
    if (error) {
      console.error('Supabase setTripParticipantAsMe error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  const db = initLocalDB();
  db.trip_participants = db.trip_participants.map((p) => ({ ...p, is_me: p.id === id }));
  saveLocalDB(db);
}

export async function deleteTripParticipant(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('trip_participants')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deleteTripParticipant error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  const db = initLocalDB();
  const removedExpenseIds = db.trip_expenses
    .filter((expense) => expense.paid_by_participant_id === id)
    .map((expense) => expense.id);
  db.trip_participants = db.trip_participants.filter((p) => p.id !== id);
  db.trip_expenses = db.trip_expenses.filter((expense) => expense.paid_by_participant_id !== id);
  db.trip_expense_splits = db.trip_expense_splits.filter(
    (split) => split.participant_id !== id && !removedExpenseIds.includes(split.expense_id)
  );
  db.trip_credits = db.trip_credits.filter((credit) => credit.participant_id !== id);
  saveLocalDB(db);
}

export async function getTripExpenses(): Promise<TripExpense[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) {
      console.error('Supabase getTripExpenses error:', error.message);
    } else if (data) {
      return data;
    }
  }

  const db = initLocalDB();
  return db.trip_expenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
}

export async function getTripExpenseSplits(): Promise<TripExpenseSplit[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_expense_splits')
      .select('*');
    if (error) {
      console.error('Supabase getTripExpenseSplits error:', error.message);
    } else if (data) {
      return data;
    }
  }

  const db = initLocalDB();
  return db.trip_expense_splits;
}

export async function createTripExpense(input: CreateTripExpenseInput): Promise<{ expense: TripExpense; splits: TripExpenseSplit[] }> {
  const description = input.description.trim();
  if (!description) throw new Error('Description cannot be empty');
  if (!input.paid_by_participant_id) throw new Error('Select who paid');
  if (!input.expense_date) throw new Error('Expense date is required');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Amount must be greater than 0');
  if (input.split_participant_ids.length === 0) throw new Error('Select at least one participant for the split');

  const expense: TripExpense = {
    id: createId(),
    description,
    amount: input.amount,
    expense_date: input.expense_date,
    paid_by_participant_id: input.paid_by_participant_id,
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  const splitRows = Array.from(new Set(input.split_participant_ids)).map((participantId) => ({
    expense_id: expense.id,
    participant_id: participantId,
  }));

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_expenses')
      .insert([expense])
      .select()
      .single();
    if (error) {
      console.error('Supabase createTripExpense error:', error.message);
      throw new Error(error.message);
    }

    const { data: splits, error: splitError } = await supabase
      .from('trip_expense_splits')
      .insert(splitRows)
      .select();
    if (splitError) {
      await supabase.from('trip_expenses').delete().eq('id', expense.id);
      console.error('Supabase createTripExpenseSplits error:', splitError.message);
      throw new Error(splitError.message);
    }

    return { expense: data, splits: splits || [] };
  }

  const db = initLocalDB();
  db.trip_expenses.push(expense);
  db.trip_expense_splits.push(...splitRows);
  saveLocalDB(db);
  return { expense, splits: splitRows };
}

export async function deleteTripExpense(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('trip_expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deleteTripExpense error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  const db = initLocalDB();
  db.trip_expenses = db.trip_expenses.filter((expense) => expense.id !== id);
  db.trip_expense_splits = db.trip_expense_splits.filter((split) => split.expense_id !== id);
  saveLocalDB(db);
}

export async function getTripCredits(): Promise<TripCredit[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_credits')
      .select('*')
      .order('credit_date', { ascending: false });
    if (error) {
      console.error('Supabase getTripCredits error:', error.message);
    } else if (data) {
      return data;
    }
  }

  const db = initLocalDB();
  return db.trip_credits.sort((a, b) => new Date(b.credit_date).getTime() - new Date(a.credit_date).getTime());
}

export async function createTripCredit(input: CreateTripCreditInput): Promise<TripCredit> {
  if (!input.participant_id) throw new Error('Select a participant');
  if (!input.credit_date) throw new Error('Credit date is required');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Amount must be greater than 0');

  const credit: TripCredit = {
    id: createId(),
    participant_id: input.participant_id,
    amount: input.amount,
    credit_date: input.credit_date,
    source_label: input.source_label.trim() || '50% bénéfice ajusté',
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('trip_credits')
      .insert([credit])
      .select()
      .single();
    if (error) {
      console.error('Supabase createTripCredit error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }

  const db = initLocalDB();
  db.trip_credits.push(credit);
  saveLocalDB(db);
  return credit;
}

export async function deleteTripCredit(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('trip_credits')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Supabase deleteTripCredit error:', error.message);
      throw new Error(error.message);
    }
    return;
  }

  const db = initLocalDB();
  db.trip_credits = db.trip_credits.filter((credit) => credit.id !== id);
  saveLocalDB(db);
}
