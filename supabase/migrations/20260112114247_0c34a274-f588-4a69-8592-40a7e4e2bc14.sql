-- Add UPDATE policy for items table
-- For now, allow any authenticated user to update items (admin functionality)
-- In production, you should restrict this to admin roles

CREATE POLICY "Authenticated users can update items" 
ON public.items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Also add INSERT and DELETE policies for complete admin functionality
CREATE POLICY "Authenticated users can insert items" 
ON public.items 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete items" 
ON public.items 
FOR DELETE 
USING (auth.uid() IS NOT NULL);