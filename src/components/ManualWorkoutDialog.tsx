import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { workoutService } from "@/services/workoutService";
import { useToast } from "@/hooks/use-toast";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const workoutSchema = z.object({
  started_at: z.string().min(1, "Please select a date and time."),
  type: z.string().min(1, "Please select a workout type."),
  duration_minutes: z
    .string()
    .min(1, "Enter duration")
    .refine((val) => Number(val) > 0, { message: "Duration must be greater than 0" }),
  satisfaction: z.string().optional(),
  notes: z.string().optional(),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

export function ManualWorkoutDialog({
  trigger,
  onSaved,
}: {
  trigger?: React.ReactNode;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      started_at: new Date().toISOString().slice(0, 16), // initialize then fix for datetime-local below
      type: "",
      duration_minutes: "",
      satisfaction: "3",
      notes: "",
    },
  });

  // Ensure datetime-local format (YYYY-MM-DDTHH:MM)
  React.useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    form.setValue("started_at", local, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (values: WorkoutFormValues) => {
    if (!user?.id) {
      toast({ title: "Not signed in", description: "Please log in to save workouts.", variant: "destructive" });
      return;
    }

    try {
      const iso = new Date(values.started_at).toISOString();
      await workoutService.addWorkout({
        user_id: user.id,
        started_at: iso,
        type: values.type,
        duration_minutes: Number(values.duration_minutes),
        satisfaction: values.satisfaction ? Number(values.satisfaction) : null,
        notes: values.notes || null,
      });

      toast({ title: "Workout logged", description: "Your workout has been saved." });
      setOpen(false);
      form.reset();
      onSaved?.();
    } catch (err) {
      console.error("Failed to save workout", err);
      toast({ title: "Error", description: "Could not save workout. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Workout</DialogTitle>
          <DialogDescription>Record a workout manually. You can sync wearables later.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="started_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time of workout</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>Select the local date and start time.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of workout</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardio">Cardio</SelectItem>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="yoga">Yoga</SelectItem>
                        <SelectItem value="pilates">Pilates</SelectItem>
                        <SelectItem value="cycling">Cycling</SelectItem>
                        <SelectItem value="walking">Walking</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="hiit">HIIT</SelectItem>
                        <SelectItem value="crossfit">CrossFit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="satisfaction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Satisfaction</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="How did it feel? (1-5)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Tough</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3 - Okay</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5 - Great</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>Optional quick rating.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What did you do? Any observations?" {...field} />
                  </FormControl>
                  <FormDescription>Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="wellness">
                Save Workout
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
