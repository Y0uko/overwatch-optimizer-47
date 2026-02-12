
-- Create storage bucket for character images
INSERT INTO storage.buckets (id, name, public) VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Character images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

-- Admin upload
CREATE POLICY "Admins can upload character images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'character-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin update
CREATE POLICY "Admins can update character images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'character-images' AND public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins can delete character images"
ON storage.objects FOR DELETE
USING (bucket_id = 'character-images' AND public.has_role(auth.uid(), 'admin'));
