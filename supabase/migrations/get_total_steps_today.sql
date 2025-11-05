-- Create a public function to get total steps taken by all users today
-- This function runs with elevated privileges (SECURITY DEFINER)
-- allowing unauthenticated users to see community stats on the landing page

CREATE OR REPLACE FUNCTION get_total_steps_today()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  total_steps BIGINT;
BEGIN
  -- Sum all steps from today's date across all users
  SELECT COALESCE(SUM(steps), 0)::BIGINT INTO total_steps
  FROM fitbit_activity_data
  WHERE date = CURRENT_DATE;
  
  RETURN total_steps;
END;
$$;

-- Grant execute permission to anonymous users (unauthenticated)
GRANT EXECUTE ON FUNCTION get_total_steps_today() TO anon;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION get_total_steps_today() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_total_steps_today() IS 
'Returns the total steps taken by all users today. This function is publicly accessible to display community stats on the landing page.';
