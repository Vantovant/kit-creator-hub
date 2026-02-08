
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read prospects" ON public.prospects;
DROP POLICY IF EXISTS "Authenticated users can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Authenticated users can update prospects" ON public.prospects;
DROP POLICY IF EXISTS "Authenticated users can delete prospects" ON public.prospects;

-- Create admin role system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can read prospects
CREATE POLICY "Admins can read prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert prospects
CREATE POLICY "Admins can insert prospects" ON public.prospects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update prospects
CREATE POLICY "Admins can update prospects" ON public.prospects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete prospects
CREATE POLICY "Admins can delete prospects" ON public.prospects
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS on user_roles: only admins can view roles
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
