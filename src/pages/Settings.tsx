import { useState, useEffect } from "react";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { Settings as SettingsIcon, Bell, Shield, Smartphone, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socialPrivacy, setSocialPrivacy] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load user's current social privacy setting
  useEffect(() => {
    const loadUserSettings = async () => {
      if (user) {
        setSocialPrivacy(user.social_privacy ?? true);
        setLoading(false);
      }
    };
    loadUserSettings();
  }, [user]);

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

  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDark = (theme === "system" ? resolvedTheme === "dark" : theme === "dark") || false;

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
                    <p className="text-sm text-muted-foreground">Milestone achievements and streaks</p>
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
                  <Switch />
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

            {/* Connected Devices */}
            <WellnessCard>
              <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Connected Devices</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Google Fit</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                  <Button variant="zen" size="sm">Disconnect</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Fitbit</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                  <Button variant="wellness" size="sm">Connect</Button>
                </div>
              </div>
            </WellnessCard>
          </div>
        </div>
      </div>
    </WellnessLayout>
  );
}