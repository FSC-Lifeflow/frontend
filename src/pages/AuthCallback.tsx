// Import necessary React hooks and dependencies
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * AuthCallback Component
 * Handles the OAuth callback after a user signs in with an external provider (e.g., Google).
 * This component processes the authentication response, stores the received token,
 * and redirects the user based on their profile completion status.
 */
const AuthCallback = () => {
  // Hook for programmatic navigation
  const navigate = useNavigate();
  // State to track loading status during OAuth processing
  const [isLoading, setIsLoading] = useState(true);

  // Effect hook to handle the OAuth callback when the component mounts
  useEffect(() => {
    /**
     * Handles the OAuth callback process
     * 1. Processes the OAuth response
     * 2. Stores the authentication token
     * 3. Checks if the user's profile is complete
     * 4. Redirects to the appropriate route based on profile status
     */
    const handleCallback = async () => {
      try {
        // Process the OAuth callback and get user data and token
        const { user, token } = await authService.handleOAuthCallback();
        
        // Store the authentication token in localStorage for future requests
        localStorage.setItem('auth_token', token);
        
        // Check if the user has completed their profile by verifying required fields
        const isProfileComplete = user.username && user.first_name && user.last_name;
        
        if (isProfileComplete) {
          // If profile is complete, redirect to dashboard
          navigate('/dashboard');
        } else {
          // If profile is incomplete, redirect to complete-profile page
          navigate('/complete-profile');
        }
      } catch (error) {
        // Log error and redirect to sign-in page with error state
        console.error('OAuth callback error:', error);
        navigate('/signin?error=oauth_failed');
      } finally {
        // Always set loading to false when the process completes
        setIsLoading(false);
      }
    };

    // Execute the callback handler
    handleCallback();
  }, [navigate]);

  // Show loading state while processing OAuth callback
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center">
        <div className="text-center">
          {/* Animated loading spinner */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  // Return null when not in loading state (handles brief flash before navigation)
  return null;
};

export default AuthCallback;
