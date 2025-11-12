-- Create scheduled_workouts table to track calendar workout events
CREATE TABLE IF NOT EXISTS scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT FALSE,
  skipped_at TIMESTAMPTZ,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_user_id ON scheduled_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_end_time ON scheduled_workouts(end_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_notification_sent ON scheduled_workouts(notification_sent, end_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_calendar_event ON scheduled_workouts(user_id, calendar_event_id);

-- Create unique constraint to prevent duplicate calendar events
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_workouts_unique_event 
  ON scheduled_workouts(user_id, calendar_event_id);

-- RLS Policies
ALTER TABLE scheduled_workouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled workouts
CREATE POLICY "Users can view own scheduled workouts"
  ON scheduled_workouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scheduled workouts
CREATE POLICY "Users can insert own scheduled workouts"
  ON scheduled_workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled workouts
CREATE POLICY "Users can update own scheduled workouts"
  ON scheduled_workouts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scheduled workouts
CREATE POLICY "Users can delete own scheduled workouts"
  ON scheduled_workouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_workouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_scheduled_workouts_updated_at_trigger ON scheduled_workouts;
CREATE TRIGGER update_scheduled_workouts_updated_at_trigger
  BEFORE UPDATE ON scheduled_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_workouts_updated_at();

-- Function to get workouts that need completion notifications
-- This will be called by the backend service periodically
CREATE OR REPLACE FUNCTION get_workouts_needing_notification()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  calendar_event_id TEXT,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sw.id,
    sw.user_id,
    sw.calendar_event_id,
    sw.summary,
    sw.description,
    sw.start_time,
    sw.end_time,
    sw.location
  FROM scheduled_workouts sw
  WHERE 
    sw.notification_sent = FALSE
    AND sw.end_time <= NOW()
    AND sw.completed = FALSE
    AND sw.skipped = FALSE
  ORDER BY sw.end_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
