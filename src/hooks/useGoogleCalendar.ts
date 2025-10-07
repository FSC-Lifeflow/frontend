import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/config';

const BACKEND_URL = API_BASE_URL;

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
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  backgroundColor: string;
  primary: boolean;
}

export interface GoogleCalendarState {
  isAuthenticated: boolean;
  events: CalendarEvent[];
  calendars: CalendarInfo[];
  isLoading: boolean;
  error: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  hasRefreshToken: boolean;
  isExpired: boolean;
}

/**
 * Google Calendar hook - Server-side OAuth implementation
 * All authentication and API calls go through backend
 */
export function useGoogleCalendar() {
  const { user } = useAuth();
  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    events: [],
    calendars: [],
    isLoading: false,
    error: null,
  });

  // Check connection status from backend
  const checkConnectionStatus = useCallback(async (): Promise<ConnectionStatus | null> => {
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

      if (!data) return null;

      const expiresAt = (data as any).expires_at || (data as any).access_token_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
      const hasRefreshToken = Boolean((data as any).refresh_token);

      return {
        connected: true,
        hasRefreshToken,
        isExpired,
      } as ConnectionStatus;
    } catch (error) {
      console.error('Connection status check error:', error);
      return null;
    }
  }, [user?.id]);

  // Check authentication status on mount and when user changes
  useEffect(() => {
    const initializeAuth = async () => {
      if (!user?.id) {
        setState({
          isAuthenticated: false,
          events: [],
          calendars: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      const status = await checkConnectionStatus();
      
      if (status?.connected && status?.hasRefreshToken) {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        // Fetch events on initialization if connected
        fetchEvents();
      } else {
        setState(prev => ({ ...prev, isAuthenticated: false }));
      }
    };

    initializeAuth();
  }, [user?.id, checkConnectionStatus]);

  // Fetch calendar events from all calendars
  const fetchEvents = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to view calendar events' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // Next 7 days

      const params = new URLSearchParams({
        userId: user.id,
        timeMin,
        timeMax,
        maxResults: '20',
      });

      const response = await fetch(`${BACKEND_URL}/api/google/calendar/events?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ 
            ...prev, 
            isAuthenticated: false,
            error: 'Not authenticated with Google Calendar',
            isLoading: false 
          }));
          return;
        }
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      const events = data.items || [];
      const calendars = data.calendars || [];
      
      console.log('Google Calendar Events Fetched:', {
        totalEvents: events.length,
        totalCalendars: calendars.length,
        events: events.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          start: event.start,
          end: event.end,
          calendarName: event.calendarName,
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
          calendarId: event.calendarId,
          calendarName: event.calendarName,
          calendarColor: event.calendarColor,
        })),
        calendars: calendars,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Fetch events error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false 
      }));
    }
  }, [user?.id]);

  // Fetch events from a specific calendar by ID
  const fetchEventsFromCalendar = useCallback(async (calendarId: string) => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to view calendar events' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(); // Next 7 days

      const params = new URLSearchParams({
        userId: user.id,
        timeMin,
        timeMax,
        maxResults: '20',
      });

      const response = await fetch(`${BACKEND_URL}/api/google/calendar/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ 
            ...prev, 
            isAuthenticated: false,
            error: 'Not authenticated with Google Calendar',
            isLoading: false 
          }));
          return;
        }
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      const events = data.items || [];
      
      console.log(`Google Calendar Events Fetched from calendar ${calendarId}:`, {
        totalEvents: events.length,
        events: events.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          start: event.start,
          end: event.end,
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
          calendarId: event.calendarId,
          calendarName: event.calendarName,
          calendarColor: event.calendarColor,
        })),
        isLoading: false 
      }));
    } catch (error) {
      console.error('Fetch events error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false 
      }));
    }
  }, [user?.id]);

  // Sign out / disconnect
  const signOut = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/google/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setState({
        isAuthenticated: false,
        events: [],
        calendars: [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to disconnect' 
      }));
    }
  }, [user?.id]);

  // Refresh events
  const refreshEvents = useCallback(() => {
    if (state.isAuthenticated && user?.id) {
      fetchEvents();
    }
  }, [state.isAuthenticated, user?.id, fetchEvents]);

  // Note: Authentication is handled by useGoogleCalendarOAuth hook
  // This hook only manages the authenticated state and fetching events
  return {
    ...state,
    signOut,
    refreshEvents,
    fetchEventsFromCalendar,
  };
}
