// Import necessary React hooks and types
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Import authentication service for API calls
import { authService } from '../services/authService';

/**
 * User type definition matching the database schema
 * Represents a user in the application
 */
type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  social_privacy?: boolean;
  avatar_url?: string;
};

/**
 * AuthContextType defines the shape of the authentication context
 * This interface describes all values and functions available through the auth context
 */
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

// Create the authentication context with an undefined default value
// The actual value will be provided by the AuthProvider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * Provides authentication state and methods to child components via context
 * Should wrap the application root to make auth available everywhere
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for current user, loading status, and errors
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh the current user's profile from the backend
   */
  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser as User | null);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  /**
   * Check for existing authentication session on component mount
   * This runs once when the provider is first rendered
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Attempt to get the currently authenticated user
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth check failed:', err);
        // Don't set error state here to prevent UI flicker on initial load
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login with email and password
   * @param email - User's email address
   * @param password - User's password
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.login({ email, password });
      // Store the authentication token in localStorage
      localStorage.setItem('auth_token', token);
      setUser(user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login using Google OAuth
   * Redirects to Google's OAuth consent screen
   */
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.loginWithGoogle();
      // The actual user data will be set after the OAuth callback
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user
   * @param userData - Object containing user registration details
   */
  const register = async (userData: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Register the new user
      await authService.register(userData);
      // Auto-login after successful registration
      await login(userData.email, userData.password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out the current user
   * Clears authentication state and local storage
   */
  const logout = async () => {
    try {
      await authService.logout();
      // Clear the stored token
      localStorage.removeItem('auth_token');
      // Reset user state
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      throw err;
    }
  };

  // Provide the auth context value to child components
  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginWithGoogle, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context
 * Must be used within an AuthProvider
 * @returns The authentication context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
