import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FitbitDataService } from '../services/fitbitDataService';

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
  caloriesSeries?: Array<{ date: string; calories: number }>;
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
const FITBIT_STATUS_URL = 'http://localhost:3001/api/fitbit/status';

export function useFitbit() {
  const { user } = useAuth();
  const [state, setState] = useState<FitbitState>({
    isAuthenticated: false,
    data: {},
    isLoading: false,
    error: null,
  });

  // Fetch Fitbit data
  const fetchFitbitData = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch activity data - backend will handle token retrieval and refresh
      const activityResponse = await fetch(`${FITBIT_API_BASE}/activities/${today}?userId=${user.id}`);

      // Fetch sleep data
      const sleepResponse = await fetch(`${FITBIT_API_BASE}/sleep/${today}?userId=${user.id}`);

      // Fetch heart rate data
      const heartRateResponse = await fetch(`${FITBIT_API_BASE}/heart/${today}?userId=${user.id}`);

      if (!activityResponse.ok) {
        throw new Error(`Activity API error: ${activityResponse.status}`);
      }

      const activityData = await activityResponse.json();
      const sleepData = sleepResponse.ok ? await sleepResponse.json() : null;
      const heartRateData = heartRateResponse.ok ? await heartRateResponse.json() : null;

      console.log('Fitbit API responses:', { activityData, sleepData, heartRateData });

      // Store data in Supabase for persistence and backend access
      try {
        await FitbitDataService.storeAllData(user.id, today, {
          activity: activityData,
          sleep: sleepData,
          heartRate: heartRateData,
        });
        
        await FitbitDataService.logSync(user.id, 'all', 'success');
        console.log('✓ All Fitbit data stored in Supabase');
      } catch (storageError) {
        console.error('Failed to store data in Supabase:', storageError);
        await FitbitDataService.logSync(
          user.id, 
          'all', 
          'error', 
          storageError instanceof Error ? storageError.message : 'Unknown error'
        );
        // Don't throw - we still want to show the data even if storage fails
      }

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
      
      // Log the error
      await FitbitDataService.logSync(
        user.id, 
        'all', 
        'error', 
        error instanceof Error ? error.message : 'Failed to fetch Fitbit data'
      );
      
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch Fitbit data',
        isLoading: false 
      }));
    }
  }, [user?.id]);

  // Check Fitbit connection status from Supabase
  const checkFitbitStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${FITBIT_STATUS_URL}?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, isAuthenticated: data.connected }));
        
        if (data.connected) {
          fetchFitbitData();
        }
      }
    } catch (error) {
      console.error('Failed to check Fitbit status:', error);
    }
  }, [user?.id, fetchFitbitData]);

  // Check for existing token on mount by querying backend
  useEffect(() => {
    if (user?.id) {
      checkFitbitStatus();
    }
  }, [user?.id, checkFitbitStatus]);

  // Fetch calories time series for a given range ending on provided date (default: 7d ending today)
  const fetchCaloriesSeries = useCallback(async (range: string = '7d', endDate?: string) => {
    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return;
    }

    try {
      const end = endDate || new Date().toISOString().split('T')[0];
      const res = await fetch(`${FITBIT_API_BASE}/calories/${end}/${range}?userId=${user.id}`);
      if (!res.ok) {
        throw new Error(`Calories series API error: ${res.status}`);
      }
      const data = await res.json();
      const series: Array<{ date: string; calories: number }> = (data["activities-calories"] || []).map((d: any) => ({
        date: d.dateTime,
        calories: Number(d.value) || 0,
      }));

      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          caloriesSeries: series,
        },
      }));
    } catch (error) {
      console.error('Fetch calories series error:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Failed to fetch calories series' }));
    }
  }, [user?.id]);

  // Generate OAuth URL and redirect to Fitbit
  const authenticate = useCallback(() => {
    const clientId = String(import.meta.env.VITE_FITBIT_CLIENT_ID || '').trim();
    const redirectUri = String(import.meta.env.VITE_FITBIT_REDIRECT_URI || '').trim();
    
    if (!clientId || !redirectUri) {
      setState(prev => ({ ...prev, error: 'Fitbit credentials not configured' }));
      return;
    }

    const scope = 'activity heartrate sleep profile';
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state for verification in sessionStorage (temporary, same-tab only)
    sessionStorage.setItem('fitbit_oauth_state', state);
    
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
    const storedState = sessionStorage.getItem('fitbit_oauth_state');
    
    if (state !== storedState) {
      setState(prev => ({ ...prev, error: 'Invalid OAuth state', isLoading: false }));
      return;
    }

    if (!user?.id) {
      setState(prev => ({ ...prev, error: 'User not authenticated', isLoading: false }));
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
          userId: user.id, // Include userId for Supabase storage
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      await tokenResponse.json();
      
      // Clean up OAuth state
      sessionStorage.removeItem('fitbit_oauth_state');

      setState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
      await fetchFitbitData();
      
    } catch (error) {
      console.error('Fitbit OAuth error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Authentication failed',
        isLoading: false 
      }));
    }
  }, [user?.id, fetchFitbitData]);

  // Integrate workout sync into primary backend-driven fetch
  

  // Refresh token - now handled automatically by backend
  const refreshToken = useCallback(async () => {
    // Token refresh is now handled automatically by the backend
    // when fetching data. This function triggers a data refresh.
    await fetchFitbitData();
  }, [fetchFitbitData]);

  // Disconnect Fitbit
  const signOut = useCallback(async () => {
    if (!user?.id) return;

    try {
      await fetch('http://localhost:3001/api/fitbit/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (error) {
      console.error('Error disconnecting Fitbit:', error);
    }
    
    sessionStorage.removeItem('fitbit_oauth_state');
    
    setState({
      isAuthenticated: false,
      data: {},
      isLoading: false,
      error: null,
    });
  }, [user?.id]);

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
    fetchCaloriesSeries,
  };
}
