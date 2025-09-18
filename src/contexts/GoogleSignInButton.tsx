import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { FaGoogle } from "react-icons/fa"
import { Loader2 } from "lucide-react"
import { useToast } from '@/components/ui/use-toast';

export default function GoogleLoginButton() {
  const { signInWithGoogle, user, error, clearError } = useAuth();
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const { toast } = useToast();

  if (user) {
    return null; // Don't show button if user is already logged in
  }

  const handleSignIn = async () => {
    try {
      setIsLocalLoading(true);
      clearError();
      await signInWithGoogle();
    } catch (error) {
      // Error is already handled in the auth context
      console.error('Google sign in error:', error);
    } finally {
      setIsLocalLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleSignIn}
        disabled={isLocalLoading}
        className="flex items-center justify-center gap-2 w-full"
        variant="outline"
      >
        {isLocalLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <FaGoogle className="w-4 h-4" />
            Sign in with Google
          </>
        )}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
