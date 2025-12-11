import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { calendarService } from './calendarService';

/**
 * Co-Workout Service
 * Handles workout invitations, challenges, and co-workout sessions
 * 
 * FUTURE IMPLEMENTATION:
 * This service will manage the co-workout functionality including:
 * - Sending workout invitations to friends
 * - Sceduling co-workouts or challenge workouts
 */

/**
 * Workout session status types
 */
export type WorkoutSessionStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Workout challenge status types
 */
export type WorkoutChallengeStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Workout session data structure
 * 
 * TODO: Create workout_sessions table in Supabase with these fields:
 * - id: uuid (primary key)
 * - creator_id: uuid (references users.id)
 * - participant_id: uuid (references users.id)
 * - workout_type: text (e.g., 'cardio', 'strength', 'yoga', 'custom')
 * - scheduled_date: timestamp
 * - duration_minutes: integer
 * - location: text (optional)
 * - notes: text (optional)
 * - status: workout_session_status enum
 * - created_at: timestamp
 * - updated_at: timestamp
 */
export type WorkoutSession = {
  id: string;
  creator_id: string;
  participant_id: string;
  workout_type: string;
  scheduled_date: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  status: WorkoutSessionStatus;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
  participant?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
};

/**
 * Workout challenge data structure
 * 
 * TODO: Create workout_challenges table in Supabase with these fields:
 * - id: uuid (primary key)
 * - challenger_id: uuid (references users.id)
 * - challenged_id: uuid (references users.id)
 * - workout_type: text
 * - challenge_date: timestamp
 * - challenge_metric: text (e.g., 'distance', 'reps', 'time', 'calories')
 * - challenger_result: numeric (optional)
 * - challenged_result: numeric (optional)
 * - status: workout_challenge_status enum
 * - created_at: timestamp
 * - updated_at: timestamp
 */
export type WorkoutChallenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  workout_type: string;
  challenge_date: string;
  challenge_metric: string;
  challenger_result?: number;
  challenged_result?: number;
  status: WorkoutChallengeStatus;
  created_at: string;
  updated_at: string;
  challenger?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
  challenged?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
};

export const coWorkoutService = {
  /**
   * Creates a workout invitation
   * @param participantId - ID of the friend to invite
   * @param workoutType - Type of workout
   * @param scheduledDate - Date and time of the workout
   * @param options - Optional workout details
   * @returns The created workout session
   * 
   * TODO: Implement this function
   * 1. Get current user
   * 2. Validate participant is a friend
   * 3. Create workout_sessions record
   * 4. Send notification to participant
   * 5. Return the created session
   */
  async createWorkoutInvitation(
    participantId: string,
    workoutType: string,
    scheduledDate: Date,
    options?: {
      duration_minutes?: number;
      location?: string;
      notes?: string;
    }
  ): Promise<WorkoutSession> {
    throw new Error('Not implemented yet');
    
    // const { data: { user: currentUser } } = await supabase.auth.getUser();
    // if (!currentUser) throw new Error('User not authenticated');
    
    // const { data, error } = await supabase
    //   .from('workout_sessions')
    //   .insert({
    //     creator_id: currentUser.id,
    //     participant_id: participantId,
    //     workout_type: workoutType,
    //     scheduled_date: scheduledDate.toISOString(),
    //     duration_minutes: options?.duration_minutes,
    //     location: options?.location,
    //     notes: options?.notes,
    //     status: 'pending'
    //   })
    //   .select()
    //   .single();
    
    // if (error) throw error;
    
    // // Create notification
    // await supabase.from('notifications').insert({
    //   user_id: participantId,
    //   type: 'workout_invitation',
    //   title: 'Workout Invitation',
    //   message: `You've been invited to a ${workoutType} workout!`,
    //   data: { workout_session_id: data.id }
    // });
    
    // return data;
  },

  /**
   * Creates a workout challenge
   * @param challengedId - ID of the friend to challenge
   * @param workoutForm - Form of workout (cardio, strength, etc.)
   * @param timeOption - 'set' or 'flexible'
   * @param options - Optional challenge details
   * @returns The created workout challenge
   */
  async createWorkoutChallenge(
    challengedId: string,
    workoutForm: string,
    timeOption: 'set' | 'flexible',
    options?: {
      workoutTime?: string;
      workoutDuration?: number;
      workoutNote?: string;
    }
  ): Promise<WorkoutChallenge> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('workout_challenges')
      .insert({
        challenger_id: currentUser.id,
        challenged_id: challengedId,
        workout_type: workoutForm,
        workout_form: workoutForm,
        time_option: timeOption,
        scheduled_time: options?.workoutTime || null,
        workout_duration: options?.workoutDuration || null,
        workout_note: options?.workoutNote || null,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Accepts a workout invitation and adds it to Google Calendar
   * @param invitationData - Invitation details from notification
   * @param scheduledTime - When the workout is scheduled (ISO 8601)
   * @param duration - Duration in minutes
   * @returns The calendar event ID
   */
  async acceptWorkoutInvitation(
    invitationData: {
      inviter_id: string;
      inviter_name: string;
      workout_type: string;
      workout_place?: string;
      workout_note?: string;
    },
    scheduledTime: string,
    duration: number
  ): Promise<string> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Calculate end time
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event
    const calendarEvent = await calendarService.createEvent({
      userId: currentUser.id,
      summary: `Workout with ${invitationData.inviter_name}: ${invitationData.workout_type}`,
      description: invitationData.workout_note || `Co-workout session with ${invitationData.inviter_name}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: invitationData.workout_place,
    });

    // Send notification to inviter
    await notificationService.createNotification({
      user_id: invitationData.inviter_id,
      type: 'workout_invitation_accepted',
      title: 'Invitation Accepted!',
      message: `${currentUser.user_metadata?.first_name || 'Someone'} accepted your ${invitationData.workout_type} workout invitation!`,
      read: false,
      data: {
        accepted_by_id: currentUser.id,
        scheduled_time: scheduledTime,
        workout_type: invitationData.workout_type,
      },
    });

    return calendarEvent.id;
  },

  /**
   * Declines a workout invitation
   * @param sessionId - ID of the workout session to decline
   * 
   * TODO: Implement this function
   */
  async declineWorkoutInvitation(sessionId: string): Promise<void> {
    throw new Error('Not implemented yet');
    
    // await supabase
    //   .from('workout_sessions')
    //   .update({ status: 'declined', updated_at: new Date().toISOString() })
    //   .eq('id', sessionId);
  },

  /**
   * Accepts a workout challenge and adds it to Google Calendar
   * @param challengeId - ID of the workout challenge to accept
   * @param scheduledTime - When the workout is scheduled (ISO 8601)
   * @param duration - Duration in minutes
   * @returns The calendar event ID
   */
  async acceptWorkoutChallenge(
    challengeId: string,
    scheduledTime: string,
    duration: number
  ): Promise<string> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Get challenge details
    const { data: challenge, error: fetchError } = await supabase
      .from('workout_challenges')
      .select(`
        *,
        challenger:users!challenger_id(id, first_name, last_name, username)
      `)
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      throw new Error('Challenge not found');
    }

    // Verify user is the challenged person
    if (challenge.challenged_id !== currentUser.id) {
      throw new Error('You are not authorized to accept this challenge');
    }

    // Calculate end time
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event
    const calendarEvent = await calendarService.createEvent({
      userId: currentUser.id,
      summary: `Workout Challenge: ${challenge.workout_form || challenge.workout_type}`,
      description: `Challenge from ${challenge.challenger.first_name} ${challenge.challenger.last_name}\n\n${challenge.workout_note || ''}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: challenge.location,
    });

    // Update challenge status
    const { error: updateError } = await supabase
      .from('workout_challenges')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        scheduled_time: scheduledTime,
        workout_duration: duration,
        calendar_event_id: calendarEvent.id,
      })
      .eq('id', challengeId);

    if (updateError) {
      // Try to clean up calendar event if database update fails
      try {
        await calendarService.deleteEvent(currentUser.id, calendarEvent.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup calendar event:', cleanupError);
      }
      throw new Error('Failed to accept challenge');
    }

    // Send notification to challenger
    await notificationService.createNotification({
      user_id: challenge.challenger_id,
      type: 'workout_challenge_accepted',
      title: 'Challenge Accepted!',
      message: `${currentUser.user_metadata?.first_name || 'Someone'} accepted your ${challenge.workout_form || challenge.workout_type} challenge!`,
      read: false,
      data: {
        challenge_id: challengeId,
        accepted_by_id: currentUser.id,
        scheduled_time: scheduledTime,
      },
    });

    return calendarEvent.id;
  },

  /**
   * Declines a workout challenge
   * @param challengeId - ID of the workout challenge to decline
   * 
   * TODO: Implement this function
   */
  async declineWorkoutChallenge(challengeId: string): Promise<void> {
    throw new Error('Not implemented yet');
    
    // await supabase
    //   .from('workout_challenges')
    //   .update({ status: 'declined', updated_at: new Date().toISOString() })
    //   .eq('id', challengeId);
  },

  /**
   * Submits workout results for a challenge
   * @param challengeId - ID of the workout challenge
   * @param result - The user's result for the challenge metric
   * 
   * TODO: Implement this function
   * 1. Get current user
   * 2. Determine if user is challenger or challenged
   * 3. Update appropriate result field
   * 4. If both results are submitted, determine winner
   * 5. Update challenge status to completed
   * 6. Send notification to both users
   */
  async submitChallengeResult(challengeId: string, result: number): Promise<void> {
    throw new Error('Not implemented yet');
    
    // const { data: { user: currentUser } } = await supabase.auth.getUser();
    // if (!currentUser) throw new Error('User not authenticated');
    
    // // Get challenge
    // const { data: challenge } = await supabase
    //   .from('workout_challenges')
    //   .select('*')
    //   .eq('id', challengeId)
    //   .single();
    
    // // Update result based on user role
    // const isChallenger = challenge.challenger_id === currentUser.id;
    // const updateField = isChallenger ? 'challenger_result' : 'challenged_result';
    
    // await supabase
    //   .from('workout_challenges')
    //   .update({ [updateField]: result })
    //   .eq('id', challengeId);
    
    // // Check if both results are in and determine winner
    // // Update status and winner_id accordingly
  },

  /**
   * Gets pending workout invitations for the current user
   * @returns Array of pending workout sessions
   * 
   * TODO: Implement this function
   */
  async getPendingInvitations(): Promise<WorkoutSession[]> {
    throw new Error('Not implemented yet');
    
    // const { data: { user: currentUser } } = await supabase.auth.getUser();
    // if (!currentUser) return [];
    
    // const { data } = await supabase
    //   .from('workout_sessions')
    //   .select(`
    //     *,
    //     creator:users!creator_id(id, first_name, last_name, username)
    //   `)
    //   .eq('participant_id', currentUser.id)
    //   .eq('status', 'pending')
    //   .order('scheduled_date', { ascending: true });
    
    // return data || [];
  },

  /**
   * Gets pending workout challenges for the current user
   * @returns Array of pending workout challenges
   * 
   * TODO: Implement this function
   */
  async getPendingChallenges(): Promise<WorkoutChallenge[]> {
    throw new Error('Not implemented yet');
    
    // const { data: { user: currentUser } } = await supabase.auth.getUser();
    // if (!currentUser) return [];
    
    // const { data } = await supabase
    //   .from('workout_challenges')
    //   .select(`
    //     *,
    //     challenger:users!challenger_id(id, first_name, last_name, username)
    //   `)
    //   .eq('challenged_id', currentUser.id)
    //   .eq('status', 'pending')
    //   .order('challenge_date', { ascending: true });
    
    // return data || [];
  },

  /**
   * Gets all workout sessions for the current user
   * @returns Array of workout sessions
   * 
   * TODO: Implement this function
   */
  async getMyWorkoutSessions(): Promise<WorkoutSession[]> {
    throw new Error('Not implemented yet');
  },

  /**
   * Gets all workout challenges for the current user
   * @returns Array of workout challenges
   * 
   * TODO: Implement this function
   */
  async getMyChallenges(): Promise<WorkoutChallenge[]> {
    throw new Error('Not implemented yet');
  }
};
