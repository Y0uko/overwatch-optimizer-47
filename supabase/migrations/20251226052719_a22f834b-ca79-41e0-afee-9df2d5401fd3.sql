-- Create enum for character roles
CREATE TYPE public.character_role AS ENUM ('tank', 'damage', 'support');

-- Create enum for item categories
CREATE TYPE public.item_category AS ENUM ('weapon', 'ability', 'survival');

-- Create enum for item rarity
CREATE TYPE public.item_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Create characters table
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role character_role NOT NULL,
  health INTEGER NOT NULL DEFAULT 100,
  base_damage INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category item_category NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'common',
  cost INTEGER NOT NULL,
  damage_bonus INTEGER DEFAULT 0,
  health_bonus INTEGER DEFAULT 0,
  ability_power INTEGER DEFAULT 0,
  special_effect TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user builds table
CREATE TABLE public.user_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create build items junction table
CREATE TABLE public.build_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID NOT NULL REFERENCES public.user_builds(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(build_id, item_id)
);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_items ENABLE ROW LEVEL SECURITY;

-- Characters and items are publicly readable
CREATE POLICY "Characters are publicly readable" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Items are publicly readable" ON public.items FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User builds policies
CREATE POLICY "Users can view own builds" ON public.user_builds FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create own builds" ON public.user_builds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own builds" ON public.user_builds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own builds" ON public.user_builds FOR DELETE USING (auth.uid() = user_id);

-- Build items policies (inherit from parent build)
CREATE POLICY "Users can view build items" ON public.build_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.user_builds WHERE id = build_id AND (user_id = auth.uid() OR is_public = true)));
CREATE POLICY "Users can manage own build items" ON public.build_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_builds WHERE id = build_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own build items" ON public.build_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.user_builds WHERE id = build_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own build items" ON public.build_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.user_builds WHERE id = build_id AND user_id = auth.uid()));

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_builds_updated_at BEFORE UPDATE ON public.user_builds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();