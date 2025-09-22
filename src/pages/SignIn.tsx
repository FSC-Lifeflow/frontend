// Import necessary React hooks and components
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

/**
 * SignIn Component
 * Handles user authentication including email/password and Google OAuth sign-in
 */
const SignIn = () => {
  // State for form data and UI controls
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Get authentication methods from AuthContext
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Handle input field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission for email/password sign-in
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic form validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎯 Attempting to sign in user:', formData.email);
      await login(formData.email, formData.password);
      console.log('✅ Sign in successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      console.log('✅ Google sign in successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Google sign in error:', err);
      setError(err instanceof Error ? err.message : 'Google sign in failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    // Main container with gradient background
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        {/* Sign-in card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to continue your fitness journey
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Email/Password Sign-in Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              
              {/* Password Input with Toggle */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="border-primary/20 focus:border-primary pr-10"
                  />
                  {/* Password visibility toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Error message display */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              {/* Submit button */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-motivation hover:opacity-90 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            {/* Registration link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:text-primary/80 font-medium">
                  Create one here
                </Link>
              </p>
            </div>
            
            {/* Google Sign-in Button */}
            <div className="mt-6 text-center">
              <Button 
                type="button" 
                className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? 'Signing in with Google...' : 'Sign In with Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
