import { supabase } from '../lib/supabase';

/**
 * Type definition for a social post
 */
export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username?: string;
    avatar_url?: string;
  };
};

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
  async createPost(content: string, imageFile?: File): Promise<Post> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to create a post');
      }

      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageFile) {
        imageUrl = await this.uploadImage(imageFile, user.id);
      }

      console.log('📝 Creating post:', { content, imageUrl });

      // Create post in database
      const { data, error } = await supabase
        .from('user_posts')
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('❌ Post creation error:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      // Fetch user data separately
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', user.id)
        .single();
      
      // Combine post with user data
      const postWithUser = {
        ...data,
        user: userData
      };

      console.log('✅ Post created successfully:', postWithUser);
      return postWithUser as Post;
    } catch (error) {
      console.error('❌ Post creation failed:', error);
      throw error;
    }
  },

  /**
   * Fetches posts from the user's friends and their own posts
   * @param limit - Maximum number of posts to fetch
   * @returns Array of posts
   */
  async getFeedPosts(limit: number = 20): Promise<Post[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to view posts');
      }

      console.log('📥 Fetching feed posts for user:', user.id);

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
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', userIds);

      // Create a map of users by id
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Combine posts with user data
      const postsWithUsers = posts.map(post => ({
        ...post,
        user: userMap.get(post.user_id)
      }));

      console.log('✅ Fetched posts:', postsWithUsers.length);
      return postsWithUsers as Post[];
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
      const { error } = await supabase
        .from('user_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('❌ Failed to delete post:', error);
        throw new Error(`Failed to delete post: ${error.message}`);
      }

      console.log('✅ Post deleted successfully');
    } catch (error) {
      console.error('❌ Post deletion failed:', error);
      throw error;
    }
  }
};
