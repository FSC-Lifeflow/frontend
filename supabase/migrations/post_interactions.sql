-- =====================================================
-- POST INTERACTIONS: LIKES, COMMENTS, AND REPLIES
-- =====================================================
-- This migration adds support for:
-- 1. Post likes
-- 2. Post comments
-- 3. Comment replies (nested comments)
-- 4. Comment likes
-- =====================================================

-- =====================================================
-- TABLE: post_likes
-- Stores likes on user posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only like a post once
  UNIQUE(post_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);

-- =====================================================
-- TABLE: post_comments
-- Stores comments on user posts
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  
  -- Validation
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Index for faster queries
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);

-- =====================================================
-- TABLE: comment_replies
-- Stores replies to comments (nested comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  
  -- Validation
  CONSTRAINT reply_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Index for faster queries
CREATE INDEX idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX idx_comment_replies_user_id ON comment_replies(user_id);
CREATE INDEX idx_comment_replies_created_at ON comment_replies(created_at ASC);

-- =====================================================
-- TABLE: comment_likes
-- Stores likes on comments
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only like a comment once
  UNIQUE(comment_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- =====================================================
-- RLS POLICIES: post_likes
-- =====================================================

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on posts they can see (their friends' posts)
CREATE POLICY "Users can view post likes on visible posts"
ON post_likes FOR SELECT
USING (
  -- User can see likes on posts from friends or their own posts
  EXISTS (
    SELECT 1 FROM user_posts up
    WHERE up.id = post_likes.post_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can create likes on posts they can see
CREATE POLICY "Users can like posts they can see"
ON post_likes FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_posts up
    WHERE up.id = post_likes.post_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
ON post_likes FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: post_comments
-- =====================================================

-- Enable RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on posts they can see
CREATE POLICY "Users can view comments on visible posts"
ON post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_posts up
    WHERE up.id = post_comments.post_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can create comments on posts they can see
CREATE POLICY "Users can comment on posts they can see"
ON post_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_posts up
    WHERE up.id = post_comments.post_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON post_comments FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON post_comments FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: comment_replies
-- =====================================================

-- Enable RLS
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies on comments they can see
CREATE POLICY "Users can view replies on visible comments"
ON comment_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN user_posts up ON up.id = pc.post_id
    WHERE pc.id = comment_replies.comment_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can create replies on comments they can see
CREATE POLICY "Users can reply to comments they can see"
ON comment_replies FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN user_posts up ON up.id = pc.post_id
    WHERE pc.id = comment_replies.comment_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can update their own replies
CREATE POLICY "Users can update their own replies"
ON comment_replies FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own replies
CREATE POLICY "Users can delete their own replies"
ON comment_replies FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: comment_likes
-- =====================================================

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on comments they can see
CREATE POLICY "Users can view comment likes on visible comments"
ON comment_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN user_posts up ON up.id = pc.post_id
    WHERE pc.id = comment_likes.comment_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can like comments they can see
CREATE POLICY "Users can like comments they can see"
ON comment_likes FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN user_posts up ON up.id = pc.post_id
    WHERE pc.id = comment_likes.comment_id
    AND (
      up.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.status = 'accepted'
        AND (
          (fr.sender_id = auth.uid() AND fr.receiver_id = up.user_id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = up.user_id)
        )
      )
    )
  )
);

-- Users can delete their own comment likes
CREATE POLICY "Users can delete their own comment likes"
ON comment_likes FOR DELETE
USING (user_id = auth.uid());
