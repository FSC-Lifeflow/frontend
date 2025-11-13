import { supabase } from '@/lib/supabase';
import { CalendarEvent } from '@/hooks/useGoogleCalendar';

/**
 * Scheduled Workout data structure
 */
export type ScheduledWorkout = {
  id: string;
  user_id: string;
  calendar_event_id: string;
  summary: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  notification_sent: boolean;
  notification_sent_at?: string | null;
  completed: boolean;
  completed_at?: string | null;
  skipped: boolean;
  skipped_at?: string | null;
  workout_id?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Scheduled Workout Service
 * Handles tracking and managing scheduled workouts from calendar
 */
export const scheduledWorkoutService = {
  /**
   * Creates or updates a scheduled workout from a calendar event
   * @param calendarEvent - Calendar event to track
   */
  async trackCalendarWorkout(calendarEvent: CalendarEvent): Promise<ScheduledWorkout> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const startTime = calendarEvent.start.dateTime || calendarEvent.start.date;
      const endTime = calendarEvent.end.dateTime || calendarEvent.end.date;

      if (!startTime || !endTime) {
        throw new Error('Calendar event must have start and end times');
      }

      // Check if this event is already tracked
      const { data: existing } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('calendar_event_id', calendarEvent.id)
        .maybeSingle();

      if (existing) {
        // Update existing entry
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
          throw new Error('Failed to update scheduled workout');
        }

        return data;
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('scheduled_workouts')
          .insert({
            user_id: currentUser.id,
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
          throw new Error('Failed to create scheduled workout');
        }

        return data;
      }
    } catch (error) {
      console.error('❌ Track calendar workout error:', error);
      throw error;
    }
  },

  /**
   * Gets all scheduled workouts for the current user
   */
  async getScheduledWorkouts(includeCompleted = false): Promise<ScheduledWorkout[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      let query = supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('start_time', { ascending: false });

      if (!includeCompleted) {
        query = query.eq('completed', false).eq('skipped', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to get scheduled workouts:', error);
        throw new Error('Failed to get scheduled workouts');
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get scheduled workouts error:', error);
      throw error;
    }
  },

  /**
   * Marks a scheduled workout as completed
   * @param scheduledWorkoutId - ID of the scheduled workout
   * @param workoutId - Optional ID of the logged workout
   */
  async markAsCompleted(scheduledWorkoutId: string, workoutId?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_workouts')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          workout_id: workoutId || null,
        })
        .eq('id', scheduledWorkoutId);

      if (error) {
        console.error('❌ Failed to mark workout as completed:', error);
        throw new Error('Failed to mark workout as completed');
      }
    } catch (error) {
      console.error('❌ Mark as completed error:', error);
      throw error;
    }
  },

  /**
   * Marks a scheduled workout as skipped
   * @param scheduledWorkoutId - ID of the scheduled workout
   */
  async markAsSkipped(scheduledWorkoutId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_workouts')
        .update({
          skipped: true,
          skipped_at: new Date().toISOString(),
        })
        .eq('id', scheduledWorkoutId);

      if (error) {
        console.error('❌ Failed to mark workout as skipped:', error);
        throw new Error('Failed to mark workout as skipped');
      }
    } catch (error) {
      console.error('❌ Mark as skipped error:', error);
      throw error;
    }
  },

  /**
   * Deletes a scheduled workout
   * @param scheduledWorkoutId - ID of the scheduled workout to delete
   */
  async deleteScheduledWorkout(scheduledWorkoutId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('id', scheduledWorkoutId);

      if (error) {
        console.error('❌ Failed to delete scheduled workout:', error);
        throw new Error('Failed to delete scheduled workout');
      }
    } catch (error) {
      console.error('❌ Delete scheduled workout error:', error);
      throw error;
    }
  },

  /**
   * Gets upcoming workouts (not yet ended)
   */
  async getUpcomingWorkouts(): Promise<ScheduledWorkout[]> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('completed', false)
        .eq('skipped', false)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Failed to get upcoming workouts:', error);
        throw new Error('Failed to get upcoming workouts');
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get upcoming workouts error:', error);
      throw error;
    }
  },
};
