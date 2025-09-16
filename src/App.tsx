import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Onboarding } from "./components/Onboarding";
import { Dashboard } from "./components/Dashboard";
import { Navigation } from "./components/Navigation";
import { useIsMobile } from "./hooks/use-mobile";
import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isOnboarded, setIsOnboarded] = useState(true); // Set to true for development
  const isMobile = useIsMobile();

  if (!isOnboarded) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Onboarding onComplete={() => setIsOnboarded(true)} />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing page route - no navigation */}
            <Route path="/landing" element={<Landing />} />
            
            {/* App routes with navigation */}
            <Route path="/*" element={
              <div className="flex min-h-screen w-full">
                <Navigation />
                <main className={`flex-1 ${!isMobile ? 'ml-64' : 'mt-16 mb-16'}`}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/social" element={<Social />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
