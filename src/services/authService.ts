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
