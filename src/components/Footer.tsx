import React, { useEffect, useState } from 'react';
import { Globe, Github, Linkedin, Twitter, AtSign, Calendar, Clock, Users, BarChart2 } from 'lucide-react';
import { app } from '../config/firebase';
import { getDatabase, ref, onValue, increment, update } from 'firebase/database';
import logger from '../utils/logger';

// Type definitions
interface FooterProps {
  darkMode: boolean;
}

interface ViewStats {
  total: number;
  today: number;
  week: number;
  month: number;
}

const Footer: React.FC<FooterProps> = ({ darkMode }) => {
  const [viewStats, setViewStats] = useState<ViewStats>({
    total: 0,
    today: 0,
    week: 0,
    month: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase database
  const database = getDatabase(app);

  // Fetch statistics from Firebase
  useEffect(() => {
    const fetchStats = () => {
      try {
        const statsRef = ref(database, 'stats/views');
        
        // Listen for changes to stats
        const unsubscribe = onValue(statsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setViewStats({
              total: data.total || 0,
              today: data.today || 0,
              week: data.week || 0,
              month: data.month || 0
            });
          } else {
            // If no data exists, initialize with zeros
            const initialStats = { total: 0, today: 0, week: 0, month: 0 };
            setViewStats(initialStats);
            // Create initial stats in Firebase
            update(statsRef, initialStats);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching view stats:", error);
          setError("Failed to load statistics");
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up view stats listener:", error);
        setError("Failed to connect to statistics service");
        setLoading(false);
        return () => {};
      }
    };
    
    const cleanup = fetchStats();
    return () => cleanup();
  }, [database]);

  // Record a page view
  useEffect(() => {
    const recordPageView = async () => {
      try {
        // Check if user has already been counted using their IP
        const visitorKey = 'visitor-counted';
        const lastVisitDate = localStorage.getItem(visitorKey);
        const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
        
        // If user hasn't been counted today or there's no record, count them
        if (lastVisitDate !== today) {
          const statsRef = ref(database, 'stats/views');
          
          // Increment view counts
          await update(statsRef, {
            total: increment(1),
            today: increment(1),
            week: increment(1),
            month: increment(1)
          });
          
          // Store the date when user was counted
          localStorage.setItem(visitorKey, today);
          logger.log('analytics', "Page view recorded successfully");
        } else {
          logger.log('analytics', "User already counted today");
        }
      } catch (error) {
        logger.error('analytics', "Error recording page view:", error);
      }
    };
    
    // Only record view if Firebase is initialized
    if (database) {
      recordPageView();
    }
    
    // Clean up daily, weekly, and monthly counts
    const checkDateResets = () => {
      const now = new Date();
      const todayKey = `reset-daily-${now.toISOString().split('T')[0]}`;
      const weekKey = `reset-weekly-${Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
      const monthKey = `reset-monthly-${now.getFullYear()}-${now.getMonth()}`;
      
      // Reset daily counter if needed
      if (!localStorage.getItem(todayKey)) {
        // Clear previous keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('reset-daily-') && key !== todayKey) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.setItem(todayKey, 'true');
        
        // Reset daily counter in Firebase
        if (database) {
          update(ref(database, 'stats/views'), { today: 0 });
        }
      }
      
      // Reset weekly counter if needed
      if (!localStorage.getItem(weekKey)) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('reset-weekly-') && key !== weekKey) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.setItem(weekKey, 'true');
        
        // Reset weekly counter in Firebase
        if (database) {
          update(ref(database, 'stats/views'), { week: 0 });
        }
      }
      
      // Reset monthly counter if needed
      if (!localStorage.getItem(monthKey)) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('reset-monthly-') && key !== monthKey) {
            localStorage.removeItem(key);
          }
        });
        
        localStorage.setItem(monthKey, 'true');
        
        // Reset monthly counter in Firebase
        if (database) {
          update(ref(database, 'stats/views'), { month: 0 });
        }
      }
    };
    
    checkDateResets();
  }, [database]);

  // Format large numbers (e.g., 1.5M, 2.3K)
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };

  return (
    <footer className={`py-12 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} relative isolate z-20`}>
      <div className="absolute inset-0 -z-10"></div>
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Social Links */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Connect</h3>
            <div className="space-y-2">
              <a 
                href="https://github.com/Vikash888" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-300`}
              >
                <Github className="w-5 h-5 mr-2" />
                <span>GitHub</span>
              </a>
              <a 
                href="https://linkedin.com/in/vikashmca" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-300`}
              >
                <Linkedin className="w-5 h-5 mr-2" />
                <span>LinkedIn</span>
              </a>
              <a 
                href="https://x.com/VIKASHJ61079581" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-300`}
              >
                <Twitter className="w-5 h-5 mr-2" />
                <span>Twitter</span>
              </a>
              <a 
                href="mailto:vikash.jmbox@gmail.com" 
                className={`flex items-center ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-300`}
              >
                <AtSign className="w-5 h-5 mr-2" />
                <span>Email</span>
              </a>
            </div>
          </div>
          
          {/* Stats */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <div className="flex items-center">
                <BarChart2 className="w-5 h-5 mr-2" />
                <span>Visitor Statistics</span>
              </div>
            </h3>
            {loading ? (
              <div className={`animate-pulse rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            ) : error ? (
              <div className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'} p-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20`}>
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Today</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatNumber(viewStats.today)}
                    <span className="text-xs ml-1 font-normal text-gray-500">views</span>
                  </div>
                </div>
                <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>This Week</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatNumber(viewStats.week)}
                    <span className="text-xs ml-1 font-normal text-gray-500">views</span>
                  </div>
                </div>
                <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>This Month</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatNumber(viewStats.month)}
                    <span className="text-xs ml-1 font-normal text-gray-500">views</span>
                  </div>
                </div>
                <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Users className="w-3 h-3 mr-1" />
                    <span>All Time</span>
                  </div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatNumber(viewStats.total)}
                    <span className="text-xs ml-1 font-normal text-gray-500">views</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>About</h3>
            <p className={`text-sm text-justify ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
I'm passionate about building smart, real-world apps. I love digging into problems, analyzing them deeply, and crafting unique solutions with clean, user-focused design-turning ideas into impactful, intuitive experiences.
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-start">
                <Globe className={`w-4 h-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Coimbatore, India
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className={`text-sm text-center sm:text-left ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © {new Date().getFullYear()} Vikash J. All rights reserved.
            </p>
            <div className="mt-4 sm:mt-0">
              <p className={`text-xs text-center sm:text-right ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Designed and developed with ❤️ By Vikash J
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

