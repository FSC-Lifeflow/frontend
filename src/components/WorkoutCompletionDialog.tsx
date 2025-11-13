import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, XCircle, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { scheduledWorkoutService } from '@/services/scheduledWorkoutService';
import { workoutService } from '@/services/workoutService';
import { useAuth } from '@/contexts/AuthContext';

interface WorkoutCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationData: {
    scheduled_workout_id: string;
    workout_summary: string;
    workout_description?: string;
    workout_start: string;
    workout_end: string;
    workout_location?: string;
  };
  onComplete: () => void;
}

export function WorkoutCompletionDialog({
  open,
  onOpenChange,
  notificationData,
  onComplete,
}: WorkoutCompletionDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Workout details form
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [satisfaction, setSatisfaction] = useState<number>(3);
  const [notes, setNotes] = useState('');

  const handleCompleted = async () => {
    if (!showDetails) {
      setShowDetails(true);
      return;
    }

    if (!workoutType || !duration) {
      toast({
        title: "Missing Information",
        description: "Please provide workout type and duration.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Calculate duration in minutes
      const durationMinutes = parseInt(duration);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        throw new Error('Invalid duration');
      }

      // Create workout entry
      const workout = await workoutService.addWorkout({
        user_id: user.id,
        started_at: notificationData.workout_start,
        type: workoutType,
        duration_minutes: durationMinutes,
        satisfaction: satisfaction,
        notes: notes || null,
        source: 'calendar',
        external_id: notificationData.scheduled_workout_id,
      });

      // Mark scheduled workout as completed
      await scheduledWorkoutService.markAsCompleted(
        notificationData.scheduled_workout_id,
        workout.id
      );

      toast({
        title: "Workout Logged!",
        description: "Great job completing your workout!",
      });

      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error logging workout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to log workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipped = async () => {
    setIsSubmitting(true);
    try {
      await scheduledWorkoutService.markAsSkipped(notificationData.scheduled_workout_id);
      
      toast({
        title: "Workout Skipped",
        description: "No worries! There's always next time.",
      });

      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error skipping workout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update workout status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowDetails(false);
    setWorkoutType('');
    setDuration('');
    setSatisfaction(3);
    setNotes('');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateDuration = () => {
    const start = new Date(notificationData.workout_start);
    const end = new Date(notificationData.workout_end);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return diffMins;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Did you complete your workout?
          </DialogTitle>
          <DialogDescription>
            Let us know if you completed this scheduled workout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workout Info */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold text-lg">{notificationData.workout_summary}</h3>
            
            {notificationData.workout_description && (
              <p className="text-sm text-muted-foreground">
                {notificationData.workout_description}
              </p>
            )}

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDateTime(notificationData.workout_start)}</span>
              </div>
              
              {notificationData.workout_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{notificationData.workout_location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Scheduled duration: {calculateDuration()} minutes</span>
              </div>
            </div>
          </div>

          {/* Workout Details Form (shown after clicking "Yes, I completed it") */}
          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="workout-type">Workout Type *</Label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger id="workout-type">
                    <SelectValue placeholder="Select workout type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="strength">Strength Training</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="pilates">Pilates</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="cycling">Cycling</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="crossfit">CrossFit</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder={`${calculateDuration()}`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>How satisfied are you with this workout?</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[satisfaction]}
                    onValueChange={(values) => setSatisfaction(values[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8 text-center">
                    {satisfaction}/5
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Not satisfied</span>
                  <span>Very satisfied</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How did it go? Any observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkipped}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            No, I skipped it
          </Button>
          <Button
            variant="motivation"
            onClick={handleCompleted}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {showDetails ? 'Log Workout' : 'Yes, I completed it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
