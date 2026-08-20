-- TRIP EXPENSE CALCULATOR
-- Adds a separate travel ledger for shared expenses, flexible splits, and
-- credits from 50% adjusted benefits.

CREATE TABLE IF NOT EXISTS public.trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_me BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_participants_single_me
    ON public.trip_participants (is_me)
    WHERE is_me = true;

ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for trip participants" ON public.trip_participants
    FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.trip_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    paid_by_participant_id UUID NOT NULL REFERENCES public.trip_participants(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for trip expenses" ON public.trip_expenses
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_paid_by ON public.trip_expenses(paid_by_participant_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_expense_date ON public.trip_expenses(expense_date DESC);

CREATE TABLE IF NOT EXISTS public.trip_expense_splits (
    expense_id UUID NOT NULL REFERENCES public.trip_expenses(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.trip_participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (expense_id, participant_id)
);

ALTER TABLE public.trip_expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for trip expense splits" ON public.trip_expense_splits
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trip_expense_splits_participant_id
    ON public.trip_expense_splits(participant_id);

CREATE TABLE IF NOT EXISTS public.trip_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.trip_participants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    credit_date DATE NOT NULL,
    source_label TEXT NOT NULL DEFAULT '50% bénéfice ajusté',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trip_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for trip credits" ON public.trip_credits
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trip_credits_participant_id ON public.trip_credits(participant_id);
CREATE INDEX IF NOT EXISTS idx_trip_credits_credit_date ON public.trip_credits(credit_date DESC);
