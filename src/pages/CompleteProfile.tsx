// Import necessary React hooks and components
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * CompleteProfile Component
 * Handles the profile completion flow for new users or users with incomplete profiles.
 * This component collects missing user information (username, first name, last name)
 * and updates the user's profile in the database.
 */
const CompleteProfile = () => {
  // State for form data with default empty values
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: ''
  });
  
  const [error, setError] = useState('');        
  const [isLoading, setIsLoading] = useState(false); 
  
  // Tracks which fields are missing from the user's profile
  const [missingFields, setMissingFields] = useState({
    username: false,
    firstName: false,
    lastName: false
  });
  
  // Get current user data from Auth context
  const { user } = useAuth();
  const navigate = useNavigate();

  // Effect hook to handle initial setup when component mounts or user changes
  useEffect(() => {
    // Redirect to sign-in if user is not authenticated
    if (!user) {
      navigate('/signin');
      return;
    }
    
    // Determine which required fields are missing from the user's profile
    const missing = {
      username: !user.username || user.username.trim() === '',
      firstName: !user.first_name || user.first_name.trim() === '',
      lastName: !user.last_name || user.last_name.trim() === ''
    };

    setMissingFields(missing);

    // If no fields are missing, redirect to dashboard
    if (!missing.username && !missing.firstName && !missing.lastName) {
      navigate('/dashboard');
      return;
    }
    
    // Pre-fill form with existing user data (if any)
    setFormData({
      username: user.username || '',
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    });
  }, [user, navigate]);

  // Handle input field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate only fields that are required and missing
    if (missingFields.username && formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (missingFields.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (missingFields.firstName && !formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (missingFields.lastName && !formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare updates object with only the fields that need to be updated
      const updates: any = {};
      if (missingFields.username) updates.username = formData.username;
      if (missingFields.firstName) updates.first_name = formData.firstName;
      if (missingFields.lastName) updates.last_name = formData.lastName;

      // Update user profile with the new information
      await authService.updateUserProfile(user!.id, updates);
      
      // Force a page reload to update the auth context with new user data
      window.location.reload();
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Profile completion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if user is not loaded yet (will redirect in useEffect)
  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Welcome to Your Fitness Journey!
            </CardTitle>
            <CardDescription>
              Let's complete your profile to get you started
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username field - only shown if username is missing */}
              {missingFields.username && (
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
              )}
              
              {/* Name fields - only shown if either first or last name is missing */}
              {(missingFields.firstName || missingFields.lastName) && (
                <div className="grid grid-cols-2 gap-4">
                  {missingFields.firstName && (
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
                  )}
                  {missingFields.lastName && (
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
                  )}
                </div>
              )}
              
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
                {isLoading ? 'Completing Profile...' : 'Complete Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;
