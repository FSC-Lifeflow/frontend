import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

/**
 * User post data structure
 */
export type UserPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked_by_user?: boolean;
};

/**
 * Extracts @mentions from text
 * @param text - Text to extract mentions from
 * @returns Array of usernames (without @ symbol)
 */
function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]); // Get username without @ symbol
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Processes mentions in a post
 * @param postId - ID of the post
 * @param content - Content of the post
 * @param authorId - ID of the post author
 * @param authorName - Name of the post author
 */
async function processMentions(postId: string, content: string, authorId: string, authorName: string): Promise<void> {
  try {
    const usernames = extractMentions(content);
    
    if (usernames.length === 0) {
      return;
    }

    console.log('📢 Found mentions:', usernames);

    // Get user IDs for the mentioned usernames
    const { data: mentionedUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('username', usernames);

    if (usersError) {
      console.error('❌ Failed to fetch mentioned users:', usersError);
      return;
    }

    if (!mentionedUsers || mentionedUsers.length === 0) {
      console.log('ℹ️ No valid users found for mentions');
      return;
    }

    // Insert mentions into post_mentions table
    const mentionsToInsert = mentionedUsers
      .filter(user => user.id !== authorId) // Don't mention yourself
      .map(user => ({
        post_id: postId,
        mentioned_user_id: user.id
      }));

    if (mentionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('post_mentions')
        .insert(mentionsToInsert);

      if (insertError) {
        console.error('❌ Failed to insert mentions:', insertError);
      } else {
        console.log('✅ Mentions saved successfully');
      }

      // Send notifications to mentioned users
      for (const user of mentionedUsers) {
        if (user.id !== authorId) {
          try {
            await notificationService.createNotification({
              user_id: user.id,
              type: 'post_mention',
              title: 'You were mentioned in a post',
              message: `${authorName} mentioned you in their post`,
              read: false,
              data: {
                post_id: postId,
                author_id: authorId,
                author_name: authorName
              }
            });
            console.log(`✅ Notification sent to @${user.username}`);
          } catch (notifError) {
            console.error(`❌ Failed to send notification to @${user.username}:`, notifError);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing mentions:', error);
  }
}

/**
 * Post Service
 * Handles workout progress post functionality
 */
export const postService = {
  /**
   * Gets posts for a specific user
   * @param userId - ID of the user to get posts for
   * @param limit - Maximum number of posts to return
   * @returns Array of user's posts
   */
  async getUserPosts(userId: string, limit: number = 5): Promise<UserPost[]> {
    try {
      // First get the posts
      const { data: posts, error: postsError } = await supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Then get the user data for these posts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .in('id', posts.map(p => p.user_id));

      if (usersError) throw usersError;

      // Combine the data
      return posts.map(post => {
        const user = users?.find(u => u.id === post.user_id);
        return {
          ...post,
          is_edited: post.created_at !== post.updated_at,
          user: user ? {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            email: user.email
          } : undefined
        };
      });
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  },

  /**
   * Creates a new workout progress post
   * @param content - The content of the post
   * @returns The created post
   */
  async createPost(content: string): Promise<UserPost> {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Post content cannot be empty');
      }

      console.log('📝 Creating new post for user:', currentUser.id);

      // Create the post
      const { data, error } = await supabase
        .from('user_posts')
        .insert({
          user_id: currentUser.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create post:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      console.log('✅ Post created successfully:', data);

      // Get user info for the post
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('⚠️ Failed to fetch user info:', userError);
      }

      // Process @mentions in the post
      if (userInfo) {
        const authorName = `${userInfo.first_name} ${userInfo.last_name}`;
        await processMentions(data.id, content, currentUser.id, authorName);
      }

      return {
        ...data,
        user: userInfo || undefined
      };
    } catch (error) {
      console.error('❌ Create post error:', error);
      throw error;
    }
  },

  /**
   * Gets posts from the current user's friends (friend activity feed)
   * @param limit - Maximum number of posts to return
   * @returns Array of posts from friends
   */
  async getFriendPosts(limit: number = 20): Promise<UserPost[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      console.log('📖 Fetching friend posts for user:', currentUser.id);

      // Get all accepted friend IDs
      const { data: friendRequests, error: friendError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (friendError) {
        console.error('❌ Failed to get friend requests:', friendError);
        throw new Error('Failed to get friends');
      }

      if (!friendRequests || friendRequests.length === 0) {
        console.log('ℹ️ No friends found, returning empty array');
        return [];
      }

      // Extract friend IDs
      const friendIds = friendRequests.map(request => 
        request.sender_id === currentUser.id ? request.receiver_id : request.sender_id
      );

      console.log('👥 Found friends:', friendIds.length);

      // Calculate date 7 days ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoISO = oneWeekAgo.toISOString();

      console.log('📅 Fetching posts from the last 7 days (since:', oneWeekAgoISO, ')');

      // Get posts from friends
      const { data: posts, error: postsError } = await supabase
        .from('user_posts')
        .select('*')
        .in('user_id', friendIds)
        .gte('created_at', oneWeekAgoISO)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postsError) {
        console.error('❌ Failed to get friend posts:', postsError);
        throw new Error('Failed to get friend posts');
      }

      if (!posts || posts.length === 0) {
        console.log('ℹ️ No posts found from friends');
        return [];
      }

      console.log('📖 Found posts:', posts.length);

      // Get user info for all posts
      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .in('id', userIds);

      if (usersError) {
        console.error('⚠️ Failed to fetch user info:', usersError);
      }

      // Get likes and comments counts for all posts
      const postIds = posts.map(p => p.id);
      
      // Get likes data
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Get comments with their IDs
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .in('post_id', postIds);

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: repliesData } = commentIds.length > 0 
        ? await supabase
            .from('comment_replies')
            .select('comment_id')
            .in('comment_id', commentIds)
        : { data: [] };

      // Build likes count map and check if user liked
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Set<string>();

      likesData?.forEach(like => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
        
        if (like.user_id === currentUser.id) {
          userLikesMap.add(like.post_id);
        }
      });

      // Build comments count map (including replies)
      const commentsCountMap = new Map<string, number>();
      
      // Count direct comments
      commentsData?.forEach(comment => {
        const count = commentsCountMap.get(comment.post_id) || 0;
        commentsCountMap.set(comment.post_id, count + 1);
      });

      // Add replies to the count
      repliesData?.forEach(reply => {
        const comment = commentsData?.find(c => c.id === reply.comment_id);
        if (comment) {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        }
      });

      // Combine posts with user info, likes, and comments
      const postsWithUsers = posts.map(post => ({
        ...post,
        user: users?.find(u => u.id === post.user_id),
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked_by_user: userLikesMap.has(post.id)
      }));

      return postsWithUsers;
    } catch (error) {
      console.error('❌ Get friend posts error:', error);
      throw error;
    }
  },

  /**
   * Gets the current user's own posts
   * @param limit - Maximum number of posts to return
   * @returns Array of user's own posts
   */
  async getMyPosts(limit: number = 20): Promise<UserPost[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data: posts, error } = await supabase
        .from('user_posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get my posts:', error);
        throw new Error('Failed to get posts');
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      // Get user info
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('⚠️ Failed to fetch user info:', userError);
      }

      // Get likes and comments counts for all posts
      const postIds = posts.map(p => p.id);
      
      // Get likes data
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Get comments with their IDs
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .in('post_id', postIds);

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: repliesData } = commentIds.length > 0 
        ? await supabase
            .from('comment_replies')
            .select('comment_id')
            .in('comment_id', commentIds)
        : { data: [] };

      // Build likes count map and check if user liked
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Set<string>();

      likesData?.forEach(like => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
        
        if (like.user_id === currentUser.id) {
          userLikesMap.add(like.post_id);
        }
      });

      // Build comments count map (including replies)
      const commentsCountMap = new Map<string, number>();
      
      // Count direct comments
      commentsData?.forEach(comment => {
        const count = commentsCountMap.get(comment.post_id) || 0;
        commentsCountMap.set(comment.post_id, count + 1);
      });

      // Add replies to the count
      repliesData?.forEach(reply => {
        const comment = commentsData?.find(c => c.id === reply.comment_id);
        if (comment) {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        }
      });

      return posts.map(post => ({
        ...post,
        user: userInfo || undefined,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked_by_user: userLikesMap.has(post.id)
      }));
    } catch (error) {
      console.error('❌ Get my posts error:', error);
      throw error;
    }
  },

  /**
   * Deletes a post
   * @param postId - ID of the post to delete
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id); // Ensure user can only delete their own posts

      if (error) {
        console.error('❌ Failed to delete post:', error);
        throw new Error('Failed to delete post');
      }

      console.log('✅ Post deleted successfully');
    } catch (error) {
      console.error('❌ Delete post error:', error);
      throw error;
    }
  },

  /**
   * Updates a post
   * @param postId - ID of the post to update
   * @param content - New content for the post
   */
  async updatePost(postId: string, content: string): Promise<UserPost> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim()) {
        throw new Error('Post content cannot be empty');
      }

      const { data, error } = await supabase
        .from('user_posts')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', currentUser.id) // Ensure user can only update their own posts
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update post:', error);
        throw new Error('Failed to update post');
      }

      console.log('✅ Post updated successfully');

      // Get user info
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('⚠️ Failed to fetch user info:', userError);
      }

      // Delete old mentions and process new ones
      await supabase
        .from('post_mentions')
        .delete()
        .eq('post_id', postId);

      // Process @mentions in the updated post
      if (userInfo) {
        const authorName = `${userInfo.first_name} ${userInfo.last_name}`;
        await processMentions(data.id, content, currentUser.id, authorName);
      }

      return {
        ...data,
        user: userInfo || undefined
      };
    } catch (error) {
      console.error('❌ Update post error:', error);
      throw error;
    }
  }
};
