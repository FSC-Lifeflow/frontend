-- Create a PostgreSQL function to insert notifications with elevated privileges
-- This bypasses RLS policies since it runs as SECURITY DEFINER

CREATE OR REPLACE FUNCTION create_notification_for_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_read BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER -- This runs with the privileges of the function owner (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO notifications (user_id, type, title, message, data, read)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_read)
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_notification_for_user TO authenticated;

-- Test the function (optional - replace UUIDs with real ones)
-- SELECT * FROM create_notification_for_user(
--   'recipient-user-id'::UUID,
--   'test',
--   'Test Notification',
--   'This is a test message',
--   '{"test": true}'::JSONB,
--   false
-- );
