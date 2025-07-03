import React, { useEffect, useState } from 'react';
import { subscribeToActiveUsers, trackActiveUser, startAutoCleanup } from '../../services/activeUsersService';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

interface ActiveUserStats {
  current: number;
  history: {
    count: number;
    timestamp: number;
  }[];
}

const ActiveUsersLive: React.FC = () => {
  const [stats, setStats] = useState<ActiveUserStats>({ current: 0, history: [] });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cleanupTrackingFn: (() => void) | undefined;
    
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
    });
    
    return () => {
      // Cleanup when component unmounts
      unsubscribe();
      if (cleanupTrackingFn) cleanupTrackingFn();
      cleanupAutoCleanup();
    };
  }, []);
  
  // Format timestamp for chart labels
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Chart data and options
  const chartData = {
    labels: stats.history.map(item => formatTime(item.timestamp)),
    datasets: [
      {
        label: 'Active Users',
        data: stats.history.map(item => item.count),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // No animation for real-time updates for better performance
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
          maxTicksLimit: 10,
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

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden flex flex-col rounded-xl shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 z-0"></div>
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4">
        <h2 className="text-xl font-bold tracking-tight">Live Visitors</h2>
        <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-blue-200">Currently Online</span>
            <span className="text-2xl font-bold flex items-center">
              {loading ? '...' : stats.current}
              <div className="ml-2 h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="flex-1 relative z-10 p-4">
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl h-full w-full p-4 shadow-xl">
          <div className="h-full">
            {stats.history.length > 0 ? (
              <Line 
                data={chartData} 
                options={chartOptions}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">Collecting data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <div className="relative z-10 p-3">
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-3 shadow-lg">
          <p className="text-gray-300 text-xs">
            Live updates every few seconds. Users are considered active if they've interacted with the site in the last 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersLive;
