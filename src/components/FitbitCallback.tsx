import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFitbit } from '@/hooks/useFitbit';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export function FitbitCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useFitbit();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Fitbit OAuth error:', error);
      // Redirect back to dashboard with error
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    if (code && state) {
      handleCallback(code, state).then(() => {
        // Redirect back to dashboard after successful authentication
        setTimeout(() => navigate('/'), 2000);
      }).catch((error) => {
        console.error('Callback handling error:', error);
        setTimeout(() => navigate('/'), 3000);
      });
    } else {
      // No code or state, redirect back
      navigate('/');
    }
  }, [searchParams, handleCallback, navigate]);

  const error = searchParams.get('error');
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        {error ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground mb-4">
              There was an error connecting to your Fitbit account: {error}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting back to dashboard...
            </p>
          </>
        ) : code ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Your Fitbit account has been connected successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting back to dashboard...
            </p>
          </>
        ) : (
          <>
            <RefreshCw className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Connecting to Fitbit</h2>
            <p className="text-muted-foreground">
              Processing your authentication...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
