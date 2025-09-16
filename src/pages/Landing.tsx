import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WellnessCard } from "@/components/WellnessCard";
import { 
  Calendar, 
  Brain, 
  Users, 
  Play, 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  Shield, 
  Smartphone,
  BarChart3,
  Clock,
  Heart,
  Target,
  Globe,
  Lock,
  Star,
  ChevronDown
} from "lucide-react";

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartFitnessJourney = async () => {
    try {
      const response = await fetch(`/api/webhook/${import.meta.env.VITE_TEST_WEBHOOK_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_fitness_journey',
          timestamp: new Date().toISOString(),
          source: 'landing_page'
        }),
      });

      if (response.ok) {
        console.log('Webhook called successfully');
        // You can add user feedback here, like a toast notification
      } else {
        console.error('Webhook call failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error calling webhook:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-wellness">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-secondary/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>
        
        <div className={`relative z-10 max-w-6xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Your AI-Powered
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Fitness Revolution
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              LifeFlow eliminates the complexity of fitness management through intelligent AI agents 
              that schedule workouts, analyze health data, and keep you accountable—all automatically.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              variant="motivation" 
              size="lg" 
              className="text-lg px-8 py-4 h-auto"
              onClick={handleStartFitnessJourney}
            >
              Start Your Fitness Journey
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto border-primary/30 hover:border-primary">
              <Play className="mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Floating Dashboard Mockup */}
          <div className="relative mx-auto max-w-4xl">
            <WellnessCard variant="glass" className="p-8 transform hover:scale-105 transition-all duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">AI Scheduling Active</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-primary/20 rounded-full">
                      <div className="h-2 bg-gradient-primary rounded-full w-3/4 animate-pulse"></div>
                    </div>
                    <div className="text-xs text-muted-foreground">Weekly Goal: 75%</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-secondary" />
                    <span className="text-sm">Health Insights</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">8.2k</div>
                  <div className="text-xs text-muted-foreground">Steps today</div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-sm">Social</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <div className="text-xs text-muted-foreground">Day streak</div>
                </div>
              </div>
            </WellnessCard>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Fitness Management Shouldn't Be This Complex
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <WellnessCard variant="glass" className="text-center hover:scale-105 transition-all duration-300 border-l-4 border-l-secondary">
              <Clock className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Scheduling Chaos</h3>
              <p className="text-muted-foreground">
                Struggling to coordinate workout schedules with your busy life
              </p>
            </WellnessCard>
            
            <WellnessCard variant="glass" className="text-center hover:scale-105 transition-all duration-300 border-l-4 border-l-secondary">
              <BarChart3 className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Data Overload</h3>
              <p className="text-muted-foreground">
                Overwhelmed by health data with no actionable insights
              </p>
            </WellnessCard>
            
            <WellnessCard variant="glass" className="text-center hover:scale-105 transition-all duration-300 border-l-4 border-l-secondary">
              <Target className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Motivation Gap</h3>
              <p className="text-muted-foreground">
                Lacking consistent motivation and accountability
              </p>
            </WellnessCard>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-4 bg-gradient-primary px-8 py-4 rounded-full text-white font-semibold">
              <Zap className="w-5 h-5" />
              LifeFlow's intelligent automation solves these challenges
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Agents Showcase */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Meet Your AI-Powered Fitness Team
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Three intelligent agents working together to revolutionize your fitness journey
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Smart Calendar Agent */}
            <WellnessCard variant="default" className="group hover:shadow-glow transition-all duration-500 cursor-pointer">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Smart Calendar Scheduling Agent
                </h3>
                <p className="text-lg font-semibold text-primary">
                  Never Miss the Perfect Workout Time
                </p>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Analyzes your Google Calendar availability, workout history, and recovery patterns 
                to automatically schedule optimal workout times. Adapts to weather changes and life events.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">This Week</span>
                  <span className="text-xs text-muted-foreground">AI Optimized</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Mon 7:00 AM - Morning Cardio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span className="text-sm">Wed 6:30 PM - Strength Training</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span className="text-sm">Fri 8:00 AM - Yoga (Weather: Rainy)</span>
                  </div>
                </div>
              </div>
            </WellnessCard>

            {/* Health Data Intelligence Agent */}
            <WellnessCard variant="default" className="group hover:shadow-glow transition-all duration-500 cursor-pointer">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-motivation rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Health Data Intelligence Agent
                </h3>
                <p className="text-lg font-semibold text-secondary">
                  Transform Data Into Actionable Fitness Insights
                </p>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Processes Fitbit data and manual inputs through advanced AI to generate personalized 
                health insights, identify performance patterns, and recommend optimization strategies.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Recovery Score</span>
                    <span className="text-sm font-bold text-primary">87%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-gradient-primary rounded-full w-[87%]"></div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 AI Insight: Your sleep quality improved 15% this week. Consider maintaining current bedtime routine.
                </div>
              </div>
            </WellnessCard>

            {/* Social Accountability Agent */}
            <WellnessCard variant="default" className="group hover:shadow-glow transition-all duration-500 cursor-pointer">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Social Accountability Agent
                </h3>
                <p className="text-lg font-semibold text-accent">
                  Stay Motivated With Intelligent Social Support
                </p>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Provides personalized workout reminders, motivational messages, and optional friend 
                notifications to keep you accountable. Features streaks, leaderboards, and social challenges.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">🔥</div>
                    <div>
                      <div className="text-sm font-medium">12-day streak!</div>
                      <div className="text-xs text-muted-foreground">Keep it up, you're on fire!</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">👥</div>
                    <div>
                      <div className="text-sm font-medium">3 friends need motivation</div>
                      <div className="text-xs text-muted-foreground">Send them encouragement?</div>
                    </div>
                  </div>
                </div>
              </div>
            </WellnessCard>
          </div>
        </div>
      </section>

      {/* Workflow Automation Showcase */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Intelligent Automation Powered by n8n Workflows
            </h2>
            <p className="text-xl text-muted-foreground">
              Advanced AI orchestration through OpenAI and Claude APIs
            </p>
          </div>

          <WellnessCard variant="glass" className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
              {/* Input Sources */}
              <div className="space-y-4">
                <h3 className="font-semibold text-center text-primary">Data Sources</h3>
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Smartphone className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Fitbit</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Google Calendar</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Heart className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Manual Input</div>
                  </div>
                </div>
              </div>

              {/* Flow Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-8 h-8 text-primary animate-pulse" />
              </div>

              {/* AI Processing */}
              <div className="space-y-4">
                <h3 className="font-semibold text-center text-primary">AI Processing</h3>
                <div className="space-y-3">
                  <div className="bg-gradient-primary rounded-lg p-3 text-center text-white">
                    <Brain className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">OpenAI</div>
                  </div>
                  <div className="bg-gradient-motivation rounded-lg p-3 text-center text-white">
                    <Zap className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Claude AI</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Globe className="w-6 h-6 mx-auto mb-2 text-accent" />
                    <div className="text-sm font-medium">n8n Workflows</div>
                  </div>
                </div>
              </div>

              {/* Flow Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-8 h-8 text-primary animate-pulse" />
              </div>

              {/* Outputs */}
              <div className="space-y-4">
                <h3 className="font-semibold text-center text-primary">Smart Actions</h3>
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Auto Scheduling</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Health Insights</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-sm font-medium">Social Updates</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                Real-time WebSocket updates active
              </div>
            </div>
          </WellnessCard>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Your Comprehensive Fitness Command Center
            </h2>
          </div>

          <WellnessCard variant="glass" className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Health Trends
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg flex items-end justify-between p-4">
                      <div className="w-8 bg-primary/60 rounded-t" style={{height: '60%'}}></div>
                      <div className="w-8 bg-primary/80 rounded-t" style={{height: '80%'}}></div>
                      <div className="w-8 bg-secondary/60 rounded-t" style={{height: '70%'}}></div>
                      <div className="w-8 bg-secondary/80 rounded-t" style={{height: '90%'}}></div>
                      <div className="w-8 bg-primary rounded-t" style={{height: '100%'}}></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-secondary" />
                    AI-Scheduled Workouts
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Today 7:00 AM</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Cardio</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Tomorrow 6:30 PM</span>
                      <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">Strength</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-accent" />
                    AI Insights
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="text-sm">Your recovery score is optimal for high-intensity training today.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2"></div>
                      <div className="text-sm">Weather forecast suggests indoor workout for Thursday.</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Social Feed
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Alex completed a 5K run!</div>
                        <div className="text-xs text-muted-foreground">2 hours ago</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Sarah hit a 7-day streak!</div>
                        <div className="text-xs text-muted-foreground">4 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-primary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Ask me anything... 'Schedule cardio when weather is good this week'"
                    className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                  />
                </div>
                <Button size="sm" variant="wellness">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </WellnessCard>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Revolutionize Your Fitness Journey?
          </h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Join the future of AI-powered fitness automation and intelligent health management
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              variant="motivation" 
              size="lg" 
              className="text-lg px-12 py-4 h-auto bg-white text-primary hover:bg-white/90"
              onClick={handleStartFitnessJourney}
            >c
              Start Your Fitness Revolution
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto border-white/30 text-white hover:bg-white/10">
              Get Early Access Updates
            </Button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Secure
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Privacy-Focused
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI-Powered
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Free to Start
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
