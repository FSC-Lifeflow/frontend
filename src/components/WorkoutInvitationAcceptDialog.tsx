import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertTriangle, CheckCircle, X, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { calendarService, CalendarEventConflict } from '@/services/calendarService';
import { useAuth } from '@/contexts/AuthContext';

interface WorkoutInvitationAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitationData: {
    inviter_name: string;
    workout_type: string;
    workout_time: string;
    workout_duration: number;
    workout_place?: string;
    workout_note?: string;
  };
  onAccept: (scheduledTime: string, duration: number) => Promise<void>;
}

type DialogStep = 'time-selection' | 'conflict-check' | 'confirm';

export function WorkoutInvitationAcceptDialog({
  open,
  onOpenChange,
  invitationData,
  onAccept,
}: WorkoutInvitationAcceptDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<DialogStep>('time-selection');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [conflicts, setConflicts] = useState<CalendarEventConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with invitation time
  useEffect(() => {
    if (open && invitationData.workout_time) {
      const inviteDate = new Date(invitationData.workout_time);
      const dateStr = inviteDate.toISOString().split('T')[0];
      const timeStr = inviteDate.toTimeString().slice(0, 5);
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
      setDuration(invitationData.workout_duration || 60);
      setStep('time-selection');
      setConflicts([]);
      setError(null);
    }
  }, [open, invitationData]);

  // Check for conflicts when moving to conflict-check step or when time/date changes
  useEffect(() => {
    if (step === 'conflict-check' && selectedDate && selectedTime && user?.id) {
      checkForConflicts();
    }
  }, [step, selectedDate, selectedTime, duration]);

  const checkForConflicts = async () => {
    if (!user?.id || !selectedDate || !selectedTime) return;

    setIsCheckingConflicts(true);
    setError(null);

    try {
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const foundConflicts = await calendarService.checkConflicts(
        user.id,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      setConflicts(foundConflicts);
    } catch (err) {
      console.error('Error checking conflicts:', err);
      setError(err instanceof Error ? err.message : 'Failed to check calendar conflicts');
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleNext = () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }

    setError(null);
    setStep('conflict-check');
  };

  const handleBack = () => {
    setError(null);
    if (step === 'conflict-check') {
      setStep('time-selection');
    } else if (step === 'confirm') {
      setStep('conflict-check');
    }
  };

  const handleProceedWithConflicts = () => {
    setStep('confirm');
  };

  const handleAccept = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsAccepting(true);
    setError(null);

    try {
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const scheduledTime = startDateTime.toISOString();

      await onAccept(scheduledTime, duration);
      onOpenChange(false);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = () => {
    setStep('time-selection');
    setConflicts([]);
    setError(null);
    onOpenChange(false);
  };

  const formatConflictTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'time-selection' && 'Accept Workout Invitation'}
            {step === 'conflict-check' && 'Check Calendar Conflicts'}
            {step === 'confirm' && 'Confirm Workout'}
          </DialogTitle>
          <DialogDescription>
            {step === 'time-selection' && `${invitationData.inviter_name} invited you to a ${invitationData.workout_type} workout`}
            {step === 'conflict-check' && 'Checking your calendar for conflicts...'}
            {step === 'confirm' && 'Review and confirm your workout details'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Time Selection */}
        {step === 'time-selection' && (
          <div className="space-y-4 py-4">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                The suggested time is pre-filled below. You can adjust it if needed.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min={15}
                max={300}
                step={15}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                We'll check your Google Calendar for conflicts before scheduling this workout.
              </AlertDescription>
            </Alert>

            {invitationData.workout_place && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{invitationData.workout_place}</span>
                </div>
              </div>
            )}

            {invitationData.workout_note && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Note from {invitationData.inviter_name}:</p>
                <p className="text-sm text-muted-foreground">{invitationData.workout_note}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Conflict Check */}
        {step === 'conflict-check' && (
          <div className="space-y-4 py-4">
            {isCheckingConflicts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Checking your calendar...</span>
              </div>
            ) : conflicts.length > 0 ? (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You have {conflicts.length} conflicting event{conflicts.length > 1 ? 's' : ''} at this time
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="p-3 border border-destructive/50 rounded-md bg-destructive/5"
                    >
                      <p className="font-medium text-sm">{conflict.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatConflictTime(conflict.start)} - {formatConflictTime(conflict.end)}
                      </p>
                      {conflict.location && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {conflict.location}</p>
                      )}
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertDescription>
                    You can either go back to choose a different time, or proceed to override these events.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  No conflicts found! Your calendar is free at this time.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to add this workout to your calendar
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {selectedTime} ({duration} minutes)
                </span>
              </div>
              {invitationData.workout_place && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{invitationData.workout_place}</span>
                </div>
              )}
            </div>

            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This will override {conflicts.length} existing event{conflicts.length > 1 ? 's' : ''}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'time-selection' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next: Check Conflicts
              </Button>
            </>
          )}

          {step === 'conflict-check' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isCheckingConflicts}>
                Back
              </Button>
              <Button
                onClick={conflicts.length > 0 ? handleProceedWithConflicts : () => setStep('confirm')}
                disabled={isCheckingConflicts}
              >
                {conflicts.length > 0 ? 'Proceed Anyway' : 'Continue'}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isAccepting}>
                Back
              </Button>
              <Button onClick={handleAccept} disabled={isAccepting}>
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
