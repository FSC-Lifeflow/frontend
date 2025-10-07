import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/config';

/**
 * Hook for Google Calendar OAuth flow
 * Initiates OAuth and handles the redirect-based flow
 */
export function useGoogleCalendarOAuth() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateOAuth = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get OAuth URL from backend
      const response = await fetch(`${API_BASE_URL}/api/google/auth-url?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth (full page redirect)
      // User will be redirected back to /auth/google/callback on backend
      // Backend will then redirect to /settings?calendar=connected
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    initiateOAuth,
    isLoading,
    error,
  };
}
