import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [missingFields, setMissingFields] = useState({
    username: false,
    firstName: false,
    lastName: false
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is not logged in, redirect
    if (!user) {
      navigate('/signin');
      return;
    }
    
    // Determine which fields are missing
    const missing = {
      username: !user.username || user.username.trim() === '',
      firstName: !user.first_name || user.first_name.trim() === '',
      lastName: !user.last_name || user.last_name.trim() === ''
    };

    setMissingFields(missing);

    // If all fields are complete, redirect to dashboard
    if (!missing.username && !missing.firstName && !missing.lastName) {
      navigate('/dashboard');
      return;
    }
    
    // Pre-fill form with existing data
    setFormData({
      username: user.username || '',
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    });
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate only missing fields
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
      // Only update fields that were missing
      const updates: any = {};
      if (missingFields.username) updates.username = formData.username;
      if (missingFields.firstName) updates.first_name = formData.firstName;
      if (missingFields.lastName) updates.last_name = formData.lastName;

      await authService.updateUserProfile(user!.id, updates);
      
      // Refresh user data in context
      window.location.reload();
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Profile completion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  };

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
              
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
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
