import { API_BASE_URL } from '../lib/config';
import { CalendarEvent } from '@/hooks/useGoogleCalendar';

const BACKEND_URL = API_BASE_URL;

export interface CalendarEventConflict {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export interface CreateEventParams {
  userId: string;
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  location?: string;
}

/**
 * Calendar Service
 * Handles Google Calendar operations including creating events and checking for conflicts
 */
export const calendarService = {
  /**
   * Creates a new event in the user's Google Calendar
   * @param params - Event creation parameters
   * @returns The created calendar event
   */
  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/google/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          summary: params.summary,
          description: params.description,
          start: {
            dateTime: params.startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: params.endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          location: params.location,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create event' }));
        throw new Error(error.message || 'Failed to create calendar event');
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Create calendar event error:', error);
      throw error;
    }
  },

  /**
   * Checks for conflicting events in the user's calendar for a given time range
   * @param userId - User ID
   * @param startTime - Start time to check (ISO 8601)
   * @param endTime - End time to check (ISO 8601)
   * @returns Array of conflicting events
   */
  async checkConflicts(
    userId: string,
    startTime: string,
    endTime: string
  ): Promise<CalendarEventConflict[]> {
    try {
      const params = new URLSearchParams({
        userId,
        timeMin: startTime,
        timeMax: endTime,
      });

      const response = await fetch(`${BACKEND_URL}/api/google/calendar/events?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated with Google Calendar');
        }
        throw new Error('Failed to check calendar conflicts');
      }

      const data = await response.json();
      const events = data.items || [];

      // Filter events that overlap with the requested time range
      // Two time ranges overlap if: start1 < end2 AND start2 < end1
      const conflicts: CalendarEventConflict[] = events
        .filter((event: any) => {
          const eventStart = event.start.dateTime || event.start.date;
          const eventEnd = event.end.dateTime || event.end.date;
          
          // Convert to timestamps for accurate comparison
          const eventStartTime = new Date(eventStart).getTime();
          const eventEndTime = new Date(eventEnd).getTime();
          const rangeStartTime = new Date(startTime).getTime();
          const rangeEndTime = new Date(endTime).getTime();
          
          // Check if events overlap using the standard interval overlap formula
          // Two intervals [a,b] and [c,d] overlap if: a < d AND c < b
          const overlaps = eventStartTime < rangeEndTime && rangeStartTime < eventEndTime;
          
          return overlaps;
        })
        .map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No title',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          location: event.location,
        }));

      return conflicts;
    } catch (error) {
      console.error('Check calendar conflicts error:', error);
      throw error;
    }
  },

  /**
   * Deletes an event from the user's Google Calendar
   * @param userId - User ID
   * @param eventId - Calendar event ID to delete
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/google/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete event' }));
        throw new Error(error.message || 'Failed to delete calendar event');
      }
    } catch (error) {
      console.error('Delete calendar event error:', error);
      throw error;
    }
  },

  /**
   * Updates an existing event in the user's Google Calendar
   * @param userId - User ID
   * @param eventId - Calendar event ID to update
   * @param params - Event update parameters
   */
  async updateEvent(
    userId: string,
    eventId: string,
    params: Partial<CreateEventParams>
  ): Promise<CalendarEvent> {
    try {
      const updateData: any = {
        userId,
      };

      if (params.summary) updateData.summary = params.summary;
      if (params.description) updateData.description = params.description;
      if (params.location) updateData.location = params.location;
      
      if (params.startTime) {
        updateData.start = {
          dateTime: params.startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      
      if (params.endTime) {
        updateData.end = {
          dateTime: params.endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      const response = await fetch(`${BACKEND_URL}/api/google/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update event' }));
        throw new Error(error.message || 'Failed to update calendar event');
      }

      const data = await response.json();
      return data.event;
    } catch (error) {
      console.error('Update calendar event error:', error);
      throw error;
    }
  },
};
