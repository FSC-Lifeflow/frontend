import { useState, useEffect, useCallback } from 'react';

// Types for Fitbit data
export interface FitbitActivityData {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  sedentaryMinutes: number;
  lightlyActiveMinutes: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;
}

export interface FitbitSleepData {
  totalSleepRecords: number;
  totalMinutesAsleep: number;
  totalTimeInBed: number;
  efficiency: number;
}

export interface FitbitHeartRateData {
  restingHeartRate?: number;
  heartRateZones: Array<{
    name: string;
    min: number;
    max: number;
    minutes: number;
    caloriesOut: number;
  }>;
}

export interface FitbitData {
  activity?: FitbitActivityData;
  sleep?: FitbitSleepData;
  heartRate?: FitbitHeartRateData;
  lastSync?: string;
}

export interface FitbitState {
  isAuthenticated: boolean;
  data: FitbitData;
  isLoading: boolean;
  error: string | null;
}

// Fitbit API configuration
const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'http://localhost:3001/api/fitbit/token';
const FITBIT_API_BASE = 'http://localhost:3001/api/fitbit';

export function useFitbit() {
  const [state, setState] = useState<FitbitState>({
    isAuthenticated: false,
    data: {},
    isLoading: false,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('fitbit_access_token');
    const tokenExpiry = localStorage.getItem('fitbit_token_expiry');
    
    if (token && tokenExpiry) {
      const now = new Date().getTime();
      const expiry = parseInt(tokenExpiry);
      
      if (now < expiry) {
        setState(prev => ({ ...prev, isAuthenticated: true }));
        fetchFitbitData(token);
      } else {
        // Token expired, clear it
        localStorage.removeItem('fitbit_access_token');
        localStorage.removeItem('fitbit_token_expiry');
        localStorage.removeItem('fitbit_refresh_token');
      }
    }
  }, []);

  // Generate OAuth URL and redirect to Fitbit
  const authenticate = useCallback(() => {
    const clientId = import.meta.env.VITE_FITBIT_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_FITBIT_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      setState(prev => ({ ...prev, error: 'Fitbit credentials not configured' }));
      return;
    }

    const scope = 'activity heartrate sleep profile';
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state for verification
    localStorage.setItem('fitbit_oauth_state', state);
    
    const authUrl = `${FITBIT_AUTH_URL}?` + new URLSearchParams({
      client_id: clientId,
      response_type: responseType,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
    });

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    window.location.href = authUrl;
  }, []);

  // Handle OAuth callback (call this from your callback route)
  const handleCallback = useCallback(async (code: string, state: string) => {
    const storedState = localStorage.getItem('fitbit_oauth_state');
    
    if (state !== storedState) {
      setState(prev => ({ ...prev, error: 'Invalid OAuth state', isLoading: false }));
      return;
    }

    try {
      const redirectUri = import.meta.env.VITE_FITBIT_REDIRECT_URI;

      const tokenResponse = await fetch(FITBIT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      
      // Store tokens
      const expiryTime = new Date().getTime() + (tokenData.expires_in * 1000);
      localStorage.setItem('fitbit_access_token', tokenData.access_token);
      localStorage.setItem('fitbit_refresh_token', tokenData.refresh_token);
      localStorage.setItem('fitbit_token_expiry', expiryTime.toString());
      localStorage.removeItem('fitbit_oauth_state');

      setState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
      await fetchFitbitData(tokenData.access_token);
      
    } catch (error) {
      console.error('Fitbit OAuth error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Authentication failed',
        isLoading: false 
      }));
    }
  }, []);

  // Fetch Fitbit data
  const fetchFitbitData = useCallback(async (accessToken?: string) => {
    const token = accessToken || localStorage.getItem('fitbit_access_token');
    
    if (!token) {
      setState(prev => ({ ...prev, error: 'No access token available' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch activity data
      const activityResponse = await fetch(`${FITBIT_API_BASE}/activities/${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch sleep data
      const sleepResponse = await fetch(`${FITBIT_API_BASE}/sleep/${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch heart rate data
      const heartRateResponse = await fetch(`${FITBIT_API_BASE}/heart/${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!activityResponse.ok) {
        throw new Error(`Activity API error: ${activityResponse.status}`);
      }

      const activityData = await activityResponse.json();
      const sleepData = sleepResponse.ok ? await sleepResponse.json() : null;
      const heartRateData = heartRateResponse.ok ? await heartRateResponse.json() : null;

      console.log('Fitbit API responses:', { activityData, sleepData, heartRateData });

      const parsedData: FitbitData = {
        activity: {
          steps: activityData.summary.steps,
          distance: activityData.summary.distances[0]?.distance || 0,
          calories: activityData.summary.caloriesOut,
          activeMinutes: activityData.summary.veryActiveMinutes + activityData.summary.fairlyActiveMinutes,
          sedentaryMinutes: activityData.summary.sedentaryMinutes,
          lightlyActiveMinutes: activityData.summary.lightlyActiveMinutes,
          fairlyActiveMinutes: activityData.summary.fairlyActiveMinutes,
          veryActiveMinutes: activityData.summary.veryActiveMinutes,
        },
        sleep: sleepData?.summary ? {
          totalSleepRecords: sleepData.summary.totalSleepRecords,
          totalMinutesAsleep: sleepData.summary.totalMinutesAsleep,
          totalTimeInBed: sleepData.summary.totalTimeInBed,
          efficiency: sleepData.summary.efficiency,
        } : undefined,
        heartRate: heartRateData?.['activities-heart']?.[0] ? {
          restingHeartRate: heartRateData['activities-heart'][0].value.restingHeartRate,
          heartRateZones: heartRateData['activities-heart'][0].value.heartRateZones,
        } : undefined,
        lastSync: new Date().toISOString(),
      };

      setState(prev => ({ 
        ...prev, 
        data: parsedData,
        isLoading: false 
      }));

    } catch (error) {
      console.error('Fitbit data fetch error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch Fitbit data',
        isLoading: false 
      }));
    }
  }, []);

  // Refresh token if needed
  const refreshToken = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem('fitbit_refresh_token');
    
    if (!refreshTokenValue) {
      setState(prev => ({ ...prev, error: 'No refresh token available' }));
      return;
    }

    try {
      const clientId = import.meta.env.VITE_FITBIT_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_FITBIT_CLIENT_SECRET;

      const response = await fetch(FITBIT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokenData = await response.json();
      
      // Update stored tokens
      const expiryTime = new Date().getTime() + (tokenData.expires_in * 1000);
      localStorage.setItem('fitbit_access_token', tokenData.access_token);
      localStorage.setItem('fitbit_refresh_token', tokenData.refresh_token);
      localStorage.setItem('fitbit_token_expiry', expiryTime.toString());

      await fetchFitbitData(tokenData.access_token);
      
    } catch (error) {
      console.error('Token refresh error:', error);
      signOut();
    }
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    localStorage.removeItem('fitbit_access_token');
    localStorage.removeItem('fitbit_refresh_token');
    localStorage.removeItem('fitbit_token_expiry');
    localStorage.removeItem('fitbit_oauth_state');
    
    setState({
      isAuthenticated: false,
      data: {},
      isLoading: false,
      error: null,
    });
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    if (state.isAuthenticated) {
      fetchFitbitData();
    }
  }, [state.isAuthenticated, fetchFitbitData]);

  return {
    ...state,
    authenticate,
    handleCallback,
    signOut,
    refreshData,
    refreshToken,
  };
}
