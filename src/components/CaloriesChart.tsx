import { useEffect, useMemo } from "react";
import { WellnessCard } from "./WellnessCard";
import { TrendingUp } from "lucide-react";
import { useFitbit } from "@/hooks/useFitbit";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CaloriesChart() {
  const { isAuthenticated, data, isLoading, error, fetchCaloriesSeries } = useFitbit();

  // Hide the chart if Fitbit is not connected
  if (!isAuthenticated) {
    return null;
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchCaloriesSeries("7d");
    }
  }, [isAuthenticated, fetchCaloriesSeries]);

  const weeklyCaloriesData = useMemo(() => {
    const series = data.caloriesSeries;
    if (!series || series.length === 0) return null;

    // Fitbit returns an array of { dateTime: 'YYYY-MM-DD', value: '1234' } oldest->newest
    return series.map((d) => {
      // Parse date parts to avoid timezone issues with YYYY-MM-DD strings
      const [year, month, dayOfMonth] = d.date.split('-').map(Number);
      const date = new Date(year, month - 1, dayOfMonth);
      const day = WEEKDAYS[date.getDay()];
      return { day, calories: d.calories };
    });
  }, [data.caloriesSeries]);

  // Build a 7-day fallback ending today if no data yet
  const fallbackData = useMemo(() => {
    const days: { day: string; calories: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ day: WEEKDAYS[d.getDay()], calories: 0 });
    }
    return days;
  }, []);

  const chartData = weeklyCaloriesData ?? fallbackData;
  const maxCalories = chartData.length ? Math.max(...chartData.map(d => d.calories)) : 0;
  const totalCalories = chartData.reduce((sum, d) => sum + d.calories, 0);
  const avgCalories = chartData.length > 0 ? Math.round(totalCalories / chartData.length) : 0;

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

      {error && (
        <div className="mb-2 text-xs text-destructive">{error}</div>
      )}

      <div className="flex items-end justify-between gap-2 h-40">
        {chartData.map((dayData, index) => {
          const height = maxCalories > 0 ? (dayData.calories / maxCalories) * 100 : 0;
          // Last bar is today in our generated fallback and Fitbit series
          const isToday = index === chartData.length - 1;

          // Use muted background when zero to still show an empty bar track
          const barClass = dayData.calories > 0
            ? (isToday ? 'bg-gradient-motivation shadow-wellness' : 'bg-gradient-primary hover:bg-gradient-motivation')
            : 'bg-muted';

          return (
            <div key={`${dayData.day}-${index}`} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col justify-end h-32 mb-2">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${barClass}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{dayData.day}</span>
              <span className="text-xs text-primary font-bold">{dayData.calories}</span>
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