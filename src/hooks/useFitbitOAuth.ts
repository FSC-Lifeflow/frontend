import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for Fitbit OAuth flow
 * Initiates OAuth and handles the redirect-based flow
 */
export function useFitbitOAuth() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateOAuth = useCallback(() => {
    if (!user?.id) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clientId = import.meta.env.VITE_FITBIT_CLIENT_ID?.trim() || null;
      const redirectUri = import.meta.env.VITE_FITBIT_REDIRECT_URI?.trim() || null;
      
      if (!clientId || !redirectUri) {
        console.log("Client ID: ", clientId);
        console.log("Redirect URI: ", redirectUri);
        throw new Error('Fitbit credentials not configured');
      }

      const scope = 'activity heartrate sleep profile';
      const responseType = 'code';
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store state for verification in sessionStorage (temporary, same-tab only)
      sessionStorage.setItem('fitbit_oauth_state', state);
      
      const authUrl = 'https://www.fitbit.com/oauth2/authorize?' + new URLSearchParams({
        client_id: clientId,
        response_type: responseType,
        scope: scope,
        redirect_uri: redirectUri,
        state: state,
      });

      // Redirect to Fitbit OAuth (full page redirect)
      // User will be redirected back to /fitbit/callback
      // Callback will handle token exchange and redirect to settings
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
