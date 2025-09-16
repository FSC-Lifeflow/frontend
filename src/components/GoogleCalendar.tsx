import { useGoogleCalendar, CalendarEvent } from "@/hooks/useGoogleCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  MapPin,
  Users,
  AlertCircle
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

interface GoogleCalendarProps {
  className?: string;
}

export function GoogleCalendar({ className }: GoogleCalendarProps) {
  const { 
    isAuthenticated, 
    events, 
    isLoading, 
    error, 
    authenticate, 
    signOut, 
    refreshEvents 
  } = useGoogleCalendar();

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const startDate = parseISO(event.start.dateTime);
      const endDate = parseISO(event.end.dateTime!);
      
      let datePrefix = "";
      if (isToday(startDate)) {
        datePrefix = "Today ";
      } else if (isTomorrow(startDate)) {
        datePrefix = "Tomorrow ";
      } else {
        datePrefix = format(startDate, "MMM d ");
      }
      
      return `${datePrefix}${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
    } else if (event.start.date) {
      const date = parseISO(event.start.date);
      if (isToday(date)) {
        return "Today (All day)";
      } else if (isTomorrow(date)) {
        return "Tomorrow (All day)";
      } else {
        return `${format(date, "MMM d")} (All day)`;
      }
    }
    return "No time specified";
  };

  const getEventTypeColor = (summary: string) => {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('workout') || lowerSummary.includes('gym') || lowerSummary.includes('exercise')) {
      return "bg-primary/10 text-primary";
    } else if (lowerSummary.includes('meeting') || lowerSummary.includes('call')) {
      return "bg-blue-100 text-blue-700";
    } else if (lowerSummary.includes('yoga') || lowerSummary.includes('meditation')) {
      return "bg-green-100 text-green-700";
    }
    return "bg-muted text-muted-foreground";
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-muted/30 rounded-lg p-6 text-center ${className}`}>
        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-semibold mb-2">Google Calendar Integration</h3>
        <p className="text-muted-foreground mb-4">
          View all your events, meetings, and AI-scheduled workouts in one place
        </p>
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <Button 
          variant="wellness" 
          onClick={authenticate}
          disabled={isLoading}
        >
          {isLoading ? "Connecting..." : "Connect Google Calendar"}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Your Calendar</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Connected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshEvents}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {isLoading && events.length === 0 ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No upcoming events in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{event.summary}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getEventTypeColor(event.summary)}`}
                    >
                      {event.summary.toLowerCase().includes('workout') ? 'Workout' : 
                       event.summary.toLowerCase().includes('meeting') ? 'Meeting' : 
                       event.summary.toLowerCase().includes('yoga') ? 'Wellness' : 'Event'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatEventTime(event)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                      </div>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{event.attendees.length} attendees</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {events.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View all {events.length} events in Google Calendar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
