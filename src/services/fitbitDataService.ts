import { supabase } from '../lib/supabase';

/**
 * Service for storing and retrieving Fitbit data from Supabase
 */

// Type definitions for Fitbit API responses
interface FitbitActivityResponse {
  summary: {
    steps: number;
    caloriesOut: number;
    activityCalories: number;
    caloriesBMR: number;
    sedentaryMinutes: number;
    lightlyActiveMinutes: number;
    fairlyActiveMinutes: number;
    veryActiveMinutes: number;
    distances: Array<{ activity: string; distance: number }>;
    restingHeartRate?: number;
  };
}

interface FitbitSleepResponse {
  sleep: Array<{
    dateOfSleep: string;
    duration: number;
    minutesAsleep: number;
    minutesAwake: number;
    efficiency: number;
    startTime: string;
    endTime: string;
    awakeningsCount: number;
    levels?: {
      summary: {
        deep?: { minutes: number };
        light?: { minutes: number };
        rem?: { minutes: number };
        wake?: { minutes: number };
      };
    };
  }>;
  summary?: {
    stages?: {
      deep: number;
      light: number;
      rem: number;
      wake: number;
    };
    totalMinutesAsleep: number;
    totalTimeInBed: number;
  };
}

interface FitbitHeartRateResponse {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      restingHeartRate?: number;
      heartRateZones: Array<{
        name: string;
        min: number;
        max: number;
        minutes: number;
        caloriesOut: number;
      }>;
    };
  }>;
}

export class FitbitDataService {
  /**
   * Store activity data in Supabase
   */
  static async storeActivityData(
    userId: string,
    date: string,
    activityData: FitbitActivityResponse
  ): Promise<void> {
    try {
      const { summary } = activityData;
      
      const { error } = await supabase
        .from('fitbit_activity_data')
        .upsert({
          user_id: userId,
          date: date,
          steps: summary.steps,
          calories_out: summary.caloriesOut,
          activity_calories: summary.activityCalories,
          calories_bmr: summary.caloriesBMR,
          sedentary_minutes: summary.sedentaryMinutes,
          lightly_active_minutes: summary.lightlyActiveMinutes,
          fairly_active_minutes: summary.fairlyActiveMinutes,
          very_active_minutes: summary.veryActiveMinutes,
          total_distance: summary.distances.find(d => d.activity === 'total')?.distance || 0,
          resting_heart_rate: summary.restingHeartRate || null,
          raw_data: activityData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Error storing activity data:', error);
        throw error;
      }

      console.log(`✓ Activity data stored for ${date}`);
    } catch (error) {
      console.error('Failed to store activity data:', error);
      throw error;
    }
  }

  /**
   * Store sleep data in Supabase
   */
  static async storeSleepData(
    userId: string,
    date: string,
    sleepData: FitbitSleepResponse
  ): Promise<void> {
    try {
      // Get the main sleep record for the date
      const mainSleep = sleepData.sleep?.find(s => s.dateOfSleep === date);
      
      if (!mainSleep) {
        console.log(`No sleep data found for ${date}`);
        return;
      }

      // Extract sleep stages from the sleep record or summary
      const stages = mainSleep.levels?.summary || sleepData.summary?.stages;

      const { error } = await supabase
        .from('fitbit_sleep_data')
        .upsert({
          user_id: userId,
          date: date,
          duration: mainSleep.duration,
          minutes_asleep: mainSleep.minutesAsleep,
          minutes_awake: mainSleep.minutesAwake,
          efficiency: mainSleep.efficiency,
          start_time: mainSleep.startTime,
          end_time: mainSleep.endTime,
          awakenings_count: mainSleep.awakeningsCount,
          deep_sleep_minutes: stages?.deep || 0,
          light_sleep_minutes: stages?.light || 0,
          rem_sleep_minutes: stages?.rem || 0,
          wake_minutes: stages?.wake || 0,
          raw_data: sleepData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Error storing sleep data:', error);
        throw error;
      }

      console.log(`✓ Sleep data stored for ${date}`);
    } catch (error) {
      console.error('Failed to store sleep data:', error);
      throw error;
    }
  }

  /**
   * Store heart rate data in Supabase
   */
  static async storeHeartRateData(
    userId: string,
    date: string,
    heartRateData: FitbitHeartRateResponse
  ): Promise<void> {
    try {
      const heartRateRecord = heartRateData['activities-heart']?.[0];
      
      if (!heartRateRecord) {
        console.log(`No heart rate data found for ${date}`);
        return;
      }

      const { error } = await supabase
        .from('fitbit_heart_rate_data')
        .upsert({
          user_id: userId,
          date: date,
          resting_heart_rate: heartRateRecord.value.restingHeartRate || null,
          heart_rate_zones: heartRateRecord.value.heartRateZones,
          raw_data: heartRateData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.error('Error storing heart rate data:', error);
        throw error;
      }

      console.log(`✓ Heart rate data stored for ${date}`);
    } catch (error) {
      console.error('Failed to store heart rate data:', error);
      throw error;
    }
  }

  /**
   * Store all Fitbit data (activity, sleep, heart rate) for a given date
   */
  static async storeAllData(
    userId: string,
    date: string,
    data: {
      activity?: FitbitActivityResponse;
      sleep?: FitbitSleepResponse;
      heartRate?: FitbitHeartRateResponse;
    }
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.activity) {
      promises.push(this.storeActivityData(userId, date, data.activity));
    }

    if (data.sleep) {
      promises.push(this.storeSleepData(userId, date, data.sleep));
    }

    if (data.heartRate) {
      promises.push(this.storeHeartRateData(userId, date, data.heartRate));
    }

    await Promise.all(promises);
    
    // Update last sync timestamp in fitbit_tokens table
    await this.updateLastSync(userId);
  }

  /**
   * Update last sync timestamp
   */
  static async updateLastSync(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('fitbit_tokens')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating last sync:', error);
      }
    } catch (error) {
      console.error('Failed to update last sync:', error);
    }
  }

  /**
   * Log sync operation
   */
  static async logSync(
    userId: string,
    syncType: 'activity' | 'sleep' | 'heart_rate' | 'all',
    status: 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('fitbit_sync_logs')
        .insert({
          user_id: userId,
          sync_type: syncType,
          status: status,
          error_message: errorMessage || null,
        });
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  /**
   * Retrieve activity data from Supabase
   */
  static async getActivityData(userId: string, date: string) {
    const { data, error } = await supabase
      .from('fitbit_activity_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching activity data:', error);
      throw error;
    }

    return data;
  }

  /**
   * Retrieve sleep data from Supabase
   */
  static async getSleepData(userId: string, date: string) {
    const { data, error } = await supabase
      .from('fitbit_sleep_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching sleep data:', error);
      throw error;
    }

    return data;
  }

  /**
   * Retrieve heart rate data from Supabase
   */
  static async getHeartRateData(userId: string, date: string) {
    const { data, error } = await supabase
      .from('fitbit_heart_rate_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching heart rate data:', error);
      throw error;
    }

    return data;
  }

  /**
   * Retrieve all data for a date range
   */
  static async getDataRange(
    userId: string,
    startDate: string,
    endDate: string
  ) {
    const [activityData, sleepData, heartRateData] = await Promise.all([
      supabase
        .from('fitbit_activity_data')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('fitbit_sleep_data')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('fitbit_heart_rate_data')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
    ]);

    return {
      activity: activityData.data || [],
      sleep: sleepData.data || [],
      heartRate: heartRateData.data || [],
    };
  }

  /**
   * Get latest sync timestamp
   */
  static async getLastSyncTime(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('fitbit_tokens')
      .select('updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.updated_at;
  }
}
