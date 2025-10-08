-- Add activity_sharing column to users table
-- This column controls whether users share their fitness activity data with friends
-- Default is TRUE to maintain existing behavior (all users share by default)

-- Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS activity_sharing BOOLEAN DEFAULT TRUE;

-- Add a comment to document the column
COMMENT ON COLUMN users.activity_sharing IS 'Controls whether user shares fitness goals and activity with friends. When FALSE, fitness profile is hidden from friends.';

-- Update any existing NULL values to TRUE (default behavior)
UPDATE users 
SET activity_sharing = TRUE 
WHERE activity_sharing IS NULL;
