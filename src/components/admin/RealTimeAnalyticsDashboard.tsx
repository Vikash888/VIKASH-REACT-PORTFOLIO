import React, { useEffect, useState, useCallback } from 'react';
import { 
  subscribeToActiveUsers, 
  trackActiveUser, 
  startAutoCleanup,
  debugAndFixActiveUsers
} from '../../services/activeUsersService';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { ref, onValue, getDatabase } from 'firebase/database';
import { app } from '../../config/firebase';
import { Users, Activity, Globe, Clock, Monitor, Smartphone, Tablet } from 'lucide-react';

interface ActiveUserStats {
  current: number;
  history: {
    count: number;
    timestamp: number;
  }[];
}

interface DeviceBreakdown {
  Desktop: number;
  Mobile: number;
  Tablet: number;
}

interface BrowserBreakdown {
  [key: string]: number;
}

interface PageViewBreakdown {
  [key: string]: number;
}

interface LocationBreakdown {
  [key: string]: number;
}

interface SessionData {
  activeDuration: number;
  count: number;
}

const RealTimeAnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<ActiveUserStats>({ current: 0, history: [] });
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown>({ Desktop: 0, Mobile: 0, Tablet: 0 });
  const [browserBreakdown, setBrowserBreakdown] = useState<BrowserBreakdown>({});
  const [pageViewBreakdown, setPageViewBreakdown] = useState<PageViewBreakdown>({});
  const [locationBreakdown, setLocationBreakdown] = useState<LocationBreakdown>({});
  const [sessionsData, setSessionsData] = useState<SessionData>({ activeDuration: 0, count: 0 });
  const [peakUsers, setPeakUsers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Responsive grid layout based on screen size
  const [gridLayout, setGridLayout] = useState<string>('grid-cols-1 md:grid-cols-2 lg:grid-cols-4');
  
  // Update grid layout based on window size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setGridLayout('grid-cols-1');
      } else if (width < 1024) {
        setGridLayout('grid-cols-2');
      } else {
        setGridLayout('grid-cols-4');
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize on load
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Firebase database reference
  const database = getDatabase(app);
  
  // Format timestamp for chart labels
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);
  
  // Format duration in seconds to MM:SS
  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Fetch device breakdown data
  const fetchDeviceBreakdown = useCallback(() => {
    const activeUsersRef = ref(database, 'activeUsers');
    onValue(activeUsersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = Date.now();
      
      // Filter for active users with activity in the last 30 seconds AND proper user data
      const activeUsers = Object.values(data).filter((user: any) => {
        if (!user || !user.lastActivity) return false;
        const timeSinceActivity = now - user.lastActivity;
        
        // Strict validation to ensure these are actual tracked users
        return user.active && 
               timeSinceActivity < 30000 && // 30 seconds
               typeof user.sessionId === 'string' &&
               typeof user.visitorId === 'string' &&
               typeof user.browser === 'string' &&
               typeof user.device === 'string';
      });
      
      // Deduplicate by visitorId
      const uniqueUsersMap = new Map();
      activeUsers.forEach((user: any) => {
        if (user.visitorId) {
          uniqueUsersMap.set(user.visitorId, user);
        }
      });
      const uniqueActiveUsers = Array.from(uniqueUsersMap.values());

      // Use only uniqueActiveUsers for all breakdowns
      // Count by device type
      const deviceCounts: DeviceBreakdown = { Desktop: 0, Mobile: 0, Tablet: 0 };
      uniqueActiveUsers.forEach((user: any) => {
        if (user.device) {
          deviceCounts[user.device as keyof DeviceBreakdown] = 
            (deviceCounts[user.device as keyof DeviceBreakdown] || 0) + 1;
        }
      });
      setDeviceBreakdown(deviceCounts);

      // Count by browser
      const browserCounts: BrowserBreakdown = {};
      uniqueActiveUsers.forEach((user: any) => {
        if (user.browser) {
          browserCounts[user.browser] = (browserCounts[user.browser] || 0) + 1;
        }
      });
      setBrowserBreakdown(browserCounts);

      // Count by page
      const pageCounts: PageViewBreakdown = {};
      uniqueActiveUsers.forEach((user: any) => {
        if (user.page) {
          const displayPath = user.page === '/' ? 'Home' : user.page;
          pageCounts[displayPath] = (pageCounts[displayPath] || 0) + 1;
        }
      });
      setPageViewBreakdown(pageCounts);

      // Count by location
      const locationCounts: LocationBreakdown = {};
      uniqueActiveUsers.forEach((user: any) => {
        if (user.country) {
          locationCounts[user.country] = (locationCounts[user.country] || 0) + 1;
        }
      });
      setLocationBreakdown(locationCounts);

      // Calculate average active session duration
      let totalDuration = 0;
      let activeSessions = 0;
      uniqueActiveUsers.forEach((user: any) => {
        if (user.timestamp && user.lastActivity) {
          const duration = (user.lastActivity - user.timestamp) / 1000; // in seconds
          if (duration > 0) {
            totalDuration += duration;
            activeSessions++;
          }
        }
      });
      const avgDuration = activeSessions > 0 ? totalDuration / activeSessions : 0;
      setSessionsData({
        activeDuration: avgDuration,
        count: activeSessions
      });
    });
  }, [database]);

  useEffect(() => {
    let cleanupTrackingFn: (() => void) | undefined;
    
    const initializeDashboard = async () => {
      try {
        // Run a quick cleanup first to fix any stale data issues
        console.log("Running initial cleanup to fix count issues...");
        await debugAndFixActiveUsers();
        
        // Start tracking this user as active
        trackActiveUser().then(cleanup => {
          cleanupTrackingFn = cleanup;
        });
        
        // Start auto cleanup of inactive users
        const cleanupAutoCleanup = startAutoCleanup();
        
        // Subscribe to active user updates
        const unsubscribe = subscribeToActiveUsers((newStats) => {
          setStats(newStats);
          setLoading(false);
          
          // Update peak users if current count is higher
          if (newStats.current > peakUsers) {
            setPeakUsers(newStats.current);
          }
        });
        
        // Fetch additional real-time data
        fetchDeviceBreakdown();
        
        return () => {
          // Cleanup when component unmounts
          unsubscribe();
          if (cleanupTrackingFn) cleanupTrackingFn();
          cleanupAutoCleanup();
        };
      } catch (error) {
        console.error("Error initializing dashboard:", error);
      }
    };
    
    // Run the initialization
    const cleanup = initializeDashboard();
    
    return () => {
      // This is wrapped in a Promise now, so we need to handle it differently
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [fetchDeviceBreakdown, peakUsers]);
  
  // Chart data for line chart
  const lineChartData = {
    labels: stats.history.map(item => formatTime(item.timestamp)),
    datasets: [
      {
        label: 'Active Users',
        data: stats.history.map(item => item.count),
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        tension: 0.4,
        pointRadius: 1,
        pointHoverRadius: 5,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // No animation for real-time updates
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // Only show whole numbers
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
  };

  // Chart data for device breakdown
  const deviceChartData = {
    labels: Object.keys(deviceBreakdown),
    datasets: [
      {
        data: Object.values(deviceBreakdown),
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgba(79, 70, 229, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for browser breakdown
  const browserChartData = {
    labels: Object.keys(browserBreakdown),
    datasets: [
      {
        label: 'Browser Usage',
        data: Object.values(browserBreakdown),
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(14, 165, 233, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)'
        ],
        borderWidth: 0,
      },
    ],
  };

  // Chart data for page views
  const pageViewsChartData = {
    labels: Object.keys(pageViewBreakdown).slice(0, 5),
    datasets: [
      {
        label: 'Active Users',
        data: Object.values(pageViewBreakdown).slice(0, 5),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pageViewsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    animation: {
      duration: 0
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    animation: {
      duration: 0
    }
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden flex flex-col rounded-xl shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/10 z-0"></div>
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Real-Time Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">Live updates with second-by-second precision</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Debug button */}
          <button 
            onClick={async () => {
              await debugAndFixActiveUsers();
              alert("Database cleaned and fixed. Dashboard will refresh with accurate numbers.");
              window.location.reload();
            }}
            className="bg-amber-600/70 hover:bg-amber-500/70 text-white px-3 py-2 text-sm rounded-lg transition"
          >
            Fix Count Issues
          </button>
          
          <div className="bg-indigo-600/30 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-indigo-200">Currently Online</span>
              <span className="text-3xl font-bold flex items-center">
                {loading ? '...' : stats.current}
                <div className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className={`relative z-10 grid ${gridLayout} gap-5 px-6`}>
        {/* Peak users today */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl flex items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-700/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Peak Visitors</p>
            <p className="text-xl font-semibold">{peakUsers}</p>
          </div>
        </div>
        
        {/* Average session duration */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-700/30 flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Avg. Session</p>
            <p className="text-xl font-semibold">{formatDuration(sessionsData.activeDuration)}</p>
          </div>
        </div>
        
        {/* Live sessions */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-700/30 flex items-center justify-center">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Active Sessions</p>
            <p className="text-xl font-semibold">{sessionsData.count}</p>
          </div>
        </div>
        
        {/* Top country */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl flex items-center">
          <div className="w-10 h-10 rounded-full bg-emerald-700/30 flex items-center justify-center">
            <Globe className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="ml-4">
            <p className="text-gray-400 text-sm">Top Location</p>
            <p className="text-xl font-semibold">
              {Object.keys(locationBreakdown).length > 0 
                ? Object.entries(locationBreakdown).sort((a, b) => b[1] - a[1])[0][0]
                : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Main chart */}
      <div className="relative z-10 p-6">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl w-full p-4 shadow-xl">
          <h3 className="text-lg font-medium mb-4">Live Visitor Trend</h3>
          <div className="h-64">
            {stats.history.length > 0 ? (
              <Line 
                data={lineChartData} 
                options={lineChartOptions}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">Collecting data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Charts grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 pb-6">
        {/* Device breakdown */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl">
          <h3 className="text-lg font-medium mb-4">Device Distribution</h3>
          <div className="h-56">
            {Object.values(deviceBreakdown).some(val => val > 0) ? (
              <Doughnut 
                data={deviceChartData} 
                options={chartOptions} 
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="flex gap-4 mb-4">
                  <div className="flex gap-2 items-center">
                    <Monitor className="w-5 h-5 text-indigo-400" />
                    <span className="text-gray-400 text-sm">Desktop: 0</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Smartphone className="w-5 h-5 text-amber-400" />
                    <span className="text-gray-400 text-sm">Mobile: 0</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Tablet className="w-5 h-5 text-emerald-400" />
                    <span className="text-gray-400 text-sm">Tablet: 0</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">No device data yet</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Browser breakdown */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl">
          <h3 className="text-lg font-medium mb-4">Browser Distribution</h3>
          <div className="h-56">
            {Object.keys(browserBreakdown).length > 0 ? (
              <Doughnut 
                data={browserChartData} 
                options={chartOptions} 
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">No browser data yet</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Active pages */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-xl">
          <h3 className="text-lg font-medium mb-4">Currently Viewed Pages</h3>
          <div className="h-56">
            {Object.keys(pageViewBreakdown).length > 0 ? (
              <Bar 
                data={pageViewsChartData} 
                options={pageViewsOptions} 
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">No page view data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <div className="relative z-10 px-6 pb-6">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-xs">
              Live updates every few seconds. Users are considered active if they've interacted with the site in the last 30 seconds.
            </p>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-green-400 text-xs">Real-time monitoring active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalyticsDashboard;
