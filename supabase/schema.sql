-- SCHEMA FOR TRADING CHALLENGE TRACKER
-- Paste this in your Supabase SQL Editor

-- 1. Create traders table
CREATE TABLE IF NOT EXISTS public.traders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for traders (Optional, default public read/write for now)
ALTER TABLE public.traders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for traders" ON public.traders 
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID NOT NULL REFERENCES public.traders(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    cost NUMERIC NOT NULL, -- Montant Déboursé ($), negative in Excel, e.g., -84.00
    phase2_day1 NUMERIC,  -- Gain/Perte Challenge Jour 1
    phase3_day2 NUMERIC,  -- Gain/Perte Challenge Jour 2
    phase4_funded_day1 NUMERIC, -- Gain/Perte Funded Jour 1
    phase5_funded_day2 NUMERIC, -- Gain/Perte Funded Jour 2
    phase6_funded_day3 NUMERIC, -- Gain/Perte Funded Jour 3
    phase7_funded_day4 NUMERIC, -- Gain/Perte Funded Jour 4
    phase8_funded_day5 NUMERIC, -- Gain/Perte Funded Jour 5
    phase9_payout NUMERIC,      -- First Payout Funded
    notes TEXT,                 -- Colonne 1 / comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for challenges" ON public.challenges 
    FOR ALL USING (true) WITH CHECK (true);

-- Create helpful indices
CREATE INDEX IF NOT EXISTS idx_challenges_trader_id ON public.challenges(trader_id);
CREATE INDEX IF NOT EXISTS idx_challenges_purchase_date ON public.challenges(purchase_date DESC);
