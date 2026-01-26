-- Fix 1: Add admin-only policies for characters table (similar to items table)
CREATE POLICY "Admins can insert characters" 
ON public.characters 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update characters" 
ON public.characters 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete characters" 
ON public.characters 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Create a secure view for public builds that excludes notes
-- First create a view that hides notes for non-owners
CREATE OR REPLACE VIEW public.user_builds_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  character_id,
  name,
  CASE 
    WHEN auth.uid() = user_id THEN notes
    ELSE NULL
  END as notes,
  is_public,
  created_at,
  updated_at
FROM public.user_builds
WHERE is_public = true OR auth.uid() = user_id;