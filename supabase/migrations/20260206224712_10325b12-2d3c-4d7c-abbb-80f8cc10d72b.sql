-- Create round_history table to persist round entries linked to user accounts
CREATE TABLE public.round_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  budget_at_start integer NOT NULL,
  budget_spent integer NOT NULL,
  budget_remaining integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create round_history_items junction table for items in each round
CREATE TABLE public.round_history_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_history_id uuid NOT NULL REFERENCES public.round_history(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE
);

-- Enable RLS on both tables
ALTER TABLE public.round_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_history_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for round_history - users can only access their own history
CREATE POLICY "Users can view own round history"
  ON public.round_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own round history"
  ON public.round_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own round history"
  ON public.round_history FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for round_history_items - based on parent round_history ownership
CREATE POLICY "Users can view own round history items"
  ON public.round_history_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.round_history
      WHERE id = round_history_items.round_history_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own round history items"
  ON public.round_history_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.round_history
      WHERE id = round_history_items.round_history_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own round history items"
  ON public.round_history_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.round_history
      WHERE id = round_history_items.round_history_id
        AND user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX idx_round_history_user_id ON public.round_history(user_id);
CREATE INDEX idx_round_history_created_at ON public.round_history(created_at DESC);
CREATE INDEX idx_round_history_items_round_id ON public.round_history_items(round_history_id);