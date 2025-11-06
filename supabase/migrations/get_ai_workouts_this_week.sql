-- Create a public function to get count of workouts scheduled through the site this week
-- This includes both manually logged workouts and AI-scheduled workouts
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
  
  -- Count all workouts scheduled through the site this week
  -- This includes:
  -- 1. Manual workouts logged through "Log Manual Activity" (source='manual')
  -- 2. AI-scheduled workouts (source='ai', 'ai_scheduled', 'automated', etc.)
  -- We exclude only workouts imported from external sources like Fitbit (source='fitbit')
  SELECT COUNT(*)::INTEGER INTO workout_count
  FROM workouts
  WHERE started_at >= week_start
    AND started_at < week_start + INTERVAL '7 days'
    AND (source IS NULL OR source IN ('manual', 'ai', 'ai_scheduled', 'automated'));
  
  RETURN workout_count;
END;
$$;

-- Grant execute permission to anonymous users (unauthenticated)
GRANT EXECUTE ON FUNCTION get_ai_workouts_this_week() TO anon;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION get_ai_workouts_this_week() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_ai_workouts_this_week() IS 
'Returns the count of workouts scheduled through the site this week (manual + AI-scheduled) across all users. Excludes external imports like Fitbit. This function is publicly accessible to display community stats on the landing page.';
