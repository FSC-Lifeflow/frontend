import { supabase } from '../lib/supabase';

/**
 * User post data structure
 */
export type UserPost = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username?: string;
    email?: string;
    avatar_url?: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked_by_user?: boolean;
};

/**
 * Type alias for backward compatibility
 */
export type Post = UserPost;

/**
 * Post Service
 * Handles all post-related functionality including:
 * - Creating posts with optional images
 * - Fetching posts from friends
 * - Uploading images to Supabase Storage
 */
export const postService = {
  /**
   * Uploads an image to Supabase Storage
   * @param file - Image file to upload
   * @param userId - ID of the user uploading the image
   * @returns URL of the uploaded image
   */
  async uploadImage(file: File, userId: string): Promise<string> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Image must be less than 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      console.log('📤 Uploading image:', fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Image upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      console.log('✅ Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  },

  /**
   * Creates a new post
   * @param content - Text content of the post
   * @param imageFile - Optional image file to attach
   * @returns The created post
   */
  async createPost(content: string, imageFile?: File): Promise<UserPost> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!content.trim() && !imageFile) {
        throw new Error('Post content or image is required');
      }

      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageFile) {
        imageUrl = await this.uploadImage(imageFile, currentUser.id);
      }

      console.log('📝 Creating post:', { content, imageUrl });

      // Create post in database
      const { data, error } = await supabase
        .from('user_posts')
        .insert({
          user_id: currentUser.id,
          content: content.trim(),
          image_url: imageUrl
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('❌ Post creation error:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      console.log('✅ Post created successfully:', data);

      // Fetch user data separately
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .eq('id', currentUser.id)
        .single();
      
      if (userError) {
        console.error('⚠️ Failed to fetch user info:', userError);
      }

      return {
        ...data,
        user: userInfo || undefined
      };
    } catch (error) {
      console.error('❌ Post creation failed:', error);
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
        .select('id, first_name, last_name, username, email, avatar_url')
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
   * Fetches posts from the user's friends and their own posts (feed)
   * @param limit - Maximum number of posts to fetch
   * @returns Array of posts
   */
  async getFeedPosts(limit: number = 20): Promise<UserPost[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User must be logged in to view posts');
      }

      console.log('📥 Fetching feed posts for user:', currentUser.id);

      // Fetch posts
      const { data: posts, error } = await supabase
        .from('user_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch posts:', error);
        throw new Error(`Failed to fetch posts: ${error.message}`);
      }

      if (!posts || posts.length === 0) {
        console.log('✅ No posts found');
        return [];
      }

      // Fetch user data for all posts
      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, avatar_url')
        .in('id', userIds);

      // Create a map of users by id
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Combine posts with user data
      const postsWithUsers = posts.map(post => ({
        ...post,
        user: userMap.get(post.user_id)
      }));

      console.log('✅ Fetched posts:', postsWithUsers.length);
      return postsWithUsers as UserPost[];
    } catch (error) {
      console.error('❌ Failed to fetch feed posts:', error);
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
        throw new Error(`Failed to delete post: ${error.message}`);
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
