# Notification RLS Policy Setup Guide

## Problem
Getting a 403 error when trying to create notifications for co-workout invitations and challenges. This is because the current RLS policy on the `notifications` table doesn't allow users to create notifications for other users (their friends).

## Error Message
```
Failed to create notification: 403
❌ Failed to create notification
❌ Create notification error: Error: Failed to create notification
```

## Solution

You need to update the RLS policies on the `notifications` table in Supabase to allow users to create notifications for their friends.

### Steps to Fix

#### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **SQL Editor** (or **Database** → **SQL Editor**)

#### 2. Run the Following SQL

**Option A: Friend-Based Policy (Recommended)**
This allows users to create notifications only for their accepted friends:

```sql
-- Drop any restrictive insert policies
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

-- Create a new policy that allows users to create notifications for friends
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
```

**Option B: Permissive Policy (Use with Caution)**
This allows any authenticated user to create notifications. Use this only if you trust your application logic:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for friends" ON notifications;

-- Create permissive policy
CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

#### 3. Verify the Policy

Run this query to check if the policy was created successfully:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notifications' 
AND policyname LIKE '%create%';
```

You should see your new policy listed.

#### 4. Test the Feature

After applying the policy:
1. Go back to your app
2. Navigate to the Social page
3. Try sending a co-workout invitation or challenge
4. The notification should now be created successfully

## Understanding RLS Policies

### Current Policies Needed for Notifications Table

1. **SELECT Policy** - Users can view their own notifications
   ```sql
   CREATE POLICY "Users can view their own notifications"
     ON notifications FOR SELECT
     USING (auth.uid() = user_id);
   ```

2. **INSERT Policy** - Users can create notifications for friends (the one we're adding)
   ```sql
   CREATE POLICY "Users can create notifications for friends"
     ON notifications FOR INSERT
     WITH CHECK (
       auth.uid() = user_id
       OR
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
   ```

3. **UPDATE Policy** - Users can update their own notifications (mark as read)
   ```sql
   CREATE POLICY "Users can update their own notifications"
     ON notifications FOR UPDATE
     USING (auth.uid() = user_id);
   ```

4. **DELETE Policy** - Users can delete their own notifications
   ```sql
   CREATE POLICY "Users can delete their own notifications"
     ON notifications FOR DELETE
     USING (auth.uid() = user_id);
   ```

## Complete Setup Script

If you want to set up all notification policies from scratch:

```sql
-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for friends" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

-- Create SELECT policy
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Create INSERT policy (allows creating notifications for friends)
CREATE POLICY "Users can create notifications for friends"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
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

-- Create UPDATE policy
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create DELETE policy
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
```

## Troubleshooting

### Still Getting 403 Error?

1. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'notifications';
   ```
   The `rowsecurity` column should be `true`.

2. **Check if policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

3. **Check if friend request exists:**
   Make sure you're testing with users who are actually friends (have an accepted friend request).

4. **Check Supabase logs:**
   - Go to **Logs** → **Postgres Logs** in Supabase dashboard
   - Look for RLS policy violations

### Alternative: Disable RLS (Not Recommended for Production)

If you're just testing and want to quickly bypass RLS:

```sql
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

**Warning:** This removes all security and should NEVER be used in production!

## Next Steps

After fixing the RLS policy:
1. Test sending invitations and challenges
2. Verify notifications appear in the recipient's Profile page
3. Check that the notification badge updates correctly
4. Test marking notifications as read

## Related Files
- `src/services/notificationService.ts` - Notification service
- `src/pages/Social.tsx` - Co-workout invitation/challenge logic
- `src/pages/Profile.tsx` - Notification display
