import { useState, useEffect, useCallback } from 'react';

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

// Google Calendar API configuration
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export function useGoogleCalendar() {
  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    events: [],
    isLoading: false,
    error: null,
  });

  const [tokenClient, setTokenClient] = useState<any>(null);

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
      });

      // Initialize Google Identity Services
      if (window.google) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              setState(prev => ({ ...prev, error: response.error, isLoading: false }));
              return;
            }
            setState(prev => ({ ...prev, isAuthenticated: true, error: null }));
            fetchEvents();
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
  }, []);

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

    loadGoogleAPI();
  }, [initializeGapi]);

  // Authenticate with Google
  const authenticate = useCallback(() => {
    if (!tokenClient) {
      setState(prev => ({ ...prev, error: 'Google API not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    tokenClient.requestAccessToken();
  }, [tokenClient]);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    if (!window.gapi?.client?.calendar) {
      setState(prev => ({ ...prev, error: 'Calendar API not available' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
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
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false 
      }));
    }
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    if (window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(window.gapi.client.getToken().access_token);
    }
    setState({
      isAuthenticated: false,
      events: [],
      isLoading: false,
      error: null,
    });
  }, []);

  // Refresh events
  const refreshEvents = useCallback(() => {
    if (state.isAuthenticated) {
      fetchEvents();
    }
  }, [state.isAuthenticated, fetchEvents]);

  return {
    ...state,
    authenticate,
    signOut,
    refreshEvents,
  };
}
