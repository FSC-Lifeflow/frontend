-- Check current RLS policies on users table
-- Run this first to see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- If the update policy doesn't include activity_sharing, we need to update it
-- This allows users to update their own activity_sharing field

-- Drop the old update policy if it exists (we'll recreate it with activity_sharing)
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create a new update policy that allows users to update their own profile including activity_sharing
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' AND cmd = 'UPDATE';
