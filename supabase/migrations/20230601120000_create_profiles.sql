CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow a logged‑in user to read their own profile
CREATE POLICY "Allow logged in read" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow a logged‑in user to insert/upsert their own profile
CREATE POLICY "Allow logged in insert" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
