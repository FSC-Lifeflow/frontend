import fetch from 'node-fetch';

/**
 * Fitbit Data Routes - n8n Integration
 * Provides formatted Fitbit data from Supabase for n8n workflows
 */
export function setupFitbitDataRoutes(app, supabase, N8N_WEBHOOK_URL) {
  
  /**
   * Get latest Fitbit data for a user (for n8n workflow)
   * 
   * GET /api/fitbit-data/:userId
   * Optional query params:
   *   - date: specific date (default: today)
   *   - format: 'n8n' | 'raw' (default: 'n8n')
   */
  app.get('/api/fitbit-data/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const format = req.query.format || 'n8n';

      // Fetch all data types in parallel
      const [activityResult, sleepResult, heartRateResult] = await Promise.all([
        supabase
          .from('fitbit_activity_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single(),
        supabase
          .from('fitbit_sleep_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single(),
        supabase
          .from('fitbit_heart_rate_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single(),
      ]);

      // Check if any data exists
      const hasData = activityResult.data || sleepResult.data || heartRateResult.data;
      
      if (!hasData) {
        return res.status(404).json({
          error: 'No Fitbit data found for this date',
          date,
          userId,
        });
      }

      // Return raw format if requested
      if (format === 'raw') {
        return res.json({
          activity: activityResult.data,
          sleep: sleepResult.data,
          heartRate: heartRateResult.data,
        });
      }

      // Format for n8n AI analysis workflow
      const n8nPayload = {
        date: date,
        userId: userId,
        
        // Activity metrics
        activity: activityResult.data ? {
          steps: activityResult.data.steps,
          caloriesOut: activityResult.data.calories_out,
          activityCalories: activityResult.data.activity_calories,
          caloriesBMR: activityResult.data.calories_bmr,
          sedentaryMinutes: activityResult.data.sedentary_minutes,
          lightlyActiveMinutes: activityResult.data.lightly_active_minutes,
          fairlyActiveMinutes: activityResult.data.fairly_active_minutes,
          veryActiveMinutes: activityResult.data.very_active_minutes,
          totalActiveMinutes: (activityResult.data.fairly_active_minutes || 0) + 
                             (activityResult.data.very_active_minutes || 0),
          totalDistance: activityResult.data.total_distance,
          restingHeartRate: activityResult.data.resting_heart_rate,
          
          // Goals comparison (you can fetch goals from raw_data if needed)
          goals: {
            steps: 10000, // Default goal, can be extracted from raw_data
            caloriesOut: 2500,
            activeMinutes: 30,
          },
        } : null,
        
        // Sleep metrics
        sleep: sleepResult.data ? {
          duration: sleepResult.data.duration,
          minutesAsleep: sleepResult.data.minutes_asleep,
          minutesAwake: sleepResult.data.minutes_awake,
          efficiency: sleepResult.data.efficiency,
          startTime: sleepResult.data.start_time,
          endTime: sleepResult.data.end_time,
          awakeningsCount: sleepResult.data.awakenings_count,
          
          // Sleep stages
          stages: {
            deep: sleepResult.data.deep_sleep_minutes,
            light: sleepResult.data.light_sleep_minutes,
            rem: sleepResult.data.rem_sleep_minutes,
            wake: sleepResult.data.wake_minutes,
          },
          
          // Sleep quality indicators
          quality: {
            efficiency: sleepResult.data.efficiency,
            awakenings: sleepResult.data.awakenings_count,
            deepSleepPercentage: sleepResult.data.minutes_asleep > 0
              ? Math.round((sleepResult.data.deep_sleep_minutes / sleepResult.data.minutes_asleep) * 100)
              : 0,
            remSleepPercentage: sleepResult.data.minutes_asleep > 0
              ? Math.round((sleepResult.data.rem_sleep_minutes / sleepResult.data.minutes_asleep) * 100)
              : 0,
          },
        } : null,
        
        // Heart rate metrics
        heartRate: heartRateResult.data ? {
          resting: heartRateResult.data.resting_heart_rate,
          zones: heartRateResult.data.heart_rate_zones,
          
          // Calculate time in each zone
          zoneSummary: heartRateResult.data.heart_rate_zones?.reduce((acc, zone) => {
            acc[zone.name.toLowerCase().replace(' ', '_')] = {
              minutes: zone.minutes,
              calories: zone.caloriesOut,
              range: `${zone.min}-${zone.max} bpm`,
            };
            return acc;
          }, {}),
        } : null,
        
        // Metadata
        metadata: {
          syncedAt: activityResult.data?.updated_at || 
                    sleepResult.data?.updated_at || 
                    heartRateResult.data?.updated_at,
          dataAvailability: {
            activity: !!activityResult.data,
            sleep: !!sleepResult.data,
            heartRate: !!heartRateResult.data,
          },
        },
      };

      res.json(n8nPayload);
      
    } catch (error) {
      console.error('Error fetching Fitbit data for n8n:', error);
      res.status(500).json({
        error: 'Failed to fetch Fitbit data',
        message: error.message,
      });
    }
  });

  /**
   * Get Fitbit data for a date range (for trend analysis)
   * 
   * GET /api/fitbit-data/:userId/range
   * Query params:
   *   - startDate: YYYY-MM-DD
   *   - endDate: YYYY-MM-DD
   */
  app.get('/api/fitbit-data/:userId/range', async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required',
        });
      }

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

      // Calculate trends and averages
      const trends = {
        activity: {
          averageSteps: calculateAverage(activityData.data, 'steps'),
          averageCalories: calculateAverage(activityData.data, 'calories_out'),
          averageActiveMinutes: calculateAverage(
            activityData.data, 
            (d) => (d.fairly_active_minutes || 0) + (d.very_active_minutes || 0)
          ),
          data: activityData.data,
        },
        sleep: {
          averageDuration: calculateAverage(sleepData.data, 'minutes_asleep'),
          averageEfficiency: calculateAverage(sleepData.data, 'efficiency'),
          averageDeepSleep: calculateAverage(sleepData.data, 'deep_sleep_minutes'),
          data: sleepData.data,
        },
        heartRate: {
          averageRestingHR: calculateAverage(heartRateData.data, 'resting_heart_rate'),
          data: heartRateData.data,
        },
        dateRange: {
          start: startDate,
          end: endDate,
          days: activityData.data?.length || 0,
        },
      };

      res.json(trends);
      
    } catch (error) {
      console.error('Error fetching Fitbit data range:', error);
      res.status(500).json({
        error: 'Failed to fetch Fitbit data range',
        message: error.message,
      });
    }
  });

  /**
   * Webhook endpoint for n8n to trigger on new data
   * This can be called after data is synced
   * 
   * POST /api/fitbit-data/webhook/n8n
   */
  app.post('/api/fitbit-data/webhook/n8n', async (req, res) => {
    try {
      const { userId, date } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const targetDate = date || new Date().toISOString().split('T')[0];

      // Fetch the data using the same endpoint logic
      const [activityResult, sleepResult, heartRateResult] = await Promise.all([
        supabase
          .from('fitbit_activity_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', targetDate)
          .single(),
        supabase
          .from('fitbit_sleep_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', targetDate)
          .single(),
        supabase
          .from('fitbit_heart_rate_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', targetDate)
          .single(),
      ]);

      const hasData = activityResult.data || sleepResult.data || heartRateResult.data;
      
      if (!hasData) {
        return res.status(404).json({
          error: 'No Fitbit data found for this date',
          date: targetDate,
          userId,
        });
      }

      // Format data for n8n (same as GET endpoint)
      const n8nPayload = {
        date: targetDate,
        userId: userId,
        activity: activityResult.data ? {
          steps: activityResult.data.steps,
          caloriesOut: activityResult.data.calories_out,
          activityCalories: activityResult.data.activity_calories,
          totalActiveMinutes: (activityResult.data.fairly_active_minutes || 0) + 
                             (activityResult.data.very_active_minutes || 0),
          totalDistance: activityResult.data.total_distance,
          restingHeartRate: activityResult.data.resting_heart_rate,
        } : null,
        sleep: sleepResult.data ? {
          duration: sleepResult.data.duration,
          minutesAsleep: sleepResult.data.minutes_asleep,
          efficiency: sleepResult.data.efficiency,
          stages: {
            deep: sleepResult.data.deep_sleep_minutes,
            light: sleepResult.data.light_sleep_minutes,
            rem: sleepResult.data.rem_sleep_minutes,
          },
        } : null,
        heartRate: heartRateResult.data ? {
          resting: heartRateResult.data.resting_heart_rate,
          zones: heartRateResult.data.heart_rate_zones,
        } : null,
      };

      // Send to n8n webhook if configured
      if (N8N_WEBHOOK_URL) {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(n8nPayload),
        });
        
        if (!n8nResponse.ok) {
          console.error('n8n webhook failed:', await n8nResponse.text());
          return res.status(500).json({ 
            error: 'n8n webhook failed',
            data: n8nPayload // Still return the data
          });
        }
        
        res.json({ 
          success: true, 
          message: 'n8n workflow triggered',
          data: n8nPayload
        });
      } else {
        // No webhook configured, just return the data
        res.json({ 
          success: true, 
          message: 'Data retrieved (n8n webhook not configured)',
          data: n8nPayload
        });
      }
      
    } catch (error) {
      console.error('Error triggering n8n workflow:', error);
      res.status(500).json({
        error: 'Failed to trigger n8n workflow',
        message: error.message,
      });
    }
  });
}

/**
 * Helper function to calculate average
 */
function calculateAverage(data, field) {
  if (!data || data.length === 0) return 0;
  
  const getValue = typeof field === 'function' 
    ? field 
    : (item) => item[field];
  
  const sum = data.reduce((acc, item) => {
    const value = getValue(item);
    return acc + (value || 0);
  }, 0);
  
  return Math.round(sum / data.length);
}
