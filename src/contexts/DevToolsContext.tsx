import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface DevToolsContextType {
  isDevToolsBlocked: boolean;
  toggleDevToolsBlocking: () => Promise<void>;
  devToolsAttempts: number;
  loading: boolean;
  error: string | null;
}

const DevToolsContext = createContext<DevToolsContextType | undefined>(undefined);

export const DevToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDevToolsBlocked, setIsDevToolsBlocked] = useState(false);
  const [devToolsAttempts, setDevToolsAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevToolsStatus = async () => {
      try {
        setLoading(true);
        
        // Get DevTools protection status
        const devToolsSettingsRef = ref(database, 'settings/devTools');
        const devToolsSettingsSnapshot = await get(devToolsSettingsRef);
        const isBlocked = devToolsSettingsSnapshot.exists() ? devToolsSettingsSnapshot.val().blocked : false;
        setIsDevToolsBlocked(isBlocked);
        
        // Get dev tools attempts count
        const devToolsRef = ref(database, 'security/devToolsDetection');
        const devToolsSnapshot = await get(devToolsRef);
        const attemptsCount = devToolsSnapshot.exists() ? Object.keys(devToolsSnapshot.val()).length : 0;
        setDevToolsAttempts(attemptsCount);
        
        setError(null);
      } catch (err) {
        console.error('Error loading dev tools status:', err);
        setError('Failed to load DevTools protection status');
      } finally {
        setLoading(false);
      }
    };

    loadDevToolsStatus();
    
    // Subscribe to changes in DevTools settings
    const devToolsRef = ref(database, 'settings/devTools');
    const unsubscribe = onValue(devToolsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsDevToolsBlocked(data.blocked || false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const toggleDevToolsBlocking = async () => {
    try {
      setLoading(true);
      const newState = !isDevToolsBlocked;
      
      await set(ref(database, 'settings/devTools'), {
        blocked: newState,
        updatedAt: Date.now()
      });
      
      setIsDevToolsBlocked(newState);
      setError(null);
    } catch (err) {
      console.error('Error toggling dev tools blocking:', err);
      setError('Failed to update DevTools protection status');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isDevToolsBlocked,
    toggleDevToolsBlocking,
    devToolsAttempts,
    loading,
    error
  };

  return (
    <DevToolsContext.Provider value={value}>
      {children}
    </DevToolsContext.Provider>
  );
};

export const useDevTools = () => {
  const context = useContext(DevToolsContext);
  if (context === undefined) {
    throw new Error('useDevTools must be used within a DevToolsProvider');
  }
  return context;
};
