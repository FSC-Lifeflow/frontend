import { useFitbit, FitbitData as FitbitDataType } from "@/hooks/useFitbit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Heart, 
  RefreshCw, 
  AlertCircle,
  Moon,
  Footprints,
  Flame,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface FitbitDataProps {
  className?: string;
}

export function FitbitData({ className }: FitbitDataProps) {
  const { 
    isAuthenticated, 
    data, 
    isLoading, 
    error, 
    authenticate, 
    signOut, 
    refreshData 
  } = useFitbit();

  const formatSleepHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStepProgress = () => {
    if (!data.activity?.steps) return 0;
    const goal = 10000; // Default step goal
    return Math.min((data.activity.steps / goal) * 100, 100);
  };

  const getCalorieProgress = () => {
    if (!data.activity?.calories) return 0;
    const goal = 2000; // Default calorie goal
    return Math.min((data.activity.calories / goal) * 100, 100);
  };

  const getActiveMinutesProgress = () => {
    if (!data.activity?.activeMinutes) return 0;
    const goal = 30; // Default active minutes goal
    return Math.min((data.activity.activeMinutes / goal) * 100, 100);
  };

  const getSleepProgress = () => {
    if (!data.sleep?.totalMinutesAsleep) return 0;
    const goal = 8 * 60; // 8 hours in minutes
    return Math.min((data.sleep.totalMinutesAsleep / goal) * 100, 100);
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-muted/30 rounded-lg p-6 text-center ${className}`}>
        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-semibold mb-2">Fitbit Integration</h3>
        <p className="text-muted-foreground mb-4">
          Connect your Fitbit to track steps, calories, sleep, and heart rate data
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
          {isLoading ? "Connecting..." : "Connect Fitbit"}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Fitbit Data</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Connected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshData}
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

      {isLoading && !data.activity ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your Fitbit data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Steps */}
            <div className="text-center">
              <div className="mb-2">
                <Progress value={getStepProgress()} className="h-2" />
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Footprints className="w-4 h-4 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {data.activity?.steps?.toLocaleString() || 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">steps today</p>
            </div>

            {/* Calories */}
            <div className="text-center">
              <div className="mb-2">
                <Progress value={getCalorieProgress()} className="h-2" />
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-secondary" />
                <p className="text-2xl font-bold text-secondary">
                  {data.activity?.calories || 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">calories burned</p>
            </div>

            {/* Active Minutes */}
            <div className="text-center">
              <div className="mb-2">
                <Progress value={getActiveMinutesProgress()} className="h-2" />
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {data.activity?.activeMinutes || 0}m
                </p>
              </div>
              <p className="text-sm text-muted-foreground">active minutes</p>
            </div>

            {/* Sleep */}
            <div className="text-center">
              <div className="mb-2">
                <Progress value={getSleepProgress()} className="h-2" />
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Moon className="w-4 h-4 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {data.sleep?.totalMinutesAsleep ? 
                    formatSleepHours(data.sleep.totalMinutesAsleep) : '0h 0m'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">sleep last night</p>
            </div>
          </div>

          {/* Heart Rate Data */}
          {data.heartRate && (
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-red-500" />
                <h4 className="font-semibold">Heart Rate</h4>
              </div>
              
              {data.heartRate.restingHeartRate && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">Resting Heart Rate</p>
                  <p className="text-2xl font-bold text-red-500">
                    {data.heartRate.restingHeartRate} <span className="text-sm font-normal">bpm</span>
                  </p>
                </div>
              )}

              {data.heartRate.heartRateZones && data.heartRate.heartRateZones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Heart Rate Zones</p>
                  {data.heartRate.heartRateZones.map((zone, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{zone.name}</span>
                      <span className="text-muted-foreground">
                        {zone.minutes} min ({zone.min}-{zone.max} bpm)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Additional Activity Details */}
          {data.activity && (
            <div className="bg-card rounded-lg p-4 border border-border">
              <h4 className="font-semibold mb-3">Activity Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-medium">{data.activity.distance?.toFixed(2) || 0} miles</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Very Active</p>
                  <p className="font-medium">{data.activity.veryActiveMinutes || 0} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fairly Active</p>
                  <p className="font-medium">{data.activity.fairlyActiveMinutes || 0} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lightly Active</p>
                  <p className="font-medium">{data.activity.lightlyActiveMinutes || 0} min</p>
                </div>
              </div>
            </div>
          )}

          {/* Sleep Details */}
          {data.sleep && (
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">Sleep Summary</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Time in Bed</p>
                  <p className="font-medium">{formatSleepHours(data.sleep.totalTimeInBed || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sleep Efficiency</p>
                  <p className="font-medium">{data.sleep.efficiency || 0}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Last Sync */}
          {data.lastSync && (
            <div className="text-center text-xs text-muted-foreground">
              Last synced: {format(new Date(data.lastSync), 'MMM d, h:mm a')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
