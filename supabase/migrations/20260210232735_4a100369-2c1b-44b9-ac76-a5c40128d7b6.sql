
-- Junction table: if an item has rows here, it's restricted to those characters only
-- If no rows exist for an item, it's available to all characters
CREATE TABLE public.item_character_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, character_id)
);

ALTER TABLE public.item_character_restrictions ENABLE ROW LEVEL SECURITY;

-- Publicly readable (like items)
CREATE POLICY "Item character restrictions are publicly readable"
ON public.item_character_restrictions
FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert item character restrictions"
ON public.item_character_restrictions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update item character restrictions"
ON public.item_character_restrictions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete item character restrictions"
ON public.item_character_restrictions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_item_character_restrictions_item ON public.item_character_restrictions(item_id);
CREATE INDEX idx_item_character_restrictions_character ON public.item_character_restrictions(character_id);
