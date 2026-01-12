-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update items policies to require admin role
DROP POLICY IF EXISTS "Authenticated users can update items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can delete items" ON public.items;

CREATE POLICY "Admins can update items" 
ON public.items 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert items" 
ON public.items 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete items" 
ON public.items 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add your account as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('1ddc9140-92b1-4bb3-bfdc-711006e57245', 'admin');