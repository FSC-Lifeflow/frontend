-- Migration: Add activity_sharing column to users table
-- Description: Allows users to control whether they share their fitness activity data with friends
-- Created: 2025-10-08

-- Add activity_sharing column with default value TRUE
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS activity_sharing BOOLEAN DEFAULT TRUE;

-- Add comment to document the column
COMMENT ON COLUMN users.activity_sharing IS 'Controls whether user shares fitness goals and activity with friends. When FALSE, fitness profile is hidden from friends.';

-- Update any existing NULL values to TRUE (default behavior)
UPDATE users 
SET activity_sharing = TRUE 
WHERE activity_sharing IS NULL;

-- Ensure RLS policy allows users to update their own activity_sharing field
-- Drop and recreate the update policy to include activity_sharing
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the policy was created
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' AND cmd = 'UPDATE';
