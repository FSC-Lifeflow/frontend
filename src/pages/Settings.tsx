import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Bell, Shield, Smartphone, Moon } from "lucide-react";

export default function Settings() {
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
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Allow others to find your profile</p>
                  </div>
                  <Switch defaultChecked />
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
                  <Switch />
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