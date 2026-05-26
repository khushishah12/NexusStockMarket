DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: logged-in user can read own profile
CREATE POLICY "Allow logged in read"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: logged-in user can insert/upsert own profile
CREATE POLICY "Allow logged in insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
