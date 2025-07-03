import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '../../config/firebase';
import { Activity, AlertCircle, Monitor, Smartphone, Map, MapPin, Lock, Tablet, Server, Database } from 'lucide-react';

// Custom browser icon components
const ChromeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="21.17" y1="8" x2="12" y2="8" />
    <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
    <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
  </svg>
);

const FirefoxIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2a7.5 7.5 0 0 1 5.5 2.47M15 8a5 5 0 0 1 2 4" />
  </svg>
);

const EdgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8v2.88a7 7 0 0 0 14 0V8" />
    <path d="M7 8a7 7 0 0 1 10 0" />
    <path d="M10.1 2A8.1 8.1 0 0 1 21 8a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 8.1 8.1 0 0 1 9.1-6z" />
  </svg>
);

interface DeviceData {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

const DeviceTracking = () => {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    deviceTypes: {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      other: 0
    },
    browsers: {
      chrome: 0,
      firefox: 0,
      safari: 0,
      edge: 0,
      other: 0
    }
  });

  useEffect(() => {
    const user = auth?.currentUser;
    if (user && database) {
      const historyRef = ref(database, `loginHistory/${user.uid}`);
      
      const unsubscribe = onValue(historyRef, (snapshot) => {
        setLoading(true);
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Process login data into device data
          const deviceMap: Record<string, DeviceData> = {};
          
          // First pass: collect all devices
          Object.entries(data).forEach(([id, record]: [string, any]) => {
            const deviceBrowserKey = `${record.device || 'Unknown'}-${record.browser || 'Unknown'}-${record.ip || 'Unknown'}`;
            
            if (!deviceMap[deviceBrowserKey]) {
              deviceMap[deviceBrowserKey] = {
                id,
                device: record.device || getDeviceFromUserAgent(record.userAgent),
                browser: record.browser || getBrowserFromUserAgent(record.userAgent),
                os: getOSFromUserAgent(record.userAgent),
                ip: record.ip || 'Unknown',
                location: record.location || 'Unknown',
                timestamp: record.timestamp,
                latitude: record.latitude,
                longitude: record.longitude,
                isActive: false
              };
            } else {
              // Update timestamp if newer
              const existing = deviceMap[deviceBrowserKey];
              if (existing) {
                const existingDate = new Date(existing.timestamp).getTime();
                const newDate = new Date(record.timestamp).getTime();
                
                if (newDate > existingDate) {
                  existing.timestamp = record.timestamp;
                  existing.id = id;
                  deviceMap[deviceBrowserKey] = existing;
                }
              }
            }
          });
          
          // Mark any device accessed in the last 24 hours as active
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          const deviceArray: DeviceData[] = Object.values(deviceMap);
          deviceArray.forEach(device => {
            const deviceDate = new Date(device.timestamp).getTime();
            device.isActive = deviceDate > oneDayAgo;
          });
          
          // Sort by timestamp (most recent first)
          deviceArray.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setDevices(deviceArray);
          
          // Calculate stats
          const activeDevices = deviceArray.filter(d => d.isActive).length;
          
          const deviceTypes = {
            mobile: deviceArray.filter(d => d.device.toLowerCase().includes('mobile') || d.device.toLowerCase().includes('phone')).length,
            desktop: deviceArray.filter(d => d.device.toLowerCase().includes('desktop') || d.device.toLowerCase().includes('pc')).length,
            tablet: deviceArray.filter(d => d.device.toLowerCase().includes('tablet') || d.device.toLowerCase().includes('ipad')).length,
            other: 0
          };
          deviceTypes.other = deviceArray.length - (deviceTypes.mobile + deviceTypes.desktop + deviceTypes.tablet);
          
          const browsers = {
            chrome: deviceArray.filter(d => d.browser.toLowerCase().includes('chrome')).length,
            firefox: deviceArray.filter(d => d.browser.toLowerCase().includes('firefox')).length,
            safari: deviceArray.filter(d => d.browser.toLowerCase().includes('safari')).length,
            edge: deviceArray.filter(d => d.browser.toLowerCase().includes('edge')).length,
            other: 0
          };
          browsers.other = deviceArray.length - (browsers.chrome + browsers.firefox + browsers.safari + browsers.edge);
          
          setStats({
            totalDevices: deviceArray.length,
            activeDevices,
            deviceTypes,
            browsers
          });
        } else {
          setDevices([]);
          setStats({
            totalDevices: 0,
            activeDevices: 0,
            deviceTypes: { mobile: 0, desktop: 0, tablet: 0, other: 0 },
            browsers: { chrome: 0, firefox: 0, safari: 0, edge: 0, other: 0 }
          });
        }
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, []);

  // Helper functions
  const getDeviceFromUserAgent = (userAgent: string) => {
    if (/mobile/i.test(userAgent) && !/tablet/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent) || /ipad/i.test(userAgent)) return 'Tablet';
    if (/windows|macintosh|linux/i.test(userAgent)) return 'Desktop';
    return 'Unknown';
  };
  
  const getBrowserFromUserAgent = (userAgent: string) => {
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/edge|edg/i.test(userAgent)) return 'Edge';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/opera|opr/i.test(userAgent)) return 'Opera';
    return 'Unknown';
  };
  
  const getOSFromUserAgent = (userAgent: string) => {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getDeviceIcon = (deviceType: string) => {
    switch(deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-blue-500" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-green-500" />;
      case 'desktop':
        return <Monitor className="h-5 w-5 text-purple-500" />;
      default:
        return <Server className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getBrowserIcon = (browser: string) => {
    switch(browser.toLowerCase()) {
      case 'chrome':
        return <ChromeIcon className="h-5 w-5 text-blue-500" />;
      case 'firefox':
        return <FirefoxIcon className="h-5 w-5 text-orange-500" />;
      case 'edge':
        return <EdgeIcon className="h-5 w-5 text-green-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-500" />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Device Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage devices that have accessed your account.
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-4">
              <Monitor className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
              <p className="text-xl font-semibold dark:text-white">{stats.totalDevices}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mr-4">
              <Activity className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Devices</p>
              <p className="text-xl font-semibold dark:text-white">{stats.activeDevices}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mr-4">
              <Smartphone className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Mobile Devices</p>
              <p className="text-xl font-semibold dark:text-white">{stats.deviceTypes.mobile}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mr-4">
              <Lock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security Status</p>
              <p className="text-xl font-semibold dark:text-white text-green-500">Secure</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
            <Monitor className="w-5 h-5 mr-2 text-blue-500" />
            Device Types
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Monitor className="w-4 h-4 mr-1 text-purple-500" /> Desktop
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.deviceTypes.desktop > 0 
                    ? Math.round((stats.deviceTypes.desktop / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.deviceTypes.desktop / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Smartphone className="w-4 h-4 mr-1 text-blue-500" /> Mobile
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.deviceTypes.mobile > 0 
                    ? Math.round((stats.deviceTypes.mobile / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.deviceTypes.mobile / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Tablet className="w-4 h-4 mr-1 text-green-500" /> Tablet
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.deviceTypes.tablet > 0 
                    ? Math.round((stats.deviceTypes.tablet / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.deviceTypes.tablet / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Server className="w-4 h-4 mr-1 text-gray-500" /> Other
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.deviceTypes.other > 0 
                    ? Math.round((stats.deviceTypes.other / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.deviceTypes.other / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Browser Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
            <ChromeIcon className="w-5 h-5 mr-2 text-blue-500" />
            Browser Types
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <ChromeIcon className="w-4 h-4 mr-1 text-blue-500" /> Chrome
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.browsers.chrome > 0 
                    ? Math.round((stats.browsers.chrome / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.browsers.chrome / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <FirefoxIcon className="w-4 h-4 mr-1 text-orange-500" /> Firefox
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.browsers.firefox > 0 
                    ? Math.round((stats.browsers.firefox / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.browsers.firefox / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Database className="w-4 h-4 mr-1 text-green-500" /> Safari
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.browsers.safari > 0 
                    ? Math.round((stats.browsers.safari / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.browsers.safari / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <EdgeIcon className="w-4 h-4 mr-1 text-blue-400" /> Edge
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.browsers.edge > 0 
                    ? Math.round((stats.browsers.edge / stats.totalDevices) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 rounded-full" 
                  style={{ width: `${stats.totalDevices > 0 ? (stats.browsers.edge / stats.totalDevices) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Device List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <h3 className="text-lg font-semibold p-6 dark:text-white border-b border-gray-200 dark:border-gray-700">
          Known Devices
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Device
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Browser
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Access
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {devices.map((device) => (
                <tr key={device.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedDevice(device)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getDeviceIcon(device.device)}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{device.device}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{device.os}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getBrowserIcon(device.browser)}
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{device.browser}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">{device.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(device.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      device.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {device.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              
              {devices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-8 w-8 mb-2 text-gray-400" />
                      <p>No device data available</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Selected Device Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">Device Details</h3>
              <button 
                onClick={() => setSelectedDevice(null)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Device</h4>
                  <div className="flex items-center text-gray-800 dark:text-white">
                    {getDeviceIcon(selectedDevice.device)}
                    <span className="ml-2">{selectedDevice.device}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Operating System</h4>
                  <p className="text-gray-800 dark:text-white">{selectedDevice.os}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Browser</h4>
                  <div className="flex items-center text-gray-800 dark:text-white">
                    {getBrowserIcon(selectedDevice.browser)}
                    <span className="ml-2">{selectedDevice.browser}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">IP Address</h4>
                  <p className="text-gray-800 dark:text-white">{selectedDevice.ip}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location</h4>
                  <div className="flex items-center text-gray-800 dark:text-white">
                    <MapPin className="w-4 h-4 text-red-500 mr-1" />
                    <span>{selectedDevice.location}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Access</h4>
                  <p className="text-gray-800 dark:text-white">{formatDate(selectedDevice.timestamp)}</p>
                </div>
              </div>
              
              {selectedDevice.latitude && selectedDevice.longitude && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Map Location</h4>
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                    <Map className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      Map view at: {selectedDevice.latitude.toFixed(6)}, {selectedDevice.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceTracking; 