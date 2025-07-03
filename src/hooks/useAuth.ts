import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let unsubscribe = () => {};
    
    // Set timeout to handle cases where Firebase might hang
    timeoutId = setTimeout(() => {
      if (authState.loading) {
        console.warn('Auth timeout - Firebase might not be initialized correctly');
        setAuthState({
          user: null,
          loading: false,
          error: 'Authentication service timed out. Please refresh the page.'
        });
      }
    }, 5000);

    // Check if auth is available (Firebase initialized correctly)
    if (!auth) {
      console.warn('Auth service is not available');
      setAuthState({
        user: null,
        loading: false,
        error: 'Authentication service is not available. Some features may be limited.'
      });
      clearTimeout(timeoutId);
      return () => {};
    }

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setAuthState({
            user,
            loading: false,
            error: null
          });
          clearTimeout(timeoutId);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setAuthState({
            user: null,
            loading: false,
            error: `Authentication error: ${error.message}`
          });
          clearTimeout(timeoutId);
        }
      );
    } catch (error: any) {
      console.error('Error setting up auth listener:', error);
      setAuthState({
        user: null,
        loading: false,
        error: `Failed to initialize authentication: ${error.message}`
      });
      clearTimeout(timeoutId);
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return authState;
};