import { useState } from "react";
import { WellnessLayout } from "@/components/WellnessLayout";
import { WellnessCard } from "@/components/WellnessCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    name: "Sarah Johnson",
    email: "sarah@example.com",
    profilePicture: "",
    fitnessLevel: "intermediate",
    primaryGoals: "weight-loss",
    exercisePreferences: "strength-cardio",
    weeklyFrequency: "4-5-days",
    sessionDuration: "30-45-min",
    equipmentAccess: "full-gym",
    physicalLimitations: "",
    socialPrivacy: true
  });

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <WellnessLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Profile Settings</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Information */}
            <WellnessCard className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Personal Information</h2>
              </div>

              <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="bg-gradient-primary text-white text-lg">
                      {profileData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="zen" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </WellnessCard>

            {/* Privacy Settings */}
            <WellnessCard>
              <h3 className="font-semibold mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Social Features</Label>
                    <p className="text-sm text-muted-foreground">Allow others to find and connect with you</p>
                  </div>
                  <Switch
                    checked={profileData.socialPrivacy}
                    onCheckedChange={(checked) => handleInputChange('socialPrivacy', checked)}
                  />
                </div>
              </div>
            </WellnessCard>

            {/* Fitness Goals */}
            <WellnessCard className="lg:col-span-3">
              <h2 className="text-xl font-semibold mb-6">Fitness Goal Specifications</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label>Fitness Level</Label>
                  <Select value={profileData.fitnessLevel} onValueChange={(value) => handleInputChange('fitnessLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Primary Goals</Label>
                  <Select value={profileData.primaryGoals} onValueChange={(value) => handleInputChange('primaryGoals', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight-loss">Weight Loss</SelectItem>
                      <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                      <SelectItem value="endurance">Endurance</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                      <SelectItem value="general-health">General Health</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Exercise Preferences</Label>
                  <Select value={profileData.exercisePreferences} onValueChange={(value) => handleInputChange('exercisePreferences', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength-training">Strength Training</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="outdoor">Outdoor Activities</SelectItem>
                      <SelectItem value="strength-cardio">Strength + Cardio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Weekly Frequency</Label>
                  <Select value={profileData.weeklyFrequency} onValueChange={(value) => handleInputChange('weeklyFrequency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2-3-days">2-3 days</SelectItem>
                      <SelectItem value="4-5-days">4-5 days</SelectItem>
                      <SelectItem value="6-7-days">6-7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Session Duration</Label>
                  <Select value={profileData.sessionDuration} onValueChange={(value) => handleInputChange('sessionDuration', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15-30-min">15-30 min</SelectItem>
                      <SelectItem value="30-45-min">30-45 min</SelectItem>
                      <SelectItem value="45-60-min">45-60 min</SelectItem>
                      <SelectItem value="60-plus-min">60+ min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Equipment Access</Label>
                  <Select value={profileData.equipmentAccess} onValueChange={(value) => handleInputChange('equipmentAccess', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home-bodyweight">Home (bodyweight)</SelectItem>
                      <SelectItem value="home-basic">Home (basic equipment)</SelectItem>
                      <SelectItem value="full-gym">Full gym</SelectItem>
                      <SelectItem value="outdoor">Outdoor spaces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="limitations">Physical Limitations</Label>
                <Textarea
                  id="limitations"
                  placeholder="Please describe any physical limitations, injuries, or health conditions we should consider when planning your workouts..."
                  value={profileData.physicalLimitations}
                  onChange={(e) => handleInputChange('physicalLimitations', e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end mt-6">
                <Button variant="motivation" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </div>
            </WellnessCard>
          </div>
        </div>
      </div>
    </WellnessLayout>
  );
}