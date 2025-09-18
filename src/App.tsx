import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Onboarding } from "./components/Onboarding";
import { Dashboard } from "./components/Dashboard";
import { Navigation } from "./components/Navigation";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useIsMobile } from "./hooks/use-mobile";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Settings from "./pages/Settings";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [isOnboarded, setIsOnboarded] = useState(true); // Set to true for development
  const isMobile = useIsMobile();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isOnboarded) {
    return <Onboarding onComplete={() => setIsOnboarded(true)} />;
  }

  return (
    <div className="flex min-h-screen w-full">
      {user && <Navigation />}
      <main className={`flex-1 ${!isMobile && user ? 'ml-64' : ''} ${isMobile ? 'mt-16 mb-16' : ''}`}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
          <Route path="/signin" element={!user ? <SignIn /> : <Navigate to="/dashboard" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute redirectPath="/" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/social" element={<Social />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
