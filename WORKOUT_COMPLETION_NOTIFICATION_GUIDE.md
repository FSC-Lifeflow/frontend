# Workout Completion Notification System

## Overview

This system automatically sends notifications to users after their scheduled workouts end, prompting them to confirm whether they completed the workout or not. It integrates with Google Calendar to track workout events and provides a seamless way to log completed workouts.

## Architecture

### 1. Database Layer

**Table: `scheduled_workouts`**
- Tracks calendar workout events
- Stores workout details (event_id, user_id, start_time, end_time, summary, etc.)
- Maintains completion/skip status
- Links to logged workouts when completed

**Key Fields:**
- `calendar_event_id`: Unique identifier from Google Calendar
- `notification_sent`: Boolean flag to track if completion notification was sent
- `completed`: Boolean flag indicating if workout was completed
- `skipped`: Boolean flag indicating if workout was skipped
- `workout_id`: Foreign key to `workouts` table when logged

**Database Function:**
- `get_workouts_needing_notification()`: Returns workouts that have ended but haven't received completion notifications

### 2. Backend Service

**File: `routes/workoutNotifications.js`**

**Endpoints:**

1. **POST `/api/workouts/check-completions`**
   - Checks for workouts that need completion notifications
   - Should be called periodically by a cron job (every 5-15 minutes)
   - Sends notifications to users for completed workouts
   - Marks notifications as sent in database

2. **POST `/api/workouts/track-calendar-event`**
   - Tracks a calendar event as a scheduled workout
   - Creates or updates scheduled workout entries
   - Used when users create/update calendar events

### 3. Frontend Services

**File: `src/services/scheduledWorkoutService.ts`**

**Key Methods:**
- `trackCalendarWorkout(calendarEvent)`: Creates/updates scheduled workout from calendar event
- `getScheduledWorkouts()`: Retrieves user's scheduled workouts
- `markAsCompleted(id, workoutId)`: Marks workout as completed
- `markAsSkipped(id)`: Marks workout as skipped
- `getUpcomingWorkouts()`: Gets workouts that haven't ended yet

### 4. UI Components

**File: `src/components/WorkoutCompletionDialog.tsx`**

A modal dialog that:
- Displays workout details (summary, time, location, duration)
- Provides two options: "Yes, I completed it" or "No, I skipped it"
- Shows a form to log workout details when completed
- Integrates with `workoutService` to log completed workouts

**Form Fields:**
- Workout Type (dropdown)
- Duration (minutes)
- Satisfaction (1-5 slider)
- Notes (optional textarea)

## User Flow

### 1. Tracking Workouts

When a user creates a workout event in Google Calendar:
```javascript
// In Social.tsx or wherever calendar events are managed
import { scheduledWorkoutService } from '@/services/scheduledWorkoutService';

// After user selects a calendar event
await scheduledWorkoutService.trackCalendarWorkout(calendarEvent);
```

### 2. Automatic Notification (Backend)

A cron job calls the backend endpoint periodically:
```bash
# Example cron job (every 10 minutes)
*/10 * * * * curl -X POST http://localhost:3001/api/workouts/check-completions
```

The backend:
1. Queries for workouts that have ended
2. Creates notifications for each workout
3. Marks notifications as sent

### 3. User Receives Notification

The notification appears in the Profile page with:
- Type: `workout_completion_prompt`
- Title: "Workout Complete?"
- Message: "Did you complete your workout: [workout name]?"
- Data: Contains all workout details

### 4. User Responds

When user clicks "Respond" button:
1. `WorkoutCompletionDialog` opens
2. User sees workout details
3. User chooses:
   - **"Yes, I completed it"**: Shows form to log details
   - **"No, I skipped it"**: Marks as skipped immediately

### 5. Logging Completed Workout

If user completed the workout:
1. Form appears with pre-filled duration from calendar
2. User fills in workout type, satisfaction, and notes
3. On submit:
   - Creates entry in `workouts` table
   - Marks scheduled workout as completed
   - Links workout entry to scheduled workout
   - Removes notification

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration to create the `scheduled_workouts` table:

```bash
# In Supabase SQL Editor or via migration
cat supabase/migrations/scheduled_workouts_schema.sql | psql $DATABASE_URL
```

Or run directly in Supabase Dashboard → SQL Editor.

### 2. Configure Backend Cron Job

**Option A: Using System Cron (Linux/Mac)**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 10 minutes)
*/10 * * * * curl -X POST http://localhost:3001/api/workouts/check-completions
```

**Option B: Using Node-Cron (Recommended)**

Add to `server.js`:
```javascript
import cron from 'node-cron';

// Check for workout completions every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🔍 Checking for workout completions...');
    const response = await fetch('http://localhost:3001/api/workouts/check-completions', {
      method: 'POST',
    });
    const result = await response.json();
    console.log('✅ Workout completion check result:', result);
  } catch (error) {
    console.error('❌ Error checking workout completions:', error);
  }
});
```

Install node-cron:
```bash
npm install node-cron
```

**Option C: Using External Cron Service**
- Use services like cron-job.org or EasyCron
- Set up HTTP request to your backend endpoint
- Schedule every 10-15 minutes

### 3. Integrate with Calendar Events

When users interact with calendar events (e.g., in Social.tsx), track them:

```typescript
// Example: After user creates/selects a workout event
const handleTrackWorkout = async (calendarEvent: CalendarEvent) => {
  try {
    await scheduledWorkoutService.trackCalendarWorkout(calendarEvent);
    toast({
      title: "Workout Tracked",
      description: "You'll receive a notification after this workout ends.",
    });
  } catch (error) {
    console.error('Failed to track workout:', error);
  }
};
```

## Notification Data Structure

```typescript
{
  type: 'workout_completion_prompt',
  title: 'Workout Complete?',
  message: 'Did you complete your workout: Morning Run?',
  data: {
    scheduled_workout_id: 'uuid',
    calendar_event_id: 'google-calendar-event-id',
    workout_summary: 'Morning Run',
    workout_description: 'Easy 5k run',
    workout_start: '2024-01-15T07:00:00Z',
    workout_end: '2024-01-15T07:45:00Z',
    workout_location: 'Central Park'
  },
  read: false
}
```

## Testing

### Manual Testing

1. **Create a test workout:**
```sql
-- Insert a workout that ended 5 minutes ago
INSERT INTO scheduled_workouts (
  user_id,
  calendar_event_id,
  summary,
  start_time,
  end_time,
  notification_sent
) VALUES (
  'your-user-id',
  'test-event-123',
  'Test Workout',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '5 minutes',
  false
);
```

2. **Trigger notification check:**
```bash
curl -X POST http://localhost:3001/api/workouts/check-completions
```

3. **Check Profile page** for the notification

### Automated Testing

```typescript
// Test scheduled workout service
describe('scheduledWorkoutService', () => {
  it('should track calendar workout', async () => {
    const event = {
      id: 'test-123',
      summary: 'Test Workout',
      start: { dateTime: '2024-01-15T07:00:00Z' },
      end: { dateTime: '2024-01-15T08:00:00Z' }
    };
    
    const result = await scheduledWorkoutService.trackCalendarWorkout(event);
    expect(result.calendar_event_id).toBe('test-123');
  });
});
```

## Troubleshooting

### Notifications Not Appearing

1. **Check if workout is tracked:**
```sql
SELECT * FROM scheduled_workouts WHERE user_id = 'your-user-id';
```

2. **Check if notification was sent:**
```sql
SELECT * FROM scheduled_workouts 
WHERE notification_sent = true 
ORDER BY notification_sent_at DESC;
```

3. **Check notifications table:**
```sql
SELECT * FROM notifications 
WHERE type = 'workout_completion_prompt' 
ORDER BY created_at DESC;
```

### Cron Job Not Running

1. Check server logs for cron execution
2. Verify endpoint is accessible
3. Test endpoint manually with curl
4. Check cron job syntax

### Dialog Not Opening

1. Check browser console for errors
2. Verify notification data structure
3. Ensure WorkoutCompletionDialog is imported correctly
4. Check if notification type matches exactly: `workout_completion_prompt`

## Future Enhancements

1. **Smart Timing**: Send notifications based on user preferences (immediate, 1 hour after, etc.)
2. **Reminders**: Send reminder if user doesn't respond within 24 hours
3. **Streaks**: Track workout completion streaks
4. **Analytics**: Show completion rate statistics
5. **Bulk Actions**: Allow marking multiple workouts as completed/skipped
6. **Integration**: Auto-log workouts from fitness trackers (Fitbit, Apple Watch)
7. **Recurring Workouts**: Handle recurring calendar events intelligently

## API Reference

### Backend Endpoints

#### Check Completions
```
POST /api/workouts/check-completions
Response: {
  success: boolean,
  count: number,
  successful: number,
  failed: number,
  results: Array<{
    success: boolean,
    workoutId: string,
    summary: string
  }>
}
```

#### Track Calendar Event
```
POST /api/workouts/track-calendar-event
Body: {
  userId: string,
  calendarEvent: CalendarEvent
}
Response: {
  success: boolean,
  data: ScheduledWorkout,
  created?: boolean,
  updated?: boolean
}
```

### Frontend Service Methods

```typescript
// Track a calendar workout
scheduledWorkoutService.trackCalendarWorkout(calendarEvent: CalendarEvent): Promise<ScheduledWorkout>

// Get scheduled workouts
scheduledWorkoutService.getScheduledWorkouts(includeCompleted?: boolean): Promise<ScheduledWorkout[]>

// Mark as completed
scheduledWorkoutService.markAsCompleted(id: string, workoutId?: string): Promise<void>

// Mark as skipped
scheduledWorkoutService.markAsSkipped(id: string): Promise<void>

// Get upcoming workouts
scheduledWorkoutService.getUpcomingWorkouts(): Promise<ScheduledWorkout[]>
```

## Security Considerations

1. **RLS Policies**: Ensure users can only access their own scheduled workouts
2. **Validation**: Backend validates all workout data before creating notifications
3. **Rate Limiting**: Consider rate limiting the check-completions endpoint
4. **Authentication**: Ensure all endpoints require proper authentication

## Performance Optimization

1. **Indexing**: Database indexes on `end_time` and `notification_sent` for fast queries
2. **Batch Processing**: Process multiple workouts in parallel
3. **Caching**: Cache frequently accessed workout data
4. **Pagination**: Implement pagination for large workout lists

## Conclusion

This system provides a seamless way to track workout completion and maintain accurate workout logs. It leverages existing calendar infrastructure and provides a user-friendly interface for logging workout details.
