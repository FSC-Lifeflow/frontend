import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { useGoogleCalendarOAuth } from "@/hooks/useGoogleCalendarOAuth";
import { useFitbitOAuth } from "@/hooks/useFitbitOAuth";
import { Settings as SettingsIcon, Bell, Shield, Smartphone, Calendar, CheckCircle2, Activity } from "lucide-react";
import { useTheme } from "next-themes";
import { API_BASE_URL } from "@/lib/config";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { initiateOAuth, isLoading: oauthLoading } = useGoogleCalendarOAuth();
  const { initiateOAuth: initiateFitbitOAuth, isLoading: fitbitOauthLoading } = useFitbitOAuth();
  const [socialPrivacy, setSocialPrivacy] = useState(true);
  const [activitySharing, setActivitySharing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [checkingFitbitConnection, setCheckingFitbitConnection] = useState(true);

  // Check if Google Calendar is connected via backend API
  useEffect(() => {
    const checkGoogleConnection = async () => {
      if (!user?.id) {
        setCheckingConnection(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/google/status?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setGoogleCalendarConnected(data.connected && data.hasRefreshToken);
        } else {
          setGoogleCalendarConnected(false);
        }
      } catch (error) {
        console.error('Error checking Google Calendar connection:', error);
        setGoogleCalendarConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGoogleConnection();
  }, [user?.id]);

  // Check if Fitbit is connected via backend API
  useEffect(() => {
    const checkFitbitConnection = async () => {
      if (!user?.id) {
        setCheckingFitbitConnection(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/fitbit/status?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setFitbitConnected(data.connected && data.hasRefreshToken);
        } else {
          setFitbitConnected(false);
        }
      } catch (error) {
        console.error('Error checking Fitbit connection:', error);
        setFitbitConnected(false);
      } finally {
        setCheckingFitbitConnection(false);
      }
    };

    checkFitbitConnection();
  }, [user?.id]);

  // Load user's current settings
  useEffect(() => {
    const loadUserSettings = async () => {
      if (user) {
        setSocialPrivacy(user.social_privacy ?? true);
        setActivitySharing(user.activity_sharing ?? true);
        console.log('📥 Loaded user settings:', {
          social_privacy: user.social_privacy,
          activity_sharing: user.activity_sharing
        });
        setLoading(false);
      }
    };
    loadUserSettings();
  }, [user]);

  // Show success message after OAuth redirect
  useEffect(() => {
    const fitbitParam = searchParams.get('fitbit');
    const calendarParam = searchParams.get('calendar');
    
    if (fitbitParam === 'connected') {
      toast({
        title: "Fitbit Connected",
        description: "Your Fitbit account has been successfully connected.",
      });
      // Remove the query parameter using a new instance to avoid in-place mutation
      const next = new URLSearchParams(searchParams);
      next.delete('fitbit');
      setSearchParams(next, { replace: true });
    }
    
    if (calendarParam === 'connected') {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar has been successfully connected.",
      });
      // Remove the query parameter using a new instance to avoid in-place mutation
      const next = new URLSearchParams(searchParams);
      next.delete('calendar');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Handle social privacy toggle with auto-save
  const handleSocialPrivacyChange = async (newValue: boolean) => {
    if (!user?.id) return;

    try {
      setSocialPrivacy(newValue);
      
      await authService.updateUserProfile(user.id, {
        social_privacy: newValue,
      });

      toast({
        title: "Privacy Setting Updated",
        description: `Social features ${newValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('❌ Failed to update social privacy:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
      
      // Revert the switch state on error
      setSocialPrivacy(!newValue);
    }
  };

  // Handle activity sharing toggle with auto-save
  const handleActivitySharingChange = async (newValue: boolean) => {
    if (!user?.id) {
      console.error('🚫 Cannot update activity sharing: No user ID');
      return;
    }

    console.log('🔄 ===== ACTIVITY SHARING TOGGLE (Settings Page) =====');
    console.log('🔄 Previous value:', activitySharing);
    console.log('🔄 New value:', newValue);
    console.log('🔄 User ID:', user.id);
    console.log('🔄 Timestamp:', new Date().toISOString());

    try {
      console.log('💾 Updating activity sharing state...');
      setActivitySharing(newValue);
      
      console.log('📡 Calling authService.updateUserProfile...');
      await authService.updateUserProfile(user.id, {
        activity_sharing: newValue,
      });

      console.log('✅ Activity sharing updated successfully');
      toast({
        title: "Activity Sharing Updated",
        description: `Activity sharing ${newValue ? 'enabled' : 'disabled'}`,
      });
      console.log('🔄 ===== UPDATE COMPLETE =====');
    } catch (error) {
      console.error('❌ ===== ACTIVITY SHARING UPDATE FAILED =====');
      console.error('❌ Failed to update activity sharing:', error);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to update activity sharing. Please try again.",
        variant: "destructive",
      });
      
      // Revert the switch state on error
      setActivitySharing(!newValue);
    }
  };

  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDark = (theme === "system" ? resolvedTheme === "dark" : theme === "dark") || false;

  const handleGoogleCalendarConnect = async () => {
    try {
      await initiateOAuth();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleCalendarDisconnect = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/google/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      setGoogleCalendarConnected(false);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFitbitConnect = async () => {
    try {
      initiateFitbitOAuth();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Fitbit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFitbitDisconnect = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/fitbit/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      setFitbitConnected(false);
      toast({
        title: "Disconnected",
        description: "Fitbit has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting Fitbit:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Fitbit. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

          <div className="space-y-6">
            {/* Notifications */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Notifications</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Workout Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get notified about scheduled workouts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Friend Activity</Label>
                    <p className="text-sm text-muted-foreground">Updates from friends and connections</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Progress Celebrations</Label>
                    <p className="text-sm text-muted-foreground">Milestone achievements and goals</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </WellnessCard>

            {/* Privacy & Security */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Privacy & Security</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Social Features</Label>
                    <p className="text-sm text-muted-foreground">Allow others to find and connect with you</p>
                  </div>
                  <Switch 
                    checked={socialPrivacy}
                    onCheckedChange={handleSocialPrivacyChange}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activity Sharing</Label>
                    <p className="text-sm text-muted-foreground">Share workout data with friends</p>
                  </div>
                  <Switch 
                    checked={activitySharing}
                    onCheckedChange={handleActivitySharingChange}
                    disabled={loading}
                  />
                </div>
                <Button variant="zen" className="w-full">
                  Manage Data & Privacy
                </Button>
              </div>
            </WellnessCard>

            {/* App Preferences */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">App Preferences</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Switch to dark theme</p>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    aria-label="Toggle dark mode"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-sync Calendar</Label>
                    <p className="text-sm text-muted-foreground">Automatically sync with Google Calendar</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </WellnessCard>

            {/* Integrations */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Integrations</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border-2 border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Google Calendar</p>
                        {googleCalendarConnected && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {checkingConnection 
                          ? "Checking connection..." 
                          : googleCalendarConnected 
                            ? "Connected with refresh token" 
                            : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {googleCalendarConnected ? (
                    <Button 
                      variant="zen" 
                      size="sm"
                      onClick={handleGoogleCalendarDisconnect}
                      disabled={checkingConnection}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      variant="wellness" 
                      size="sm"
                      onClick={handleGoogleCalendarConnect}
                      disabled={oauthLoading || checkingConnection}
                    >
                      {oauthLoading ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </div>
            </WellnessCard>

            {/* Connected Devices */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Connected Devices</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border-2 border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Fitbit</p>
                        {fitbitConnected && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {checkingFitbitConnection 
                          ? "Checking connection..." 
                          : fitbitConnected 
                            ? "Connected with refresh token" 
                            : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {fitbitConnected ? (
                    <Button 
                      variant="zen" 
                      size="sm"
                      onClick={handleFitbitDisconnect}
                      disabled={checkingFitbitConnection}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      variant="wellness" 
                      size="sm"
                      onClick={handleFitbitConnect}
                      disabled={fitbitOauthLoading || checkingFitbitConnection}
                    >
                      {fitbitOauthLoading ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </div>
            </WellnessCard>
          </div>
        </div>
      </div>
    </WellnessLayout>
  );
}