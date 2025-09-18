import { supabase } from '../lib/supabase';

// User type that matches our database schema
type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export const authService = {
  // Register a new user
  async register(userData: { username: string; firstName: string; lastName: string; email: string; password: string }) {
    try {
      console.log('🚀 Starting registration for:', userData.email);
      
      // Create the auth user with Supabase Auth - the trigger will handle the users table insert
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

  // Login user
  async login(credentials: { email: string; password: string }) {
    try {
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

  // Login with Google
  async loginWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
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

  // Handle OAuth callback (for when user returns from Google OAuth)
  async handleOAuthCallback() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        throw new Error('No session found after OAuth callback');
      }

      console.log('🔍 Google user metadata:', session.user.user_metadata);

      // Extract Google profile data
      const googleProfile = session.user.user_metadata;
      const fullName = googleProfile?.full_name || googleProfile?.name || '';
      const firstName = googleProfile?.given_name || googleProfile?.first_name || fullName.split(' ')[0] || '';
      const lastName = googleProfile?.family_name || googleProfile?.last_name || fullName.split(' ').slice(1).join(' ') || '';
      const email = session.user.email || '';

      // Check if user profile exists in our custom users table
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

      // If user record still doesn't exist, create it with Google data
      if (!userRecord) {
        console.log('Creating user profile for OAuth user with Google data...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            username: '', // Will be filled in onboarding
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

  // Get current user (for session persistence)
  async getCurrentUser() {
    try {
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
      return null;
    }
  },

  // Logout
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

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('❌ Failed to update user profile:', error);
        throw new Error('Failed to update user profile.');
      }
    } catch (error) {
      throw error;
    }
  },
};
