import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types for Google Calendar events
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

export interface GoogleCalendarState {
  isAuthenticated: boolean;
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
}

// Token storage interface for Supabase
interface GoogleTokenData {
  user_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  scope: string;
  created_at?: string;
  updated_at?: string;
}

// Google Calendar API configuration
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    events: [],
    isLoading: false,
    error: null,
  });

  const [tokenClient, setTokenClient] = useState<any>(null);

  // Supabase token management functions
  const saveTokenToSupabase = useCallback(async (tokenResponse: any) => {
    if (!user?.id) {
      console.error('No authenticated user to save token for');
      return;
    }

    try {
      const tokenData: Omit<GoogleTokenData, 'created_at' | 'updated_at'> = {
        user_id: user.id,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
        scope: SCOPES,
      };

      const { error } = await supabase
        .from('google_calendar_tokens')
        .upsert(tokenData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error saving Google Calendar token:', error);
        throw error;
      }

      console.log('Google Calendar token saved successfully');
    } catch (error) {
      console.error('Failed to save token to Supabase:', error);
      throw error;
    }
  }, [user?.id]);

  const getTokenFromSupabase = useCallback(async (): Promise<GoogleTokenData | null> => {
    if (!user?.id) {
      return null;
    }

    try {
      // Use order/limit + maybeSingle to avoid 406 when multiple rows exist
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No token found, not an error
          return null;
        }
        console.error('Error fetching Google Calendar token:', error);
        return null;
      }

      // Check if token is expired (with 5 minute buffer)
      const expiresAt = new Date(data.expires_at).getTime();
      if (Date.now() >= (expiresAt - 5 * 60 * 1000)) {
        console.log('Stored token is expired, removing it');
        await clearTokenFromSupabase();
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get token from Supabase:', error);
      return null;
    }
  }, [user?.id]);

  const clearTokenFromSupabase = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing Google Calendar token:', error);
      }
    } catch (error) {
      console.error('Failed to clear token from Supabase:', error);
    }
  }, [user?.id]);

  // Set the access token in gapi client
  const setGapiToken = useCallback((accessToken: string) => {
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: accessToken });
    }
  }, []);

  // Check and restore authentication state on initialization
  const checkStoredAuthentication = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    const storedToken = await getTokenFromSupabase();
    if (storedToken && window.gapi?.client) {
      setGapiToken(storedToken.access_token);
      setState(prev => ({ ...prev, isAuthenticated: true }));
      // Fetch events with stored token
      fetchEvents();
    }
  }, [user?.id, getTokenFromSupabase, setGapiToken]);

  // Initialize Google API
  const initializeGapi = useCallback(async () => {
    try {
      if (!window.gapi) {
        throw new Error('Google API not loaded');
      }

      await window.gapi.load('client', async () => {
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        
        // Check for stored authentication after gapi is initialized
        if (user?.id) {
          checkStoredAuthentication();
        }
      });

      // Initialize Google Identity Services
      if (window.google) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.error) {
              setState(prev => ({ ...prev, error: response.error, isLoading: false }));
              return;
            }
            
            try {
              // Save token to Supabase
              await saveTokenToSupabase(response);
              setGapiToken(response.access_token);
              setState(prev => ({ ...prev, isAuthenticated: true, error: null }));
              fetchEvents();
            } catch (error) {
              setState(prev => ({ 
                ...prev, 
                error: 'Failed to save authentication token', 
                isLoading: false 
              }));
            }
          },
        });
        setTokenClient(client);
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize Google API',
        isLoading: false 
      }));
    }
  }, [user?.id, saveTokenToSupabase, setGapiToken, checkStoredAuthentication]);

  // Load Google API scripts
  useEffect(() => {
    const loadGoogleAPI = () => {
      // Load Google API script
      if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
          // Load Google Identity Services script
          if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = initializeGapi;
            document.head.appendChild(gisScript);
          } else {
            initializeGapi();
          }
        };
        document.head.appendChild(gapiScript);
      } else if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = initializeGapi;
        document.head.appendChild(gisScript);
      } else {
        initializeGapi();
      }
    };

    // Only initialize if user is authenticated
    if (user?.id) {
      loadGoogleAPI();
    } else {
      // Clear state if user is not authenticated
      setState({
        isAuthenticated: false,
        events: [],
        isLoading: false,
        error: null,
      });
    }
  }, [initializeGapi, user?.id]);

  // Authenticate with Google
  const authenticate = useCallback(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to connect Google Calendar' }));
      return;
    }

    if (!tokenClient) {
      setState(prev => ({ ...prev, error: 'Google API not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    tokenClient.requestAccessToken();
  }, [tokenClient, user?.id]);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    if (!window.gapi?.client?.calendar) {
      setState(prev => ({ ...prev, error: 'Calendar API not available' }));
      return;
    }

    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to view calendar events' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if we have a valid token
      const storedToken = await getTokenFromSupabase();
      if (!storedToken && !state.isAuthenticated) {
        setState(prev => ({ ...prev, error: 'Not authenticated with Google Calendar', isLoading: false }));
        return;
      }

      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // Next 7 days

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        showDeleted: false,
        singleEvents: true,
        maxResults: 20,
        orderBy: 'startTime',
      });

      const events = response.result.items || [];
      
      // Log the fetched events details for debugging
      console.log('Google Calendar Events Fetched:', {
        totalEvents: events.length,
        rawEvents: events,
        processedEvents: events.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          attendees: event.attendees,
        }))
      });
      
      setState(prev => ({ 
        ...prev, 
        events: events.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          attendees: event.attendees,
        })),
        isLoading: false 
      }));
    } catch (error) {
      console.log("ERROR", error);
      
      // If error is due to invalid token, clear stored token and require re-authentication
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('unauthorized'))) {
        await clearTokenFromSupabase();
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false,
          error: 'Google Calendar authentication expired. Please sign in again.',
          isLoading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to fetch events',
          isLoading: false 
        }));
      }
    }
  }, [user?.id, getTokenFromSupabase, clearTokenFromSupabase, state.isAuthenticated]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const storedToken = await getTokenFromSupabase();
      if (storedToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(storedToken.access_token);
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    }
    
    await clearTokenFromSupabase();
    setState({
      isAuthenticated: false,
      events: [],
      isLoading: false,
      error: null,
    });
  }, [getTokenFromSupabase, clearTokenFromSupabase]);

  // Refresh events
  const refreshEvents = useCallback(() => {
    if (state.isAuthenticated && user?.id) {
      fetchEvents();
    }
  }, [state.isAuthenticated, user?.id, fetchEvents]);

  return {
    ...state,
    authenticate,
    signOut,
    refreshEvents,
  };
}
