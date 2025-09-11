import { WellnessLayout } from "./WellnessLayout";
import { WellnessCard } from "./WellnessCard";
import { CaloriesChart } from "./CaloriesChart";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Calendar, 
  Target,
  Heart,
  Sun,
  Clock,
  ExternalLink
} from "lucide-react";

export function Dashboard() {
  
  // Mock data for demonstration
  const todayStats = {
    steps: 7842,
    stepGoal: 10000,
    calories: 320,
    calorieGoal: 500,
    workoutTime: 25,
    workoutGoal: 45,
    sleepHours: 7.5,
    sleepGoal: 8,
  };

  const weeklyProgress = [
    { day: "Mon", completed: true, type: "cardio" },
    { day: "Tue", completed: true, type: "strength" },
    { day: "Wed", completed: false, type: "yoga" },
    { day: "Thu", completed: true, type: "cardio" },
    { day: "Fri", completed: false, type: "rest" },
    { day: "Sat", completed: false, type: "strength" },
    { day: "Sun", completed: false, type: "yoga" },
  ];

  const upcomingWorkouts = [
    { time: "6:00 PM", title: "Evening Yoga Flow", duration: "30 min", type: "yoga" },
    { time: "Tomorrow 7:00 AM", title: "Morning Cardio", duration: "45 min", type: "cardio" },
  ];

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Good morning, Sarah!</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Ready to make today count? You're 3 days into your streak! 🔥
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Progress */}
            <WellnessCard className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Today's Progress
                </h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  3 day streak
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="mb-2">
                    <Progress value={(todayStats.steps / todayStats.stepGoal) * 100} className="h-2" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{todayStats.steps.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">of {todayStats.stepGoal.toLocaleString()} steps</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <Progress value={(todayStats.calories / todayStats.calorieGoal) * 100} className="h-2" />
                  </div>
                  <p className="text-2xl font-bold text-secondary">{todayStats.calories}</p>
                  <p className="text-sm text-muted-foreground">of {todayStats.calorieGoal} calories</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <Progress value={(todayStats.workoutTime / todayStats.workoutGoal) * 100} className="h-2" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{todayStats.workoutTime}m</p>
                  <p className="text-sm text-muted-foreground">of {todayStats.workoutGoal}m active</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <Progress value={(todayStats.sleepHours / todayStats.sleepGoal) * 100} className="h-2" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{todayStats.sleepHours}h</p>
                  <p className="text-sm text-muted-foreground">of {todayStats.sleepGoal}h sleep</p>
                </div>
              </div>
            </WellnessCard>

            {/* Google Calendar Integration */}
            <WellnessCard className="animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Full Calendar View
                </h2>
                <Button variant="zen" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google
                </Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Google Calendar Integration</h3>
                <p className="text-muted-foreground mb-4">
                  View all your events, meetings, and AI-scheduled workouts in one place
                </p>
                <Button variant="wellness">Connect Google Calendar</Button>
              </div>
            </WellnessCard>

            {/* Weekly Calories Chart */}
            <CaloriesChart />

            {/* AI Insights - Smaller Card Format */}
            <WellnessCard className="animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-motivation rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">AI Coach Insights</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Your consistency with morning workouts is paying off! Sleep quality improved with evening yoga.
              </p>
              <Button variant="wellness" size="sm">
                View Details
              </Button>
            </WellnessCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Workouts */}
            <WellnessCard className="animate-slide-up">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Up Next
              </h3>
              <div className="space-y-3">
                {upcomingWorkouts.map((workout, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{workout.title}</p>
                      <p className="text-xs text-muted-foreground">{workout.time} • {workout.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="zen" className="w-full mt-4">
                View Full Schedule
              </Button>
            </WellnessCard>

            {/* Quick Actions */}
            <WellnessCard className="animate-fade-in">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="zen" className="w-full justify-start" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Log Manual Activity
                </Button>
                <Button variant="zen" className="w-full justify-start" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Update Health Data
                </Button>
                <Button variant="zen" className="w-full justify-start" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reschedule Workout
                </Button>
              </div>
            </WellnessCard>
          </div>
        </div>

      </div>
    </WellnessLayout>
  );
}