import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useTerra } from "@/hooks/useTerra";
import { Activity, Heart, RefreshCw, AlertCircle, Moon, Footprints, Flame, Clock, Smartphone } from "lucide-react";
import { format } from "date-fns";

interface AppleHealthDataProps {
  className?: string;
}

export function AppleHealthData({ className }: AppleHealthDataProps) {
  const { isLinked, terraUserId, data, isLoading, error, authenticate, setTerraUser, refreshData, signOut } = useTerra();

  const formatSleepHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStepProgress = () => Math.min(((data.activity?.steps || 0) / 10000) * 100, 100);
  const getCalorieProgress = () => Math.min(((data.activity?.calories || 0) / 2000) * 100, 100);
  const getActiveMinutesProgress = () => Math.min(((data.activity?.activeMinutes || 0) / 30) * 100, 100);
  const getSleepProgress = () => Math.min(((data.sleep?.totalMinutesAsleep || 0) / (8 * 60)) * 100, 100);

  if (!isLinked) {
    return (
      <div className={`bg-muted/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-black via-neutral-800 to-neutral-600 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Connect your device via Terra</h3>
            <p className="text-sm text-muted-foreground">Support Apple Health, Fitbit, Garmin, Oura, WHOOP and more.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="wellness" onClick={authenticate} disabled={isLoading}>
            {isLoading ? "Starting..." : "Start Terra Connection"}
          </Button>
          <div className="flex items-center gap-2">
            <Input placeholder="Enter Terra user_id (dev)" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) setTerraUser(val);
              }
            }} />
            <Button variant="zen" onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[placeholder="Enter Terra user_id (dev)"]');
              const val = el?.value.trim();
              if (val) setTerraUser(val);
            }}>Set user</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Health Data (Terra)</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-700">Linked</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>Disconnect</Button>
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
          <p className="text-muted-foreground">Loading your health data...</p>
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

export default AppleHealthData;
