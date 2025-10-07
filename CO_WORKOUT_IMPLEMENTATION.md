# Co-Workout Feature Implementation

## Overview
This document describes the co-workout feature implementation on the Social page, which allows users to invite friends to workout together or challenge them to competitive workouts.

## Current Implementation

### ✅ Implemented Features
- Co-Workout UI with modals for invitations and challenges
- **Notification system integrated** - Recipients receive notifications when invited or challenged
- Friend selection with search functionality
- Toast confirmations for successful actions
- Error handling for failed operations

## Placeholder Features (Not Yet Implemented)

### Frontend Components

#### Social.tsx Updates
- **Location**: `src/pages/Social.tsx`
- **New Section**: Replaced "Invite Others To Workout" section with "Co-Workout" card
- **Features**:
  - Two buttons: "Invite to Co-Workout" and "Challenge to Workout"
  - Modal dialogs for each action
  - Friend selection with searchable dropdown
  - Loading states and empty states
  - Toast notifications on action completion

#### State Management
New state variables added:
```typescript
const [showInviteModal, setShowInviteModal] = useState(false);
const [showChallengeModal, setShowChallengeModal] = useState(false);
const [friends, setFriends] = useState<SearchUser[]>([]);
const [isLoadingFriends, setIsLoadingFriends] = useState(false);
const [selectedFriend, setSelectedFriend] = useState<SearchUser | null>(null);
const [friendSearchQuery, setFriendSearchQuery] = useState("");
```

#### UI Components Used
- `Dialog` - Modal containers
- `Command` - Searchable friend selection dropdown
- `Avatar` - User profile pictures
- `Button` - Action buttons
- Icons: `Calendar` (invite), `Zap` (challenge), `Users` (co-workout)

### Backend Service (Skeleton)

#### coWorkoutService.ts
- **Location**: `src/services/coWorkoutService.ts`
- **Status**: Skeleton implementation with TODO comments
- **Purpose**: Will handle all co-workout and challenge functionality

## Future Implementation Requirements

### Database Tables to Create

#### 1. workout_sessions Table
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  participant_id UUID REFERENCES users(id) NOT NULL,
  workout_type TEXT NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'))
);

-- RLS Policies
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions they're part of
CREATE POLICY "Users can view their workout sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = participant_id);

-- Users can create sessions
CREATE POLICY "Users can create workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Users can update sessions they're part of
CREATE POLICY "Users can update their workout sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = participant_id);
```

#### 2. workout_challenges Table
```sql
CREATE TABLE workout_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES users(id) NOT NULL,
  challenged_id UUID REFERENCES users(id) NOT NULL,
  workout_type TEXT NOT NULL,
  challenge_date TIMESTAMP NOT NULL,
  challenge_metric TEXT NOT NULL,
  challenger_result NUMERIC,
  challenged_result NUMERIC,
  winner_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_metric CHECK (challenge_metric IN ('distance', 'reps', 'time', 'calories', 'weight'))
);

-- RLS Policies
ALTER TABLE workout_challenges ENABLE ROW LEVEL SECURITY;

-- Users can view challenges they're part of
CREATE POLICY "Users can view their workout challenges"
  ON workout_challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Users can create challenges
CREATE POLICY "Users can create workout challenges"
  ON workout_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Users can update challenges they're part of
CREATE POLICY "Users can update their workout challenges"
  ON workout_challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
```

### Service Implementation Steps

#### Phase 1: Basic Invitations
1. Implement `createWorkoutInvitation()` in coWorkoutService.ts
2. Add notification creation for workout invitations
3. Implement `acceptWorkoutInvitation()` and `declineWorkoutInvitation()`
4. Update Social.tsx to call the service instead of showing placeholder toast
5. Add invitation notifications to Profile page

#### Phase 2: Workout Challenges
1. Implement `createWorkoutChallenge()` in coWorkoutService.ts
2. Add notification creation for workout challenges
3. Implement `acceptWorkoutChallenge()` and `declineWorkoutChallenge()`
4. Implement `submitChallengeResult()` with winner determination logic
5. Update Social.tsx to call the service
6. Add challenge notifications to Profile page

#### Phase 3: Session Management
1. Implement `getPendingInvitations()` and `getPendingChallenges()`
2. Implement `getMyWorkoutSessions()` and `getMyChallenges()`
3. Create a dedicated Co-Workout page to view all sessions and challenges
4. Add calendar integration for scheduled workouts
5. Add real-time updates using Supabase subscriptions

#### Phase 4: Workout Tracking Integration
1. Link co-workout sessions to actual workout tracking
2. Track metrics during co-workouts
3. Compare results for challenges
4. Award points/badges for completed challenges
5. Add leaderboard for challenge wins

### Notification Types

#### ✅ workout_invitation (Implemented)
```typescript
{
  type: 'workout_invitation',
  title: 'Workout Invitation',
  message: '{creator_name} invited you to a {workout_type} workout on {date}',
  data: {
    workout_session_id: string,
    creator_id: string,
    scheduled_date: string
  }
}
```

#### ✅ workout_challenge (Implemented)
```typescript
{
  type: 'workout_challenge',
  title: 'Workout Challenge',
  message: '{challenger_name} challenged you to a {workout_type} workout!',
  data: {
    workout_challenge_id: string,
    challenger_id: string,
    challenge_date: string,
    challenge_metric: string
  }
}
```

#### challenge_result
```typescript
{
  type: 'challenge_result',
  title: 'Challenge Completed',
  message: 'Your challenge with {opponent_name} is complete! {result}',
  data: {
    workout_challenge_id: string,
    winner_id: string,
    your_result: number,
    opponent_result: number
  }
}
```

### UI Enhancements to Add

1. **Workout Scheduling Page**
   - Calendar view for scheduled workouts
   - Time picker for workout sessions
   - Workout type selector
   - Location input with map integration

2. **Challenge Setup Page**
   - Workout type selector
   - Metric selector (distance, reps, time, calories)
   - Date picker
   - Challenge rules/description

3. **Active Session View**
   - Real-time workout tracking
   - Live comparison with friend (for challenges)
   - Chat/messaging during workout
   - Completion confirmation

4. **History View**
   - Past co-workouts
   - Challenge results
   - Win/loss record
   - Statistics and trends

## Testing Checklist

### Current Implementation Testing
- [x] Co-Workout card displays on Social page
- [x] Invite button opens modal
- [x] Challenge button opens modal
- [x] Friend list loads correctly
- [x] Friend search works in modals
- [x] Friend selection works
- [x] Toast notifications appear
- [x] Modals close properly
- [x] Notifications are created and sent to recipients
- [x] Notification includes sender's name and type
- [x] Error handling for failed notification creation

### Future Implementation Testing
- [ ] Workout invitation creates database record
- [ ] Notification sent to invited friend
- [ ] Friend can accept/decline invitation
- [ ] Challenge creates database record
- [ ] Notification sent to challenged friend
- [ ] Friend can accept/decline challenge
- [ ] Challenge results can be submitted
- [ ] Winner is determined correctly
- [ ] Completed challenges show in history
- [ ] RLS policies prevent unauthorized access

## Notes

- The current implementation is a fully functional UI placeholder
- All backend logic is commented out in coWorkoutService.ts
- Database tables need to be created before implementing backend
- Consider adding workout reminders/notifications before scheduled time
- May want to add group workouts (3+ people) in the future
- Consider integrating with calendar apps (Google Calendar, Apple Calendar)
- May want to add video call integration for remote co-workouts
