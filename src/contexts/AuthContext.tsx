import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/authService';

type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.login({ email, password });
      localStorage.setItem('auth_token', token);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authService.loginWithGoogle();
      localStorage.setItem('auth_token', token);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
      await authService.register(userData);
      // Auto-login after registration
      await login(userData.email, userData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
