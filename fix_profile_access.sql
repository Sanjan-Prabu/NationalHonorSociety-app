-- Fix Profile Access Issues
-- Run this SQL in your Supabase Dashboard → SQL Editor

-- First, let's check if RLS is enabled on profiles table
-- If this returns true, RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow service role full access" ON profiles;

-- Create comprehensive RLS policies for profiles table

-- 1. Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- 3. Allow service role to do everything (critical for signin function)
CREATE POLICY "Service role full access" ON profiles
  FOR ALL 
  USING (auth.role() = 'service_role');

-- 4. Allow anon role to insert during signup
CREATE POLICY "Allow signup profile creation" ON profiles
  FOR INSERT 
  WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test query to see if we can read profiles (this should work)
SELECT id, email, first_name, last_name, organization, role 
FROM profiles 
LIMIT 5;