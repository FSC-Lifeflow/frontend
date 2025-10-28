-- Create post_mentions table to track @mentions in posts
CREATE TABLE IF NOT EXISTS post_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_mentioned_user_id ON post_mentions(mentioned_user_id);

-- Enable RLS
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mentions in posts they can see
CREATE POLICY "Users can view post mentions" ON post_mentions
  FOR SELECT
  USING (
    -- User can see mentions if they can see the post
    EXISTS (
      SELECT 1 FROM user_posts
      WHERE user_posts.id = post_mentions.post_id
    )
  );

-- Policy: Users can create mentions when creating their own posts
CREATE POLICY "Users can create mentions in their posts" ON post_mentions
  FOR INSERT
  WITH CHECK (
    -- User must be the author of the post
    EXISTS (
      SELECT 1 FROM user_posts
      WHERE user_posts.id = post_mentions.post_id
      AND user_posts.user_id = auth.uid()
    )
  );

-- Policy: Users can delete mentions from their own posts
CREATE POLICY "Users can delete mentions from their posts" ON post_mentions
  FOR DELETE
  USING (
    -- User must be the author of the post
    EXISTS (
      SELECT 1 FROM user_posts
      WHERE user_posts.id = post_mentions.post_id
      AND user_posts.user_id = auth.uid()
    )
  );

COMMENT ON TABLE post_mentions IS 'Tracks @mentions in user posts';
COMMENT ON COLUMN post_mentions.post_id IS 'Reference to the post containing the mention';
COMMENT ON COLUMN post_mentions.mentioned_user_id IS 'Reference to the user who was mentioned';
