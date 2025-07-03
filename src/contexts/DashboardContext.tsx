import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../config/firebase';

interface DashboardStats {
  totalViews: number;
  uniqueVisitors: number;
  projects: number;
  messages: number;
  tasks: number;
  notifications: number;
}

interface DashboardContextType {
  sidebarOpen: boolean;
  collapsed: boolean;
  toggleSidebar: () => void;
  dashboardTheme: 'default' | 'minimal' | 'modern';
  setDashboardTheme: (theme: 'default' | 'minimal' | 'modern') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  isMaintenanceMode: boolean;
  isLoadingMaintenance: boolean;
  maintenanceEndTime: string;
  toggleMaintenanceMode: (value: boolean, message: string, allowAdmin: boolean, endTime: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardTheme, setDashboardTheme] = useState<'default' | 'minimal' | 'modern'>('default');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(true);
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalViews: 0,
    uniqueVisitors: 0,
    projects: 0,
    messages: 0,
    tasks: 0,
    notifications: 0,
  });

  useEffect(() => {
    // Check system dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }

    // Load saved preferences
    const savedTheme = localStorage.getItem('dashboardTheme');
    if (savedTheme) {
      setDashboardTheme(savedTheme as 'default' | 'minimal' | 'modern');
    }

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('dashboardTheme', dashboardTheme);
  }, [dashboardTheme]);

  // Load maintenance mode status
  useEffect(() => {
    const loadMaintenanceStatus = async () => {
      try {
        setIsLoadingMaintenance(true);
        const maintenanceRef = ref(database, 'maintenance');
        const snapshot = await get(maintenanceRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setIsMaintenanceMode(data.enabled || false);
          setMaintenanceEndTime(data.endTime || '');
        } else {
          // Initialize maintenance settings if they don't exist
          // Set default end time to 2 hours from now
          const defaultEndTime = new Date();
          defaultEndTime.setHours(defaultEndTime.getHours() + 2);
          const endTimeString = defaultEndTime.toISOString();

          await set(ref(database, 'maintenance'), {
            enabled: false,
            message: "We're currently updating our site to bring you a better experience. Please check back soon!",
            allowAdmin: true,
            endTime: endTimeString,
            updatedAt: Date.now()
          });
          setIsMaintenanceMode(false);
          setMaintenanceEndTime(endTimeString);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading maintenance status:', err);
        setError('Failed to load maintenance status');
      } finally {
        setIsLoadingMaintenance(false);
      }
    };

    loadMaintenanceStatus();
  }, []);

  // Mock data fetching - replace with actual API calls
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Simulate API call
        const response = await new Promise<DashboardStats>((resolve) => {
          setTimeout(() => {
            resolve({
              totalViews: 15432,
              uniqueVisitors: 8721,
              projects: 24,
              messages: 13,
              tasks: 8,
              notifications: 5,
            });
          }, 1000);
        });
        setStats(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    setSidebarOpen(true);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMaintenanceMode = async (value: boolean, message: string, allowAdmin: boolean, endTime: string) => {
    try {
      setIsLoadingMaintenance(true);

      await set(ref(database, 'maintenance'), {
        enabled: value,
        message: message,
        allowAdmin: allowAdmin,
        endTime: endTime,
        updatedAt: Date.now()
      });

      setIsMaintenanceMode(value);
      setMaintenanceEndTime(endTime);
      setError(null);
    } catch (err) {
      console.error('Error toggling maintenance mode:', err);
      setError('Failed to update maintenance mode');
      throw err;
    } finally {
      setIsLoadingMaintenance(false);
    }
  };

  const value = {
    sidebarOpen,
    collapsed,
    toggleSidebar,
    dashboardTheme,
    setDashboardTheme,
    isDarkMode,
    toggleDarkMode,
    stats,
    loading,
    error,
    isMaintenanceMode,
    isLoadingMaintenance,
    maintenanceEndTime,
    toggleMaintenanceMode
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const useDashboardTheme = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardTheme must be used within a DashboardProvider');
  }
  return {
    sidebarOpen: context.sidebarOpen,
    collapsed: context.collapsed,
    toggleSidebar: context.toggleSidebar,
    dashboardTheme: context.dashboardTheme,
    setDashboardTheme: context.setDashboardTheme,
    isDarkMode: context.isDarkMode,
    toggleDarkMode: context.toggleDarkMode,
  };
};