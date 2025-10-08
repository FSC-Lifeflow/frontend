-- Diagnostic: Check current RLS policies on notifications table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- Check if friend_requests table exists and has data
SELECT COUNT(*) as friend_request_count FROM friend_requests WHERE status = 'accepted';

-- TEMPORARY FIX: Simple policy that allows authenticated users to create notifications
-- This is a quick fix to unblock development - you can refine it later
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for friends" ON notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Verify the new policy
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'notifications' AND cmd = 'INSERT';
