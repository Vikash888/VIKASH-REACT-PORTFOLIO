import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FaGlobe, FaDesktop, FaClock } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Visitor {
  id: string;
  ip: string;
  timestamp: Timestamp;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  device?: {
    browser: string;
    os: string;
    device: string;
  };
  referrer?: string;
  path?: string;
  timeOnPage?: number;
  userAgent?: string;
  screenSize?: {
    width: number;
    height: number;
  };
  language?: string;
}

interface GeoData {
  [country: string]: number;
}

interface DeviceData {
  [device: string]: number;
}

interface BrowserData {
  [browser: string]: number;
}

interface TimeData {
  [hour: string]: number;
}

const VisitorStatistics: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7days');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'realtime'>('overview');
  const [geoData, setGeoData] = useState<GeoData>({});
  const [deviceData, setDeviceData] = useState<DeviceData>({});
  // const [browserData, setBrowserData] = useState<BrowserData>({}); // Commented out as not used
  const [timeData, setTimeData] = useState<TimeData>({});
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    fetchVisitors();
    const interval = setInterval(() => {
      if (viewMode === 'realtime') fetchVisitors();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange, viewMode]);

  const fetchVisitors = async () => {
    if (!db) return;
    
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch(dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const visitorQuery = query(
        collection(db, 'visitors'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );

      const querySnapshot = await getDocs(visitorQuery);
      const visitorList: Visitor[] = [];
      
      querySnapshot.forEach((doc) => {
        visitorList.push({ id: doc.id, ...doc.data() } as Visitor);
      });

      setVisitors(visitorList);
      processVisitorData(visitorList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching visitors: ", err);
      setError("Failed to load visitor data");
      setLoading(false);
    }
  };

  const processVisitorData = (visitorList: Visitor[]) => {
    // Get unique visitors by IP
    const uniqueIPs = new Set(visitorList.map(visitor => visitor.ip));
    setUniqueVisitors(uniqueIPs.size);
    setTotalVisitors(visitorList.length);
    
    // Calculate active visitors in last 5 minutes
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    const activeVisitors = visitorList.filter(
      visitor => visitor.timestamp.toDate() > fiveMinutesAgo
    );
    setActiveNow(activeVisitors.length);

    // Process geographical data
    const geoCount: GeoData = {};
    visitorList.forEach(visitor => {
      if (visitor.location?.country) {
        geoCount[visitor.location.country] = (geoCount[visitor.location.country] || 0) + 1;
      }
    });
    setGeoData(geoCount);

    // Process device data
    const devCount: DeviceData = {};
    visitorList.forEach(visitor => {
      if (visitor.device?.device) {
        const deviceType = visitor.device.device || 'Unknown';
        devCount[deviceType] = (devCount[deviceType] || 0) + 1;
      }
    });
    setDeviceData(devCount);

    // Process browser data
    const browCount: BrowserData = {};
    visitorList.forEach(visitor => {
      if (visitor.device?.browser) {
        browCount[visitor.device.browser] = (browCount[visitor.device.browser] || 0) + 1;
      }
    });
    // setBrowserData(browCount); // Commented out as browserData is not used

    // Process time data
    const timeCount: TimeData = {};
    for (let i = 0; i < 24; i++) {
      timeCount[i.toString()] = 0;
    }
    
    visitorList.forEach(visitor => {
      const hour = visitor.timestamp.toDate().getHours();
      timeCount[hour.toString()] = (timeCount[hour.toString()] || 0) + 1;
    });
    setTimeData(timeCount);
  };

  const viewVisitorDetails = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
  };

  // Charts data
  const geoChartData = {
    labels: Object.keys(geoData),
    datasets: [
      {
        label: 'Visitors by Country',
        data: Object.values(geoData),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const deviceChartData = {
    labels: Object.keys(deviceData),
    datasets: [
      {
        label: 'Visitors by Device',
        data: Object.values(deviceData),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const timeChartData = {
    labels: Object.keys(timeData).sort((a, b) => Number(a) - Number(b)),
    datasets: [
      {
        label: 'Visitors by Hour',
        data: Object.keys(timeData)
          .sort((a, b) => Number(a) - Number(b))
          .map(hour => timeData[hour]),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
  
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="text-2xl font-bold mb-2 md:mb-0">Visitor Analytics</h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          
          <div className="flex border rounded overflow-hidden">
            <button 
              onClick={() => setViewMode('overview')} 
              className={`px-3 py-2 ${viewMode === 'overview' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setViewMode('detailed')} 
              className={`px-3 py-2 ${viewMode === 'detailed' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              Detailed
            </button>
            <button 
              onClick={() => setViewMode('realtime')} 
              className={`px-3 py-2 ${viewMode === 'realtime' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              Real-time
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
              <FaGlobe className="text-blue-500 dark:text-blue-300 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Visits</p>
              <p className="text-2xl font-bold">{totalVisitors}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
              <FaDesktop className="text-green-500 dark:text-green-300 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unique Visitors</p>
              <p className="text-2xl font-bold">{uniqueVisitors}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 mr-4">
              <FaClock className="text-red-500 dark:text-red-300 text-xl" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Now</p>
              <p className="text-2xl font-bold">{activeNow}</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold mb-4">Visitors by Country</h3>
            <div className="h-64">
              <Pie data={geoChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-bold mb-4">Visitors by Device</h3>
            <div className="h-64">
              <Pie data={deviceChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md col-span-1 lg:col-span-2">
            <h3 className="font-bold mb-4">Visitors by Hour</h3>
            <div className="h-64">
              <Bar data={timeChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="font-bold">Visitor Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Browser/OS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {visitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {visitor.timestamp.toDate().toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {visitor.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {visitor.location ? 
                          `${visitor.location.city || ''}, ${visitor.location.country || 'Unknown'}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {visitor.device ? 
                          `${visitor.device.browser || 'Unknown'} / ${visitor.device.os || 'Unknown'}` : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {visitor.path || '/'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <button 
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => viewVisitorDetails(visitor)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'realtime' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Real-time Visitor Activity</h3>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Live Updating</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {visitors.slice(0, 10).map((visitor) => {
              const minutesAgo = Math.round((new Date().getTime() - visitor.timestamp.toDate().getTime()) / 60000);
              return (
                <div key={visitor.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {visitor.ip} from {visitor.location?.city || ''}, {visitor.location?.country || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {minutesAgo <= 0 ? 'Just now' : minutesAgo === 1 ? '1 minute ago' : `${minutesAgo} minutes ago`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Viewing {visitor.path || '/'} using {visitor.device?.browser || 'Unknown'} on {visitor.device?.device || 'Unknown'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Visitor Details</h3>
              <button 
                onClick={() => setSelectedVisitor(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <h4 className="font-medium mb-2">Basic Info</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">IP Address:</span> {selectedVisitor.ip}</p>
                  <p><span className="font-medium">Visit Time:</span> {selectedVisitor.timestamp.toDate().toLocaleString()}</p>
                  <p><span className="font-medium">Page:</span> {selectedVisitor.path || '/'}</p>
                  <p><span className="font-medium">Referrer:</span> {selectedVisitor.referrer || 'Direct'}</p>
                  <p><span className="font-medium">Time on Page:</span> {selectedVisitor.timeOnPage ? `${selectedVisitor.timeOnPage}s` : 'N/A'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <h4 className="font-medium mb-2">Location</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Country:</span> {selectedVisitor.location?.country || 'Unknown'}</p>
                  <p><span className="font-medium">City:</span> {selectedVisitor.location?.city || 'Unknown'}</p>
                  <p><span className="font-medium">Region:</span> {selectedVisitor.location?.region || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <h4 className="font-medium mb-2">Device Info</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Browser:</span> {selectedVisitor.device?.browser || 'Unknown'}</p>
                  <p><span className="font-medium">OS:</span> {selectedVisitor.device?.os || 'Unknown'}</p>
                  <p><span className="font-medium">Device Type:</span> {selectedVisitor.device?.device || 'Unknown'}</p>
                  <p><span className="font-medium">Screen Size:</span> {selectedVisitor.screenSize ? 
                    `${selectedVisitor.screenSize.width}x${selectedVisitor.screenSize.height}` : 'Unknown'}</p>
                  <p><span className="font-medium">Language:</span> {selectedVisitor.language || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <h4 className="font-medium mb-2">Technical Details</h4>
                <div className="space-y-1 text-sm">
                  <p className="break-words"><span className="font-medium">User Agent:</span> {selectedVisitor.userAgent || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorStatistics; 