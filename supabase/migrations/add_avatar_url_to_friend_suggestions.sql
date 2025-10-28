-- Update get_friend_suggestions function to include avatar_url
-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer);

CREATE OR REPLACE FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) 
RETURNS TABLE(
  "id" "uuid", 
  "first_name" "text", 
  "last_name" "text", 
  "username" "text", 
  "email" "text", 
  "created_at" timestamp with time zone, 
  "avatar_url" "text", 
  "mutual_friends_count" bigint
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get user's direct friends
  user_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = current_user_id THEN receiver_id
        ELSE sender_id
      END AS friend_id
    FROM friend_requests
    WHERE (sender_id = current_user_id OR receiver_id = current_user_id)
    AND status = 'accepted'
  ),
  
  -- Get friends of friends
  potential_suggestions AS (
    SELECT DISTINCT
      CASE 
        WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
        ELSE fr.sender_id
      END AS suggested_user_id
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
    AND (fr.sender_id IN (SELECT friend_id FROM user_friends) OR fr.receiver_id IN (SELECT friend_id FROM user_friends))
    AND CASE 
      WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
      ELSE fr.sender_id
    END != current_user_id
    AND CASE 
      WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
      ELSE fr.sender_id
    END NOT IN (SELECT friend_id FROM user_friends)
  ),
  
  -- Count mutual friends for each suggestion
  suggestions_with_counts AS (
    SELECT 
      ps.suggested_user_id,
      COUNT(DISTINCT uf.friend_id) AS mutual_count
    FROM potential_suggestions ps
    JOIN friend_requests fr ON 
      (fr.sender_id = ps.suggested_user_id OR fr.receiver_id = ps.suggested_user_id)
    JOIN user_friends uf ON 
      (fr.sender_id = uf.friend_id OR fr.receiver_id = uf.friend_id)
    WHERE fr.status = 'accepted'
    AND CASE 
      WHEN fr.sender_id = ps.suggested_user_id THEN fr.receiver_id
      ELSE fr.sender_id
    END = uf.friend_id
    GROUP BY ps.suggested_user_id
  )
  
  -- Get final results with user details
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.username,
    u.email,
    u.created_at,
    u.avatar_url,
    COALESCE(swc.mutual_count, 1) AS mutual_friends_count
  FROM potential_suggestions ps
  JOIN users u ON ps.suggested_user_id = u.id
  LEFT JOIN suggestions_with_counts swc ON ps.suggested_user_id = swc.suggested_user_id
  LEFT JOIN friend_requests existing_fr ON 
    ((existing_fr.sender_id = current_user_id AND existing_fr.receiver_id = u.id) OR 
     (existing_fr.receiver_id = current_user_id AND existing_fr.sender_id = u.id))
    AND existing_fr.status IN ('pending', 'accepted')  -- Only exclude pending/accepted, NOT rejected
  LEFT JOIN user_blocks ub ON 
    (ub.blocker_id = current_user_id AND ub.blocked_id = u.id) OR
    (ub.blocker_id = u.id AND ub.blocked_id = current_user_id)
  WHERE existing_fr.id IS NULL  -- No pending or accepted friend request
  AND ub.id IS NULL    -- Not blocked
  AND (u.social_privacy IS NULL OR u.social_privacy = true)  -- Respect privacy settings
  ORDER BY COALESCE(swc.mutual_count, 1) DESC, u.first_name
  LIMIT suggestion_limit;

END;
$$;
