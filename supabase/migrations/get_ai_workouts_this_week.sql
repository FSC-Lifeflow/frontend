-- Create a public function to get count of AI-scheduled workouts this week
-- This function runs with elevated privileges (SECURITY DEFINER)
-- allowing unauthenticated users to see community stats on the landing page

CREATE OR REPLACE FUNCTION get_ai_workouts_this_week()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  workout_count INTEGER;
  week_start DATE;
BEGIN
  -- Get the start of the current week (Monday)
  week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Count workouts from this week where source indicates AI scheduling
  -- Adjust the source filter based on how your AI marks scheduled workouts
  -- Common values might be: 'ai', 'ai_scheduled', 'automated', etc.
  SELECT COUNT(*)::INTEGER INTO workout_count
  FROM workouts
  WHERE started_at >= week_start
    AND started_at < week_start + INTERVAL '7 days'
    AND (source IS NOT NULL AND source != 'manual'); -- Assumes AI-scheduled workouts have a source value
  
  RETURN workout_count;
END;
$$;

-- Grant execute permission to anonymous users (unauthenticated)
GRANT EXECUTE ON FUNCTION get_ai_workouts_this_week() TO anon;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION get_ai_workouts_this_week() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_ai_workouts_this_week() IS 
'Returns the count of AI-scheduled workouts this week across all users. This function is publicly accessible to display community stats on the landing page.';
