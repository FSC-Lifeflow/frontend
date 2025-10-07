import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Database } from 'lucide-react';
import { useFitbitSync } from '@/hooks/useFitbitSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Fitbit Sync Status Component
 * Shows sync status and provides manual sync controls
 * Add this to your Settings page
 */
export function FitbitSyncStatus() {
  const {
    isSyncing,
    syncError,
    lastSyncTime,
    syncToday,
    syncLastNDays,
    getLastSyncTime,
  } = useFitbitSync();

  const [syncDays, setSyncDays] = useState(7);

  // Load last sync time on mount
  useEffect(() => {
    getLastSyncTime();
  }, [getLastSyncTime]);

  const handleSyncToday = async () => {
    const success = await syncToday();
    if (success) {
      console.log('✓ Sync completed successfully');
    }
  };

  const handleSyncLastNDays = async () => {
    const success = await syncLastNDays(syncDays);
    if (success) {
      console.log(`✓ Synced last ${syncDays} days successfully`);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Fitbit Data Sync
            </CardTitle>
            <CardDescription>
              Sync your Fitbit data to Supabase for AI analysis
            </CardDescription>
          </div>
          
          {lastSyncTime && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatLastSync(lastSyncTime)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Syncing data...</span>
            </>
          ) : syncError ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">
                Sync failed: {syncError}
              </span>
            </>
          ) : lastSyncTime ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                Data synced successfully
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600">
                No sync yet
              </span>
            </>
          )}
        </div>

        {/* Quick Sync Actions */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Sync</label>
            <Button
              onClick={handleSyncToday}
              disabled={isSyncing}
              className="w-full"
              variant="default"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Today's Data
                </>
              )}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Sync Historical Data
            </label>
            <div className="flex gap-2">
              <select
                value={syncDays}
                onChange={(e) => setSyncDays(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                disabled={isSyncing}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button
                onClick={handleSyncLastNDays}
                disabled={isSyncing}
                variant="outline"
              >
                Sync
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This may take a few minutes for large date ranges
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>💡 Tip:</strong> Data is automatically synced when you refresh 
            your dashboard. Manual sync is useful for backfilling historical data 
            or ensuring the latest data is available for AI analysis.
          </p>
        </div>

        {/* Data Storage Info */}
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">What gets stored?</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Activity: Steps, calories, active minutes, distance</li>
            <li>• Sleep: Duration, efficiency, sleep stages (deep, light, REM)</li>
            <li>• Heart Rate: Resting HR, heart rate zones</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
