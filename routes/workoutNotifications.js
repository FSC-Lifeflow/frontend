/**
 * Workout Notification Routes
 * Handles scheduled workout completion notifications
 */

export function setupWorkoutNotificationRoutes(app, supabase) {
  /**
   * POST /api/workouts/check-completions
   * Checks for workouts that have ended and sends completion notifications
   * This endpoint should be called periodically (e.g., every 5-15 minutes) by a cron job
   */
  app.post('/api/workouts/check-completions', async (req, res) => {
    try {
      console.log('🔍 Checking for workouts needing completion notifications...');

      // Get all workouts that need notifications
      const { data: workouts, error: fetchError } = await supabase
        .rpc('get_workouts_needing_notification');

      if (fetchError) {
        console.error('❌ Error fetching workouts needing notification:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch workouts' });
      }

      if (!workouts || workouts.length === 0) {
        console.log('✅ No workouts need completion notifications');
        return res.json({ 
          success: true, 
          message: 'No workouts need notifications',
          count: 0 
        });
      }

      console.log(`📋 Found ${workouts.length} workout(s) needing notifications`);

      // Send notification for each workout
      const results = await Promise.allSettled(
        workouts.map(async (workout) => {
          try {
            // Get user info for personalized notification
            const { data: userInfo } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', workout.user_id)
              .single();

            const userName = userInfo 
              ? `${userInfo.first_name} ${userInfo.last_name}` 
              : 'there';

            // Create notification using the RPC function
            const { data: notification, error: notificationError } = await supabase
              .rpc('create_notification_for_user', {
                p_user_id: workout.user_id,
                p_type: 'workout_completion_prompt',
                p_title: 'Workout Complete?',
                p_message: `Did you complete your workout: ${workout.summary}?`,
                p_data: {
                  scheduled_workout_id: workout.id,
                  calendar_event_id: workout.calendar_event_id,
                  workout_summary: workout.summary,
                  workout_description: workout.description,
                  workout_start: workout.start_time,
                  workout_end: workout.end_time,
                  workout_location: workout.location,
                },
                p_read: false
              });

            if (notificationError) {
              console.error(`❌ Failed to create notification for workout ${workout.id}:`, notificationError);
              throw notificationError;
            }

            // Mark notification as sent
            const { error: updateError } = await supabase
              .from('scheduled_workouts')
              .update({
                notification_sent: true,
                notification_sent_at: new Date().toISOString()
              })
              .eq('id', workout.id);

            if (updateError) {
              console.error(`❌ Failed to update notification status for workout ${workout.id}:`, updateError);
              throw updateError;
            }

            console.log(`✅ Sent completion notification for workout: ${workout.summary} (User: ${workout.user_id})`);
            
            return {
              success: true,
              workoutId: workout.id,
              summary: workout.summary
            };
          } catch (error) {
            console.error(`❌ Error processing workout ${workout.id}:`, error);
            return {
              success: false,
              workoutId: workout.id,
              error: error.message
            };
          }
        })
      );

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log(`📊 Notification results: ${successful} successful, ${failed} failed`);

      return res.json({
        success: true,
        message: `Processed ${workouts.length} workout(s)`,
        count: workouts.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
      });
    } catch (error) {
      console.error('❌ Error in check-completions endpoint:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  /**
   * POST /api/workouts/track-calendar-event
   * Tracks a calendar event as a scheduled workout
   */
  app.post('/api/workouts/track-calendar-event', async (req, res) => {
    try {
      const { userId, calendarEvent } = req.body;

      if (!userId || !calendarEvent) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const startTime = calendarEvent.start?.dateTime || calendarEvent.start?.date;
      const endTime = calendarEvent.end?.dateTime || calendarEvent.end?.date;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Calendar event must have start and end times' });
      }

      // Check if already tracked
      const { data: existing } = await supabase
        .from('scheduled_workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('calendar_event_id', calendarEvent.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('scheduled_workouts')
          .update({
            summary: calendarEvent.summary,
            description: calendarEvent.description || null,
            start_time: startTime,
            end_time: endTime,
            location: calendarEvent.location || null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to update scheduled workout:', error);
          return res.status(500).json({ error: 'Failed to update scheduled workout' });
        }

        return res.json({ success: true, data, updated: true });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('scheduled_workouts')
          .insert({
            user_id: userId,
            calendar_event_id: calendarEvent.id,
            summary: calendarEvent.summary,
            description: calendarEvent.description || null,
            start_time: startTime,
            end_time: endTime,
            location: calendarEvent.location || null,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to create scheduled workout:', error);
          return res.status(500).json({ error: 'Failed to create scheduled workout' });
        }

        return res.json({ success: true, data, created: true });
      }
    } catch (error) {
      console.error('❌ Error tracking calendar event:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  console.log('✅ Workout notification routes configured');
}
