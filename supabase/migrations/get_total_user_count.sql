-- Create a public function to get total user count
-- This function runs with elevated privileges (SECURITY DEFINER)
-- allowing unauthenticated users to get the count for the landing page

CREATE OR REPLACE FUNCTION get_total_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count all users in the users table
  SELECT COUNT(*)::INTEGER INTO user_count
  FROM users;
  
  RETURN user_count;
END;
$$;

-- Grant execute permission to anonymous users (unauthenticated)
GRANT EXECUTE ON FUNCTION get_total_user_count() TO anon;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION get_total_user_count() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_total_user_count() IS 
'Returns the total count of users in the system. This function is publicly accessible to display on the landing page.';
