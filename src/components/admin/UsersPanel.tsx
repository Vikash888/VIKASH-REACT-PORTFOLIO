import React, { useState, useEffect } from 'react';
import { Search, Globe, Clock, UserX, Check, RefreshCw, Calendar, Monitor } from 'lucide-react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ref, get } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { blockIP, unblockIP } from '../../services/visitorTracking';

interface VisitorUser {
  id: string;
  ip: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  role: string;
  status: string;
  lastVisit: string;
  visitCount: number;
  firstVisit: string;
  timeOnSite?: number;
  lastPath?: string;
  deviceInfo?: string;
  blocked?: boolean;
}

const UsersPanel = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<VisitorUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<VisitorUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Visitor statistics - same as footer
  const [viewStats, setViewStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0
  });

  // Format large numbers (same as footer)
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };

  const getMockVisitors = (): VisitorUser[] => {
    return [
      {
        id: '1',
        ip: '192.168.1.1',
        country: 'United States',
        city: 'New York',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
        role: 'Visitor',
        status: 'Active',
        lastVisit: new Date().toLocaleString(),
        visitCount: 15,
        firstVisit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleString(),
      },
      {
        id: '2',
        ip: '203.0.113.195',
        country: 'India',
        city: 'Mumbai',
        browser: 'Safari',
        os: 'iOS',
        device: 'Mobile',
        role: 'Visitor',
        status: 'Active',
        lastVisit: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
        visitCount: 8,
        firstVisit: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toLocaleString(),
      },
      {
        id: '3',
        ip: '8.8.8.8',
        country: 'United States',
        city: 'Mountain View',
        browser: 'Firefox',
        os: 'Linux',
        device: 'Desktop',
        role: 'Visitor',
        status: 'Inactive',
        lastVisit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toLocaleString(),
        visitCount: 2,
        firstVisit: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toLocaleString(),
      },
      {
        id: '4',
        ip: '198.51.100.42',
        country: 'Germany',
        city: 'Berlin',
        browser: 'Edge',
        os: 'Windows',
        device: 'Desktop',
        role: 'Visitor',
        status: 'Blocked',
        lastVisit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleString(),
        visitCount: 1,
        firstVisit: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleString(),
      },
      {
        id: '5',
        ip: '127.0.0.1',
        country: 'Local',
        city: 'Localhost',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
        role: 'Admin',
        status: 'Active',
        lastVisit: new Date().toLocaleString(),
        visitCount: 150,
        firstVisit: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toLocaleString(),
      }
    ];
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      // Check if Firestore is available
      if (!db) {
        console.log('Firestore not initialized, using mock data');
        setUsers(getMockVisitors());
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get blocked IPs from Firebase Realtime Database
      const blockedIPs: Record<string, boolean> = {};
      const database = getDatabase();
      const blockedIPsRef = ref(database, 'blockedIPs');
      const blockedIPsSnapshot = await get(blockedIPsRef);
      
      if (blockedIPsSnapshot.exists()) {
        const blockedIPsData = blockedIPsSnapshot.val();
        Object.keys(blockedIPsData).forEach(key => {
          const ip = key.replace(/_/g, '.');
          blockedIPs[ip] = true;
        });
      }

      // Fetch real visitor data from Firestore
      const visitorsRef = collection(db, 'visitors');
      const visitorsSnapshot = await getDocs(visitorsRef);
      
      // Group visitors by IP address
      const visitorsByIp = new Map<string, any>();
      
      visitorsSnapshot.forEach((doc) => {
        const data = doc.data();
        const ip = data.ip || 'Unknown';
        
        if (!visitorsByIp.has(ip)) {
          visitorsByIp.set(ip, {
            visits: [],
            ip,
            lastVisit: data.timestamp,
            country: data.country || data.location?.country || 'Unknown',
            city: data.city || data.location?.city || 'Unknown',
            browser: data.browser || data.device?.browser || 'Unknown',
            os: data.os || data.device?.os || 'Unknown',
            device: data.device || data.device?.device || 'Unknown',
            role: data.role || 'Visitor', // Default role
            status: blockedIPs[ip] ? 'Blocked' : (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000 ? 'Active' : 'Inactive'),
            firstVisit: data.timestamp,
            timeOnSite: data.timeOnPage || 0,
            lastPath: data.path || '/',
            deviceInfo: data.userAgent || '',
            blocked: !!blockedIPs[ip]
          });
        }
        
        const visitor = visitorsByIp.get(ip);
        visitor.visits.push({
          timestamp: data.timestamp,
          path: data.path || '/',
          timeOnPage: data.timeOnPage || 0,
          userAgent: data.userAgent
        });
        
        // Add to the total time on site
        visitor.timeOnSite = (visitor.timeOnSite || 0) + (data.timeOnPage || 0);
        
        // Update the last visit time if this visit is more recent
        if (data.timestamp > visitor.lastVisit) {
          visitor.lastVisit = data.timestamp;
          visitor.lastPath = data.path || '/';
        }
        
        // Update the first visit time if this visit is older
        if (data.timestamp < visitor.firstVisit) {
          visitor.firstVisit = data.timestamp;
        }
      });
      
      // Get real-time active users
      const activeUsersRef = ref(database, 'activeUsers');
      const activeUsersSnapshot = await get(activeUsersRef);
      
      if (activeUsersSnapshot.exists()) {
        const activeUsers = activeUsersSnapshot.val();
        Object.entries(activeUsers).forEach(([key, userData]: [string, any]) => {
          const ip = key.replace(/_/g, '.');
          if (visitorsByIp.has(ip)) {
            const visitor = visitorsByIp.get(ip);
            visitor.status = 'Active';
            visitor.online = true;
            visitor.lastActivity = userData.timestamp;
          }
        });
      }
      
      // Format the grouped visitors into an array with IDs
      const formattedVisitors: VisitorUser[] = Array.from(visitorsByIp.values()).map((visitor, index) => ({
        id: `visitor-${index}`,
        ip: visitor.ip,
        country: visitor.country,
        city: visitor.city,
        browser: visitor.browser,
        os: visitor.os,
        device: visitor.device,
        role: visitor.ip === '127.0.0.1' || visitor.ip.startsWith('192.168.') ? 'Admin' : visitor.role,
        status: visitor.blocked ? 'Blocked' : visitor.status,
        lastVisit: visitor.lastVisit instanceof Timestamp ? 
          visitor.lastVisit.toDate().toLocaleString() : 
          new Date(visitor.lastVisit).toLocaleString(),
        visitCount: visitor.visits.length,
        firstVisit: visitor.firstVisit instanceof Timestamp ? 
          visitor.firstVisit.toDate().toLocaleString() : 
          new Date(visitor.firstVisit).toLocaleString(),
        timeOnSite: visitor.timeOnSite,
        lastPath: visitor.lastPath,
        deviceInfo: visitor.deviceInfo,
        blocked: visitor.blocked
      }));
      
      // If there's no data in Firestore, use mock data for development
      if (formattedVisitors.length === 0) {
        setUsers(getMockVisitors());
      } else {
        // Sort by most recent visit
        formattedVisitors.sort((a, b) => 
          new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
        );
        setUsers(formattedVisitors);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      // Use mock data as fallback
      setUsers(getMockVisitors());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch view statistics from Firebase (same as footer)
  useEffect(() => {
    const fetchViewStats = () => {
      try {
        const database = getDatabase();
        const statsRef = ref(database, 'stats/views');
        get(statsRef).then((snapshot) => {
          const data = snapshot.val();
          if (data) {
            setViewStats({
              total: data.total || 0,
              today: data.today || 0,
              week: data.week || 0,
              month: data.month || 0
            });
          } else {
            setViewStats({ total: 0, today: 0, week: 0, month: 0 });
          }
        }).catch((error) => {
          console.error("Error fetching view stats:", error);
          setViewStats({ total: 0, today: 0, week: 0, month: 0 });
        });
      } catch (error) {
        console.error("Error setting up view stats:", error);
        setViewStats({ total: 0, today: 0, week: 0, month: 0 });
      }
    };
    fetchViewStats();
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, []);

  // Check loading state immediately after all hooks
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading visitor data...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleBlockUser = (user: VisitorUser) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const confirmBlockUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Toggle user's status between 'Blocked' and 'Active'
      const isCurrentlyBlocked = selectedUser.status === 'Blocked';
      const newStatus = isCurrentlyBlocked ? 'Active' : 'Blocked';
      
      // Use the visitor tracking service to update Firebase
      if (isCurrentlyBlocked) {
        await unblockIP(selectedUser.ip);
      } else {
        await blockIP(selectedUser.ip);
      }
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id
          ? { ...user, status: newStatus, blocked: !isCurrentlyBlocked } 
          : // For users with the same IP address, update their status too
            user.ip === selectedUser.ip
              ? { ...user, status: newStatus, blocked: !isCurrentlyBlocked }
              : user
      ));
      
      // Show success notification
      const action = isCurrentlyBlocked ? 'unblocked' : 'blocked';
      alert(`IP ${selectedUser.ip} has been ${action} successfully.`);
    } catch (error) {
      console.error(`Error ${selectedUser.status === 'Blocked' ? 'unblocking' : 'blocking'} user:`, error);
      alert(`Error ${selectedUser.status === 'Blocked' ? 'unblocking' : 'blocking'} the IP. Please try again.`);
    } finally {
      setLoading(false);
      setShowBlockModal(false);
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.ip.toLowerCase().includes(query) ||
      (user.country?.toLowerCase() || '').includes(query) ||
      (user.city?.toLowerCase() || '').includes(query) ||
      (user.browser?.toLowerCase() || '').includes(query) ||
      (user.os?.toLowerCase() || '').includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query)
    );
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getActivityIndicator = (visitCount: number) => {
    if (visitCount > 50) return 'bg-purple-500';
    if (visitCount > 20) return 'bg-green-500';
    if (visitCount > 10) return 'bg-blue-500';
    if (visitCount > 5) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getActivityLevel = (visitCount: number) => {
    if (visitCount > 50) return 'Very High';
    if (visitCount > 20) return 'High';
    if (visitCount > 10) return 'Medium';
    if (visitCount > 5) return 'Low';
    return 'Minimal';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visitor Statistics</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <button 
            className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Visitor statistics cards - same as footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {formatNumber(viewStats.today)}
                <span className="text-xs ml-1 font-normal text-gray-500">views</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {formatNumber(viewStats.week)}
                <span className="text-xs ml-1 font-normal text-gray-500">views</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {formatNumber(viewStats.month)}
                <span className="text-xs ml-1 font-normal text-gray-500">views</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All Time</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {formatNumber(viewStats.total)}
                <span className="text-xs ml-1 font-normal text-gray-500">views</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Globe className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device Info
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    user.status === 'Blocked' ? 'bg-red-50 dark:bg-red-900/10' :
                    user.status === 'Active' ? 'bg-green-50 dark:bg-green-900/5' : ''
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            user.status === 'Blocked' 
                              ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                              : user.role === 'Admin'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}>
                            <Globe className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            {user.ip}
                            {user.role === 'Admin' && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.country || 'Unknown'}, {user.city || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Monitor className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.browser || 'Unknown'} / {user.os || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <span className="mr-1">{user.device || 'Unknown'}</span>
                            {user.deviceInfo && (
                              <span className="truncate max-w-[150px] inline-block" title={user.deviceInfo}>
                                • {user.deviceInfo.substring(0, 20)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start space-y-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(user.status)}`}>
                          {user.status}
                        </span>
                        
                        {user.lastPath && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={user.lastPath}>
                            Last page: {user.lastPath}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {user.lastVisit}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          First: {new Date(user.firstVisit).toLocaleDateString()}
                        </div>
                        {user.timeOnSite && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Time on site: {Math.round(user.timeOnSite / 60)} mins
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${getActivityIndicator(user.visitCount)} mr-2`}></div>
                        <div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {getActivityLevel(user.visitCount)}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.visitCount} {user.visitCount === 1 ? 'visit' : 'visits'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => alert(`View details for IP: ${user.ip}`)}
                          title="View visitor details"
                        >
                          <Monitor className="w-5 h-5" />
                        </button>
                        
                        {user.role !== 'Admin' && (
                          <button 
                            className={`p-1 rounded-full ${
                              user.status === 'Blocked' 
                                ? 'text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                            onClick={() => handleBlockUser(user)}
                            title={user.status === 'Blocked' ? 'Unblock visitor' : 'Block visitor'}
                          >
                            {user.status === 'Blocked' ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <UserX className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-base">No visitors found</p>
                      <p className="text-sm mt-1">Try adjusting your search filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> visitors
        </div>
        
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-50"
            disabled
          >
            Previous
          </button>
          <button
            className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-50"
            disabled
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Block User Modal */}
      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-2 ${
                  selectedUser.status === 'Blocked'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {selectedUser.status === 'Blocked' ? 'Unblock Visitor' : 'Block Visitor'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedUser.status === 'Blocked'
                    ? `Are you sure you want to unblock IP ${selectedUser.ip}? They will regain access to the portfolio.`
                    : `Are you sure you want to block IP ${selectedUser.ip}? They will lose access to the portfolio.`
                  }
                </p>
              </div>
              
              <div className={`p-4 rounded-lg mb-4 ${
                selectedUser.status === 'Blocked' 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30'
                  : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}>
                <div className="flex items-start">
                  <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                    selectedUser.status === 'Blocked'
                      ? 'bg-gradient-to-br from-red-500 to-orange-500'
                      : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}>
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3 flex-grow">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.ip}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedUser.status)}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {selectedUser.country || 'Unknown'}, {selectedUser.city || 'Unknown'}
                    </p>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        {selectedUser.browser || 'Unknown'} / {selectedUser.os || 'Unknown'}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        {selectedUser.device || 'Unknown'}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        {selectedUser.visitCount} {selectedUser.visitCount === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-500 dark:text-gray-400">
                  Last activity: {selectedUser.lastVisit}
                </div>
              </div>
              
              <div className="flex justify-between">
                <button 
                  type="button" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center ${
                    selectedUser.status === 'Blocked'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={confirmBlockUser}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {selectedUser.status === 'Blocked' 
                        ? <Check className="w-4 h-4 mr-1" /> 
                        : <UserX className="w-4 h-4 mr-1" />
                      }
                      {selectedUser.status === 'Blocked' ? 'Unblock' : 'Block'} IP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPanel;