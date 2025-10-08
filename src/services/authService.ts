// Import Supabase client configuration
import { supabase } from '../lib/supabase';

/**
 * Type definition for user data that matches our database schema
 * This ensures type safety when working with user data throughout the application
 */
type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  social_privacy?: boolean;
  activity_sharing?: boolean;
};

/**
 * Auth Service
 * Handles all authentication-related functionality including:
 * - User registration
 * - Email/password login
 * - Google OAuth login
 * - Session management
 * - User profile updates
 */
export const authService = {
  /**
   * Registers a new user with email and password
   * @param userData - Object containing user registration details
   * @returns Promise that resolves when registration is complete
   * @throws Error if registration fails
   */
  async register(userData: { username: string; firstName: string; lastName: string; email: string; password: string }) {
    try {
      console.log('🚀 Starting registration for:', userData.email);
      
      // Create the auth user with Supabase Auth
      // The auth.users table is populated first, then a database trigger
      // handles creating the corresponding record in the public.users table
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        console.error('❌ No user returned from auth signup');
        throw new Error('Failed to create user');
      }

      console.log('✅ Auth user created, trigger will handle profile creation.');
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  },

  /**
   * Authenticates a user with email and password
   * @param credentials - Object containing email and password
   * @returns Object containing user data and access token
   * @throws Error with user-friendly message if login fails
   */
  async login(credentials: { email: string; password: string }) {
    try {
      // Attempt to authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        // Provide more helpful error messages
        if (authError.message === 'Email not confirmed') {
          throw new Error('Please confirm your email address before signing in. Check your email for a confirmation link, or contact support if you need help.');
        }
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. If you just registered, please check your email for a confirmation link first.');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Retry fetching user data to account for trigger delay
      // This is important because there might be a slight delay between auth user creation
      // and the database trigger creating the user profile
      let userRecord = null;
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (data) {
          userRecord = data;
          break;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Failed to fetch user data on login:', error);
          throw new Error('Failed to fetch user data after login.');
        }

        // Wait before retrying
        if (i < 2) {
          console.log(`User record not found, retrying... (attempt ${i + 2})`);
          await new Promise(res => setTimeout(res, 500));
        }
      }

      if (!userRecord) {
        console.error('❌ Failed to fetch user data after multiple attempts.');
        throw new Error('Could not retrieve user profile after login.');
      }

      return {
        user: userRecord,
        token: authData.session?.access_token || '',
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Initiates Google OAuth login flow
   * @returns OAuth response data
   * @throws Error if OAuth initialization fails
   */
  async loginWithGoogle() {
    try {
      // Configure OAuth with Google provider
      // Redirects to Google's consent screen, then back to /auth/callback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',  // Request refresh token
            prompt: 'consent',       // Force consent screen to get refresh token
          }
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Google OAuth initiated, redirecting...');
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Handles the OAuth callback after successful Google authentication
   * Retrieves or creates user profile and returns session data
   * @returns Object containing user data and access token
   * @throws Error if OAuth callback handling fails
   */
  async handleOAuthCallback() {
    try {
      // Get the current session after OAuth redirect
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        throw new Error('No session found after OAuth callback');
      }

      console.log('🔍 Google user metadata:', session.user.user_metadata);

      // Extract user information from Google profile
      const googleProfile = session.user.user_metadata;
      const fullName = googleProfile?.full_name || googleProfile?.name || '';
      const firstName = googleProfile?.given_name || googleProfile?.first_name || fullName.split(' ')[0] || '';
      const lastName = googleProfile?.family_name || googleProfile?.last_name || fullName.split(' ').slice(1).join(' ') || '';
      const email = session.user.email || '';

      // Check if user profile exists in our database
      // Multiple retries to handle potential replication delay
      let userRecord = null;
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          userRecord = data;
          break;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Failed to fetch user data after OAuth:', error);
          throw new Error('Failed to fetch user data after OAuth login.');
        }

        // Wait before retrying (OAuth user creation might take a moment)
        if (i < 4) {
          console.log(`OAuth user record not found, retrying... (attempt ${i + 2})`);
          await new Promise(res => setTimeout(res, 1000));
        }
      }

      // If user record doesn't exist, create it with Google profile data
      if (!userRecord) {
        console.log('Creating user profile for OAuth user with Google data...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            username: '', // Username will be set during onboarding
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to create OAuth user profile:', insertError);
          throw new Error('Failed to create user profile after OAuth login.');
        }

        userRecord = newUser;
      }

      return {
        user: userRecord,
        token: session.access_token,
      };
    } catch (error) {
      console.error('❌ OAuth callback handling failed:', error);
      throw error;
    }
  },

  /**
   * Retrieves the currently authenticated user's data
   * @returns User data if authenticated, null otherwise
   */
  async getCurrentUser() {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        return null;
      }

      // Get user data from our custom users table
      const { data: userRecord, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (dbError) {
        console.error('❌ Failed to fetch user data on session load:', dbError);
        return null;
      }

      return userRecord;
    } catch (error) {
      // Silently fail - this might be called on every page load
      return null;
    }
  },

  /**
   * Logs out the current user
   * @returns true if logout was successful
   * @throws Error if logout fails
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      return true;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Updates a user's profile information
   * @param userId - ID of the user to update
   * @param updates - Object containing the fields to update
   * @throws Error if update fails
   */
  async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      console.log('🔧 updateUserProfile called with:', updates);
      console.log('🔧 social_privacy in updates:', updates.social_privacy);
      console.log('🔧 social_privacy type:', typeof updates.social_privacy);
      console.log('🔧 activity_sharing in updates:', updates.activity_sharing);
      console.log('🔧 activity_sharing type:', typeof updates.activity_sharing);
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) {
        console.error('❌ Failed to update user profile:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        throw error;
      }
      
      console.log('✅ Profile update successful');
      console.log('✅ Updated data:', data);
    } catch (error) {
      throw error;
    }
  },
};
