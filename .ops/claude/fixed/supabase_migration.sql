-- SQL Migration: Guest Management and RLS Policies
-- Run this in your Supabase SQL editor

-- 1. Create guests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON public.guests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_last_seen ON public.guests(last_seen DESC);

-- 3. Enable RLS on guests table
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous guest creation" ON public.guests;
DROP POLICY IF EXISTS "Allow guests to read own data" ON public.guests;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.guests;
DROP POLICY IF EXISTS "Allow service role full access" ON public.guests;

-- 5. Create RLS policies for guests table

-- Allow anonymous users to create guest records
-- This uses a custom header or allows any insert with valid UUID
CREATE POLICY "Allow anonymous guest creation" 
ON public.guests 
FOR INSERT 
TO anon
WITH CHECK (
  -- Allow if the ID matches what's being inserted
  id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  OR 
  -- Or allow any insert if no header is set (for initial creation)
  current_setting('request.headers', true)::json->>'x-guest-id' IS NULL
);

-- Allow guests to read their own data
CREATE POLICY "Allow guests to read own data" 
ON public.guests 
FOR SELECT 
TO anon
USING (
  id::text = current_setting('request.headers', true)::json->>'x-guest-id'
  OR
  id::text = current_setting('request.cookies', true)::json->>'guest_id'
);

-- Allow authenticated users to manage their guest data
CREATE POLICY "Allow authenticated users full access" 
ON public.guests 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Create or replace the touch_guest RPC function
CREATE OR REPLACE FUNCTION public.touch_guest(
  p_guest_id UUID,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.guests 
  SET 
    last_seen = NOW(),
    user_agent = COALESCE(p_user_agent, user_agent)
  WHERE id = p_guest_id;
  
  -- If no rows were updated, the guest doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found: %', p_guest_id;
  END IF;
END;
$$;

-- 7. Create or replace the migrate_guest_data RPC function
CREATE OR REPLACE FUNCTION public.migrate_guest_data(
  p_guest_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;
  
  -- Example: Migrate guest's suggestions to the authenticated user
  -- Adjust these based on your actual schema
  
  -- Update any suggestions created by this guest
  UPDATE public.suggestions 
  SET user_id = v_user_id, guest_id = NULL
  WHERE guest_id = p_guest_id;
  
  -- Update any usage records
  UPDATE public.usage 
  SET user_id = v_user_id, guest_id = NULL
  WHERE guest_id = p_guest_id;
  
  -- Update any other tables that reference guests
  -- Add more UPDATE statements as needed for your schema
  
  -- Optionally, mark the guest record as migrated
  UPDATE public.guests 
  SET 
    data = jsonb_set(
      COALESCE(data, '{}'::jsonb), 
      '{migrated_to}', 
      to_jsonb(v_user_id::text)
    ),
    data = jsonb_set(
      COALESCE(data, '{}'::jsonb), 
      '{migrated_at}', 
      to_jsonb(NOW())
    )
  WHERE id = p_guest_id;
END;
$$;

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT ON public.guests TO anon;
GRANT ALL ON public.guests TO authenticated;

GRANT EXECUTE ON FUNCTION public.touch_guest TO anon;
GRANT EXECUTE ON FUNCTION public.touch_guest TO authenticated;

GRANT EXECUTE ON FUNCTION public.migrate_guest_data TO authenticated;

-- 9. Create profiles table if it doesn't exist (for account page)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 10. Create usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  api_calls_month INTEGER DEFAULT 0,
  api_calls_total INTEGER DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(guest_id)
);

-- Enable RLS on usage
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- Usage policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage;

CREATE POLICY "Users can view own usage" 
ON public.usage FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" 
ON public.usage FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 11. Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.usage (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 12. Add suggestions table if referenced (adjust based on your schema)
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on suggestions
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Suggestions policies
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can create suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Guests can view own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Guests can create suggestions" ON public.suggestions;

CREATE POLICY "Users can view own suggestions" 
ON public.suggestions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create suggestions" 
ON public.suggestions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guests can view own suggestions" 
ON public.suggestions FOR SELECT 
TO anon
USING (
  guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
);

CREATE POLICY "Guests can create suggestions" 
ON public.suggestions FOR INSERT 
TO anon
WITH CHECK (
  guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id'
);
