import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, AlertCircle } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

export function UpNextWorkouts() {
  const { isAuthenticated, events, isLoading } = useGoogleCalendar();

  // Filter events to find workout-related events
  const isWorkoutEvent = (event: CalendarEvent): boolean => {
    const summary = event.summary.toLowerCase();
    const description = event.description?.toLowerCase() || '';
    
    const workoutKeywords = [
      'workout', 'gym', 'exercise', 'fitness', 'training',
      'yoga', 'pilates', 'cardio', 'strength', 'run', 'running',
      'cycling', 'swim', 'swimming', 'hiit', 'crossfit',
      'weightlifting', 'aerobics', 'zumba', 'dance', 'boxing',
      'martial arts', 'tennis', 'basketball', 'soccer', 'football'
    ];
    
    return workoutKeywords.some(keyword => 
      summary.includes(keyword) || description.includes(keyword)
    );
  };

  // Get next 2 workout events
  const upcomingWorkouts = events
    .filter(isWorkoutEvent)
    .slice(0, 2);

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.start.dateTime) {
      const startDate = parseISO(event.start.dateTime);
      
      if (isToday(startDate)) {
        return `Today ${format(startDate, "h:mm a")}`;
      } else if (isTomorrow(startDate)) {
        return `Tomorrow ${format(startDate, "h:mm a")}`;
      } else {
        return format(startDate, "MMM d, h:mm a");
      }
    } else if (event.start.date) {
      const date = parseISO(event.start.date);
      if (isToday(date)) {
        return "Today (All day)";
      } else if (isTomorrow(date)) {
        return "Tomorrow (All day)";
      } else {
        return format(date, "MMM d '(All day)'");
      }
    }
    return "No time specified";
  };

  const calculateDuration = (event: CalendarEvent): string => {
    if (event.start.dateTime && event.end.dateTime) {
      const start = parseISO(event.start.dateTime);
      const end = parseISO(event.end.dateTime);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      if (durationMinutes < 60) {
        return `${durationMinutes} min`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
    }
    return "";
  };

  // Show "not connected" message if user hasn't connected their calendar
  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Connect your Google Calendar to see upcoming workouts
        </p>
        <Button 
          variant="zen" 
          size="sm"
          onClick={() => window.location.href = '/settings'}
        >
          Connect Calendar
        </Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading && events.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Heart className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading workouts...</p>
      </div>
    );
  }

  // Show message if no workout events found
  if (upcomingWorkouts.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Heart className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          No upcoming workouts scheduled
        </p>
        <p className="text-xs text-muted-foreground">
          Add workout events to your Google Calendar
        </p>
      </div>
    );
  }

  // Display the next 2 workout events
  return (
    <div className="space-y-3">
      {upcomingWorkouts.map((workout) => {
        const duration = calculateDuration(workout);
        
        return (
          <div 
            key={workout.id} 
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{workout.summary}</p>
              <p className="text-xs text-muted-foreground">
                {formatEventTime(workout)}
                {duration && ` • ${duration}`}
              </p>
            </div>
          </div>
        );
      })}
      
      <Button 
        variant="zen" 
        className="w-full mt-4"
        onClick={() => window.open('https://calendar.google.com', '_blank')}
      >
        View Full Schedule
      </Button>
    </div>
  );
}
