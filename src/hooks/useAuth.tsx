import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({
          user,
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error('Auth state change error:', error);
        setState({
          user: null,
          loading: false,
          error: error.message,
        });
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return state;
};
