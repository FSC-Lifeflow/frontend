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
 * Register Component
 * Handles user registration with email/password and Google OAuth.
 * Includes form validation, password visibility toggle, and error handling.
 */
const Register = () => {
  // State for form data with default empty values
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // UI state management
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Get authentication methods from AuthContext
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles input field changes and updates the form state
   * @param e - The change event from the input field
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Handles form submission for email/password registration
   * @param e - The form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side form validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎯 Attempting to register user:', formData.email);
      // Call the register function from AuthContext
      await register({
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });
      
      // Show success message and redirect to dashboard
      setSuccess('Account created successfully! Redirecting to dashboard...');
      console.log('✅ Registration successful, navigating to dashboard');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Google OAuth registration/sign-in
   */
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Initiate Google OAuth flow
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Google sign in error:', err);
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        {/* Registration card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Start Your Fitness Journey
            </CardTitle>
            <CardDescription>
              Create your account to begin transforming your health
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Registration form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username input */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="border-primary/20 focus:border-primary"
                  placeholder="Choose a unique username"
                />
              </div>
              
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Email input */}
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
              
              {/* Password input with visibility toggle */}
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
              
              {/* Confirm password input with visibility toggle */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="border-primary/20 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Error message display */}
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              {/* Success message display */}
              {success && (
                <div className="text-green-500 text-sm text-center bg-green-50 p-3 rounded-md">
                  {success}
                </div>
              )}
              
              {/* Submit button */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-motivation hover:opacity-90 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            
            {/* Google OAuth registration option */}
            <div className="mt-6 text-center">
              <Button 
                type="button" 
                className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? 'Registering with Google...' : 'Register with Google'}
              </Button>
            </div>
            
            {/* Link to sign-in page */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/signin" className="text-primary hover:text-primary/80 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
