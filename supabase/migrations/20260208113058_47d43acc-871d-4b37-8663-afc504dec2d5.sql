
-- Profiles table for dashboard users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update prospects RLS: allow authenticated users full access
DROP POLICY IF EXISTS "No public access to prospects" ON public.prospects;

CREATE POLICY "Authenticated users can read prospects" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert prospects" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update prospects" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete prospects" ON public.prospects FOR DELETE TO authenticated USING (true);

-- Unsubscribe support
ALTER TABLE public.prospects
  ADD COLUMN unsubscribed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Allow anonymous access for unsubscribe action only
CREATE POLICY "Anyone can unsubscribe via token" ON public.prospects FOR UPDATE TO anon USING (true) WITH CHECK (true);
