import { WellnessLayout } from "../components/WellnessLayout";
import { WellnessCard } from "../components/WellnessCard";
import { CaloriesChart } from "../components/CaloriesChart";
import { GoogleCalendar } from "../components/GoogleCalendar";
import { FitbitData } from "../components/FitbitData";
import { ManualWorkoutDialog } from "../components/ManualWorkoutDialog";
import { UpNextWorkouts } from "../components/UpNextWorkouts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Activity, 
  Calendar, 
  Target,
  Heart,
  Sun,
  Clock,
  ExternalLink,
  Sunrise,
  Sunset,
  Moon
} from "lucide-react";

function Dashboard() {
  
  const { user } = useAuth();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return { text: "Good morning", icon: Sunrise };
    } else if (hour >= 12 && hour < 17) {
      return { text: "Good afternoon", icon: Sun };
    } else if (hour >= 17 && hour < 21) {
      return { text: "Good evening", icon: Sunset };
    } else {
      return { text: "Good night", icon: Moon };
    }
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

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

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {greeting.text}, {user?.first_name || 'there'}!
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <GreetingIcon className="w-4 h-4" />
            Ready to make today count? Let's keep up the momentum! 💪
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fitbit Health Data */}
            <WellnessCard className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Today's Progress
                </h2>
              </div>

              <FitbitData />
            </WellnessCard>

            {/* Google Calendar Integration */}
            <WellnessCard className="animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Calendar Integration
                </h2>
                <Button variant="zen" size="sm" onClick={() => window.open('https://calendar.google.com', '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google
                </Button>
              </div>

              <GoogleCalendar />
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
              <UpNextWorkouts />
            </WellnessCard>

            {/* Quick Actions */}
            <WellnessCard className="animate-fade-in">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <ManualWorkoutDialog
                  trigger={
                    <Button variant="zen" className="w-full justify-start" size="sm">
                      <Target className="w-4 h-4 mr-2" />
                      Log Manual Activity
                    </Button>
                  }
                />
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

export default Dashboard;