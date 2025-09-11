import { WellnessCard } from "./WellnessCard";
import { TrendingUp } from "lucide-react";

// Mock data for weekly calories
const weeklyCaloriesData = [
  { day: "Mon", calories: 420 },
  { day: "Tue", calories: 380 },
  { day: "Wed", calories: 450 },
  { day: "Thu", calories: 320 },
  { day: "Fri", calories: 290 },
  { day: "Sat", calories: 510 },
  { day: "Sun", calories: 340 },
];

export function CaloriesChart() {
  const maxCalories = Math.max(...weeklyCaloriesData.map(d => d.calories));
  const totalCalories = weeklyCaloriesData.reduce((sum, d) => sum + d.calories, 0);
  const avgCalories = Math.round(totalCalories / weeklyCaloriesData.length);

  return (
    <WellnessCard className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Weekly Calories Burned
        </h2>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{totalCalories}</p>
          <p className="text-sm text-muted-foreground">total this week</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-40">
        {weeklyCaloriesData.map((day, index) => {
          const height = (day.calories / maxCalories) * 100;
          const isToday = index === 3; // Thursday is today in our mock data
          
          return (
            <div key={day.day} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col justify-end h-32 mb-2">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isToday 
                      ? 'bg-gradient-motivation shadow-wellness' 
                      : 'bg-gradient-primary hover:bg-gradient-motivation'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{day.day}</span>
              <span className="text-xs text-primary font-bold">{day.calories}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Daily Average</span>
          <span className="font-semibold text-foreground">{avgCalories} cal</span>
        </div>
      </div>
    </WellnessCard>
  );
}