# Quick Start: Workout Completion Notifications

## What This Does

After a scheduled workout ends (based on Google Calendar events), users automatically receive a notification asking: **"Did you complete your workout?"**

They can then:
- ✅ **Log it as completed** - Opens a form to record workout details
- ❌ **Mark it as skipped** - Records that they didn't do it

## Setup Steps

### 1. Run Database Migration

Open Supabase SQL Editor and run:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/scheduled_workouts_schema.sql
```

This creates the `scheduled_workouts` table and necessary functions.

### 2. Set Up Cron Job (Backend)

**Option A: Add to server.js (Recommended)**

Install node-cron:
```bash
npm install node-cron
```

Add to `server.js`:
```javascript
import cron from 'node-cron';

// After app.listen(), add:
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('🔍 Checking for workout completions...');
    const response = await fetch('http://localhost:3001/api/workouts/check-completions', {
      method: 'POST',
    });
    const result = await response.json();
    console.log('✅ Result:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
});
```

**Option B: System Cron (Linux/Mac)**
```bash
crontab -e
# Add this line:
*/10 * * * * curl -X POST http://localhost:3001/api/workouts/check-completions
```

### 3. Track Calendar Workouts

When users create/view workout events in Google Calendar, track them:

**In Social.tsx** (or wherever calendar events are displayed):

```typescript
import { scheduledWorkoutService } from '@/services/scheduledWorkoutService';

// Add a "Track This Workout" button or auto-track workout-related events
const handleTrackWorkout = async (event: CalendarEvent) => {
  try {
    await scheduledWorkoutService.trackCalendarWorkout(event);
    toast({
      title: "Workout Tracked",
      description: "You'll get a reminder after this workout ends!",
    });
  } catch (error) {
    console.error('Failed to track:', error);
  }
};
```

**Auto-track workout events:**
```typescript
// When fetching calendar events, auto-track workout-related ones
const workoutKeywords = ['workout', 'gym', 'exercise', 'training', 'fitness', 'yoga', 'run', 'cycling', 'swimming'];

calendarEvents.forEach(async (event) => {
  const isWorkout = workoutKeywords.some(keyword => 
    event.summary?.toLowerCase().includes(keyword)
  );
  
  if (isWorkout) {
    try {
      await scheduledWorkoutService.trackCalendarWorkout(event);
    } catch (error) {
      console.error('Failed to track workout:', error);
    }
  }
});
```

### 4. Test It

**Manual Test:**

1. Insert a test workout that ended 5 minutes ago:
```sql
INSERT INTO scheduled_workouts (
  user_id,
  calendar_event_id,
  summary,
  start_time,
  end_time,
  notification_sent
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user ID
  'test-workout-123',
  'Test Morning Run',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '5 minutes',
  false
);
```

2. Trigger the notification check:
```bash
curl -X POST http://localhost:3001/api/workouts/check-completions
```

3. Check your Profile page - you should see a notification!

4. Click "Respond" to open the workout completion dialog

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User creates workout event in Google Calendar            │
│    "Morning Run - 7:00 AM to 8:00 AM"                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Event is tracked in scheduled_workouts table             │
│    (automatically or manually)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Workout ends (8:00 AM)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Cron job runs (every 10 minutes)                        │
│    Checks: "Any workouts ended but not notified?"          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Notification sent to user                                │
│    "Did you complete your workout: Morning Run?"            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User opens Profile page, sees notification              │
│    Clicks "Respond"                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Dialog opens with two options:                          │
│    ✅ "Yes, I completed it" → Shows form                   │
│    ❌ "No, I skipped it" → Marks as skipped               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. If completed: User fills form                           │
│    - Workout type (cardio, strength, etc.)                 │
│    - Duration (minutes)                                     │
│    - Satisfaction (1-5)                                     │
│    - Notes (optional)                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Workout logged in workouts table                        │
│    Scheduled workout marked as completed                    │
│    Notification removed                                     │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### New Files:
- ✅ `supabase/migrations/scheduled_workouts_schema.sql` - Database schema
- ✅ `src/services/scheduledWorkoutService.ts` - Frontend service
- ✅ `routes/workoutNotifications.js` - Backend routes
- ✅ `src/components/WorkoutCompletionDialog.tsx` - UI component
- ✅ `WORKOUT_COMPLETION_NOTIFICATION_GUIDE.md` - Full documentation

### Modified Files:
- ✅ `server.js` - Added workout notification routes
- ✅ `src/pages/Profile.tsx` - Added notification handler and dialog

## Troubleshooting

**No notifications appearing?**
1. Check if workout is in database: `SELECT * FROM scheduled_workouts;`
2. Check if cron job is running (look at server logs)
3. Manually trigger: `curl -X POST http://localhost:3001/api/workouts/check-completions`

**Dialog not opening?**
1. Check browser console for errors
2. Verify notification type is exactly: `workout_completion_prompt`
3. Check notification data has required fields

**Cron job not working?**
1. Verify server is running
2. Check server logs for cron execution messages
3. Test endpoint manually with curl

## Next Steps

1. **Integrate with existing calendar UI** - Add tracking when users view/create calendar events
2. **Customize timing** - Adjust cron schedule (currently every 10 minutes)
3. **Add preferences** - Let users choose when to receive notifications
4. **Analytics** - Track completion rates and workout streaks

## Support

See `WORKOUT_COMPLETION_NOTIFICATION_GUIDE.md` for:
- Detailed architecture
- API reference
- Advanced configuration
- Security considerations
- Performance optimization
