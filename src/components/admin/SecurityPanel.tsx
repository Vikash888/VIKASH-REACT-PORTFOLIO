import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Terminal,
  AlertTriangle,
  Lock,
  Activity,
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Clock
} from 'lucide-react';
// DevToolsContext has been removed
import { db, database } from '../../config/firebase';
import { collection, query, where, getDocs, Firestore, orderBy, limit } from 'firebase/firestore';
import { ref, get, Database } from 'firebase/database';
import dataCollectionService from '../../services/DataCollectionService';
import IPManagement from './IPManagement';

interface SecurityStats {
  blockedIPs: number;
  activeThreats: number;
  securityScore: number;
  lastIncident?: string;
  devToolsAttempts: number;
}

interface SecurityEvent {
  id: string;
  type: string;
  timestamp: any;
  ip: string;
  userAgent: string;
  details?: any;
}

const SecurityPanel = () => {
  // Get DevTools status from database instead of context
  const [isDevToolsBlocked, setIsDevToolsBlocked] = useState(false);
  const [devToolsAttempts, setDevToolsAttempts] = useState(0);
  const [stats, setStats] = useState<SecurityStats>({
    blockedIPs: 0,
    activeThreats: 0,
    securityScore: 0,
    devToolsAttempts: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchSecurityStats = async () => {
    setLoading(true);
    try {
      // Get security data from our service
      const securityData = await dataCollectionService.getSecurityData();

      if (securityData) {
        setStats({
          blockedIPs: securityData.blockedIPs,
          activeThreats: securityData.activeThreats || 0,
          securityScore: securityData.securityScore,
          devToolsAttempts: securityData.devToolsAttempts,
          lastIncident: securityData.recentEvents?.[0]?.timestamp
        });

        setRecentEvents(securityData.recentEvents || []);
      } else {
        // Fallback to direct database queries if service fails
        // Get blocked IPs count
        const blockedIPsRef = ref(database as Database, 'blockedIPs');
        const blockedSnapshot = await get(blockedIPsRef);
        const blockedIPs = blockedSnapshot.exists() ? Object.keys(blockedSnapshot.val()).length : 0;

        // Get dev tools attempts and status
        const devToolsRef = ref(database as Database, 'security/devToolsDetection');
        const devToolsSnapshot = await get(devToolsRef);
        const devToolsAttemptsCount = devToolsSnapshot.exists() ? Object.keys(devToolsSnapshot.val()).length : 0;
        setDevToolsAttempts(devToolsAttemptsCount);

        // Get DevTools protection status
        const devToolsSettingsRef = ref(database as Database, 'settings/devTools');
        const devToolsSettingsSnapshot = await get(devToolsSettingsRef);
        const isBlocked = devToolsSettingsSnapshot.exists() ? devToolsSettingsSnapshot.val().blocked : false;
        setIsDevToolsBlocked(isBlocked);

        // Get threats from visitors collection
        const visitorsRef = collection(db as Firestore, 'visitors');
        const threatsQuery = query(visitorsRef, where('threatLevel', '==', 'high'));
        const threatsSnapshot = await getDocs(threatsQuery);
        const activeThreats = threatsSnapshot.size;

        // Calculate security score (example algorithm)
        const maxScore = 100;
        const threatPenalty = activeThreats * 10;
        const blockBonus = blockedIPs * 5;
        const devToolsBonus = isDevToolsBlocked ? 20 : 0;
        const securityScore = Math.max(0, Math.min(maxScore - threatPenalty + blockBonus + devToolsBonus, 100));

        setStats({
          blockedIPs,
          activeThreats,
          securityScore,
          devToolsAttempts: devToolsAttemptsCount,
          lastIncident: new Date().toISOString()
        });

        // Get recent security events
        const eventsRef = collection(db as Firestore, 'securityEvents');
        const eventsQuery = query(eventsRef, orderBy('timestamp', 'desc'), limit(5));
        const eventsSnapshot = await getDocs(eventsQuery);

        const events = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SecurityEvent[];

        setRecentEvents(events);
      }
    } catch (error) {
      console.error('Error fetching security stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSecurityStats();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';

    try {
      // Handle Firestore timestamps
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }

      // Handle string ISO dates
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString();
      }

      // Handle numeric timestamps
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleString();
      }

      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-indigo-500" />
          Security Center
        </h2>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-sm rounded-l-lg ${
                activeTab === 'overview'
                  ? 'bg-indigo-500 text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('ip-management')}
              className={`px-3 py-1.5 text-sm rounded-r-lg ${
                activeTab === 'ip-management'
                  ? 'bg-indigo-500 text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              IP Management
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Security Score Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Security Score</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{stats.securityScore}%</p>
                <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">Protected</p>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stats.securityScore > 70
                      ? 'bg-green-500'
                      : stats.securityScore > 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.securityScore}%` }}
                ></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">DevTools Protection</h3>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Terminal className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {isDevToolsBlocked ? 'Active' : 'Inactive'}
                </p>
                <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {devToolsAttempts} attempts blocked
                </p>
              </div>

              {/* Status indicator */}
              <div className="mt-3 flex items-center">
                {isDevToolsBlocked ? (
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Protection enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500">
                    <XCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Protection disabled</span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Threats</h3>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{stats.activeThreats}</p>
                <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">Detected</p>
              </div>

              {/* Status indicator */}
              <div className="mt-3 flex items-center">
                {stats.activeThreats === 0 ? (
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">No active threats</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-500">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Threats detected</span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Blocked IPs</h3>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Globe className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{stats.blockedIPs}</p>
                <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">Addresses</p>
              </div>

              {/* Last updated */}
              <div className="mt-3 flex items-center text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-xs">Last incident: {stats.lastIncident ? formatDate(stats.lastIncident) : 'None'}</span>
              </div>
            </motion.div>
          </div>

          {/* Recent Security Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Recent Security Events
              </h3>
            </div>

            <div className="overflow-x-auto">
              {recentEvents.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {recentEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {event.type === 'DEVTOOLS_DETECTED' ? (
                              <Terminal className="w-4 h-4 text-purple-500 mr-2" />
                            ) : event.type === 'UNAUTHORIZED_ACCESS' ? (
                              <Lock className="w-4 h-4 text-red-500 mr-2" />
                            ) : event.type === 'SUSPICIOUS_ACTIVITY' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                            ) : (
                              <Shield className="w-4 h-4 text-blue-500 mr-2" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(event.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.details ? JSON.stringify(event.details).substring(0, 50) + '...' : 'No details'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p>No security events recorded</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Security Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Security Recommendations</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Lock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-white">Enable Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your admin account by enabling 2FA.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-white">Regular Security Audits</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Perform regular security audits to identify and address potential vulnerabilities.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-white">Monitor User Activity</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Regularly review visitor logs and block suspicious IP addresses.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : (
        <IPManagement />
      )}
    </div>
  );
};

export default SecurityPanel;
