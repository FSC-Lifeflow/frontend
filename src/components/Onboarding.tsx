import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WellnessCard } from "./WellnessCard";
import { Heart, Target, Calendar, User } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: "",
    goal: "",
    activityLevel: "",
    fitnessGoals: [] as string[],
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-wellness flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Step {step} of {totalSteps}
          </p>
        </div>

        <WellnessCard variant="glass" className="animate-fade-in">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Welcome to your wellness journey</h2>
                <p className="text-muted-foreground mt-2">Let's get to know you better</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">What's your name?</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">What's your main goal?</h2>
                <p className="text-muted-foreground mt-2">This helps us personalize your experience</p>
              </div>
              
              <RadioGroup 
                value={userData.goal} 
                onValueChange={(value) => setUserData({ ...userData, goal: value })}
                className="space-y-3"
              >
                {[
                  { id: "weight-loss", label: "Lose weight", desc: "Focus on calorie burning and nutrition" },
                  { id: "muscle-gain", label: "Build muscle", desc: "Strength training and protein focus" },
                  { id: "general-fitness", label: "General fitness", desc: "Overall health and wellness" },
                  { id: "stress-relief", label: "Stress relief", desc: "Mindful movement and relaxation" },
                ].map((goal) => (
                  <div key={goal.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={goal.id} id={goal.id} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={goal.id} className="font-medium cursor-pointer">
                        {goal.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{goal.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Activity level</h2>
                <p className="text-muted-foreground mt-2">Help us tailor your workout intensity</p>
              </div>
              
              <RadioGroup 
                value={userData.activityLevel} 
                onValueChange={(value) => setUserData({ ...userData, activityLevel: value })}
                className="space-y-3"
              >
                {[
                  { id: "beginner", label: "Beginner", desc: "Just getting started" },
                  { id: "intermediate", label: "Intermediate", desc: "Regular exercise routine" },
                  { id: "advanced", label: "Advanced", desc: "Experienced athlete" },
                ].map((level) => (
                  <div key={level.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={level.id} id={level.id} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={level.id} className="font-medium cursor-pointer">
                        {level.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{level.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-motivation rounded-full flex items-center justify-center mb-4 animate-glow-pulse">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">You're all set!</h2>
                <p className="text-muted-foreground mt-2">
                  Welcome to your personalized wellness journey, {userData.name}. Let's start building healthy habits together.
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <h3 className="font-medium mb-2">Your profile:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Goal: {userData.goal.replace('-', ' ')}</li>
                  <li>Activity level: {userData.activityLevel}</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button variant="zen" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button 
              variant={step === totalSteps ? "motivation" : "wellness"}
              onClick={handleNext}
              className="ml-auto"
              disabled={
                (step === 1 && !userData.name) ||
                (step === 2 && !userData.goal) ||
                (step === 3 && !userData.activityLevel)
              }
            >
              {step === totalSteps ? "Start my journey" : "Continue"}
            </Button>
          </div>
        </WellnessCard>
      </div>
    </div>
  );
}