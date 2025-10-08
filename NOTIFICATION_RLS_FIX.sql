-- Fix for Co-Workout Notification RLS Policy
-- This allows users to create notifications for their friends (for invitations and challenges)

-- First, let's check existing policies (run this in Supabase SQL Editor to see current state)
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Drop the restrictive insert policy if it exists (only allows users to create notifications for themselves)
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

-- Create a new policy that allows users to create notifications for their friends
-- This is needed for co-workout invitations and challenges
CREATE POLICY "Users can create notifications for friends"
  ON notifications
  FOR INSERT
  WITH CHECK (
    -- Allow users to create notifications for themselves
    auth.uid() = user_id
    OR
    -- Allow users to create notifications for their friends (accepted friend requests)
    EXISTS (
      SELECT 1 FROM friend_requests
      WHERE status = 'accepted'
      AND (
        (sender_id = auth.uid() AND receiver_id = user_id)
        OR
        (receiver_id = auth.uid() AND sender_id = user_id)
      )
    )
  );

-- Alternatively, if you want a more permissive policy (allows any authenticated user to create notifications)
-- Use this ONLY if you trust your application logic to prevent abuse:
/*
DROP POLICY IF EXISTS "Users can create notifications for friends" ON notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
*/

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'notifications' AND policyname LIKE '%create%';
