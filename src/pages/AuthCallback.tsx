import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { user, token } = await authService.handleOAuthCallback();
        
        // Store token
        localStorage.setItem('auth_token', token);
        
        // Check if profile is complete
        const isProfileComplete = user.username && user.first_name && user.last_name;
        
        if (isProfileComplete) {
          // Profile is complete, go to dashboard
          navigate('/dashboard');
        } else {
          // Profile needs completion
          navigate('/complete-profile');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/signin?error=oauth_failed');
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
