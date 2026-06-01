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
}

function initLocalDB(): LocalDB {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDB: LocalDB = { traders: [], challenges: [] };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
    return defaultDB;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local DB, resetting:', e);
    const defaultDB: LocalDB = { traders: [], challenges: [] };
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
