import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '../../config/firebase';
import { Calendar, Clock, Laptop, Smartphone, Server, MapPin, Info } from 'lucide-react';

interface LoginRecord {
  id: string;
  timestamp: string;
  email: string;
  userAgent: string;
  ip?: string;
  location?: string;
  browser?: string;
  device?: string;
}

const LoginHistory = () => {
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<LoginRecord | null>(null);

  useEffect(() => {
    const user = auth?.currentUser;
    if (user && database) {
      const historyRef = ref(database, `loginHistory/${user.uid}`);
      
      const unsubscribe = onValue(historyRef, (snapshot) => {
        setLoading(true);
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Convert the data to an array of login records
          const historyArray = Object.entries(data).map(([id, record]: [string, any]) => ({
            id,
            timestamp: record.timestamp,
            email: record.email,
            userAgent: record.userAgent,
            ip: record.ip || 'Unknown',
            location: record.location || 'Unknown',
            browser: record.browser || getBrowserInfo(record.userAgent),
            device: record.device || getDeviceType(record.userAgent).name
          }));
          
          // Sort by timestamp (most recent first)
          historyArray.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setLoginHistory(historyArray);
        } else {
          setLoginHistory([]);
        }
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, []);

  // Function to determine device type from user agent
  const getDeviceType = (userAgent: string) => {
    if (/mobile/i.test(userAgent)) {
      return { icon: <Smartphone className="w-5 h-5 text-blue-500" />, name: 'Mobile' };
    } else if (/tablet/i.test(userAgent)) {
      return { icon: <Laptop className="w-5 h-5 text-green-500" />, name: 'Tablet' };
    } else if (/windows|macintosh|linux/i.test(userAgent)) {
      return { icon: <Laptop className="w-5 h-5 text-purple-500" />, name: 'Desktop' };
    } else {
      return { icon: <Server className="w-5 h-5 text-gray-500" />, name: 'Unknown' };
    }
  };

  // Function to get browser info from user agent
  const getBrowserInfo = (userAgent: string) => {
    if (/firefox/i.test(userAgent)) {
      return 'Firefox';
    } else if (/chrome/i.test(userAgent)) {
      return 'Chrome';
    } else if (/safari/i.test(userAgent)) {
      return 'Safari';
    } else if (/edge/i.test(userAgent)) {
      return 'Edge';
    } else if (/opera|opr/i.test(userAgent)) {
      return 'Opera';
    } else {
      return 'Unknown';
    }
  };

  // Function to get OS info from user agent
  const getOSInfo = (userAgent: string) => {
    if (/windows/i.test(userAgent)) {
      return /Windows NT 10/.test(userAgent) ? 'Windows 10' : 
             /Windows NT 6.3/.test(userAgent) ? 'Windows 8.1' :
             /Windows NT 6.2/.test(userAgent) ? 'Windows 8' :
             /Windows NT 6.1/.test(userAgent) ? 'Windows 7' :
             'Windows';
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      return 'macOS';
    } else if (/linux/i.test(userAgent)) {
      return 'Linux';
    } else if (/android/i.test(userAgent)) {
      return 'Android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      return 'iOS';
    } else {
      return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Login History</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your account access and login details.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : loginHistory.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Browser/OS
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Location
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loginHistory.map((record) => {
                      const device = getDeviceType(record.userAgent);
                      const browser = record.browser || getBrowserInfo(record.userAgent);
                      const os = getOSInfo(record.userAgent);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              {device.icon}
                              <span className="ml-2">{record.device || device.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>{browser}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">{os}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-red-400 mr-1" />
                              <span>{record.location}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                {formatDate(record.timestamp)}
                              </div>
                              <div className="flex items-center text-xs text-gray-400 mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(record.timestamp)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div>
            {selectedRecord ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Session Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date & Time</h4>
                    <p className="text-md dark:text-white">
                      {formatDate(selectedRecord.timestamp)} at {formatTime(selectedRecord.timestamp)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">IP Address</h4>
                    <p className="text-md dark:text-white">{selectedRecord.ip}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location</h4>
                    <p className="text-md dark:text-white">{selectedRecord.location}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Browser</h4>
                    <p className="text-md dark:text-white">{selectedRecord.browser}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Device</h4>
                    <p className="text-md dark:text-white">{selectedRecord.device}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Operating System</h4>
                    <p className="text-md dark:text-white">{getOSInfo(selectedRecord.userAgent)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Session Details</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a login session to view more details
                </p>
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Security Tips</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</div>
                  <p>Regularly review your login history for any suspicious activity.</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</div>
                  <p>Use a strong password and enable two-factor authentication when possible.</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">✓</div>
                  <p>Log out of your account when using shared or public computers.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <div className="mb-4">
            <Clock className="h-12 w-12 mx-auto text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No login history</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your login history will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginHistory; 