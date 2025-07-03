import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { Shield, Loader, XCircle, AlertTriangle, CheckCircle, RefreshCw, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface BlockedIP {
  ip: string;
  reason: string;
  timestamp: number;
  country?: string;
  city?: string;
}

const IPManagement = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBlockedIPs();
  }, []);

  const loadBlockedIPs = () => {
    setLoading(true);
    const database = getDatabase();
    const blockedIPsRef = ref(database, 'blockedIPs');

    const unsubscribe = onValue(blockedIPsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ips = Object.entries(snapshot.val()).map(([ip, data]: [string, any]) => ({
          ip: ip.replace(/_/g, '.'),
          ...data
        }));
        setBlockedIPs(ips);
      } else {
        setBlockedIPs([]);
      }
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlockedIPs();
  };

  const handleBlockIP = async () => {
    if (!newIP || !reason) {
      setError('Both IP address and reason are required');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIP)) {
      setError('Please enter a valid IP address');
      return;
    }

    try {
      setLoading(true);
      const database = getDatabase();
      const ipRef = ref(database, `blockedIPs/${newIP.replace(/\./g, '_')}`);
      
      await set(ipRef, {
        ip: newIP,
        reason,
        timestamp: Date.now()
      });

      setNewIP('');
      setReason('');
      setError('');
      setSuccess(`IP address ${newIP} has been blocked successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to block IP address');
      console.error('Error blocking IP:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      setLoading(true);
      const database = getDatabase();
      const ipRef = ref(database, `blockedIPs/${ip.replace(/\./g, '_')}`);
      await remove(ipRef);
      setSuccess(`IP address ${ip} has been unblocked successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to unblock IP address');
      console.error('Error unblocking IP:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter IPs based on search term
  const filteredIPs = blockedIPs.filter(ip => 
    ip.ip.includes(searchTerm) || 
    (ip.country && ip.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ip.reason && ip.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            IP Address Management
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Add IP Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter IP address"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Reason for blocking"
              />
              <button
                onClick={handleBlockIP}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Block IP
              </button>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-900 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-900 flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            placeholder="Search by IP, country, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Blocked IPs List */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Blocked IP Addresses
            </h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredIPs.length} {filteredIPs.length === 1 ? 'address' : 'addresses'} blocked
            </span>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredIPs.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredIPs.map((ip) => (
                <div key={ip.ip} className="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium dark:text-white">{ip.ip}</span>
                      {ip.country && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({ip.country})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {ip.reason}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Blocked on: {new Date(ip.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblockIP(ip.ip)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                    title="Unblock this IP"
                  >
                    <XCircle className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Shield className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
              <p>No blocked IP addresses found</p>
              {searchTerm && (
                <p className="mt-2 text-sm">
                  Try adjusting your search term or clear the filter
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default IPManagement;
