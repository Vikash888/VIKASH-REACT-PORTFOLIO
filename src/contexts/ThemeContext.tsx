import { createContext, useState, useEffect, type ReactNode } from 'react';
import logger from '../utils/logger';

// Add types to Window interface
declare global {
  interface Window {
    __THEME_PROVIDER_ACTIVE__?: boolean;
    __THEME_DARK_MODE__?: boolean;
  }
}

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check local storage for saved preference
    const savedMode = localStorage.getItem('darkMode');
    // Check system preference if no saved preference
    if (savedMode === null) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return savedMode === 'true';
  });

  useEffect(() => {
    // Update localStorage when darkMode changes
    localStorage.setItem('darkMode', darkMode.toString());
    
    // Update document class for Tailwind dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Add a flag for testing
    if (typeof window !== 'undefined') {
      window.__THEME_PROVIDER_ACTIVE__ = true;
      window.__THEME_DARK_MODE__ = darkMode;
      logger.debug('theme-debug', 'ThemeContext updated darkMode:', darkMode);
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;