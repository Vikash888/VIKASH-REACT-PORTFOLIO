import { app } from '../config/firebase';
import { getDatabase, ref, update, increment, onValue, set, push, serverTimestamp, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

interface VisitorData {
  browser: string;
  device: string;
  os: string;
  country: string | null;
  city: string | null;
  timestamp: number;
  path: string;
  referrer: string;
  sessionDuration?: number;
}

interface AnalyticsData {
  browsers: { [key: string]: { count: number } };
  devices: { [key: string]: { count: number } };
  countries: { [key: string]: { count: number } };
  os: { [key: string]: { count: number } };
  sidebar?: {
    totalVisitors: number;
    activeUsers: number;
    totalPageViews: number;
    averageSessionDuration: number;
  };
}

interface VisitorInfo {
  timestamp: number;
  page: string;
  browser: string;
  os: string;
  device: string;
  active?: boolean;
}

interface PageViewInfo {
  count: number;
  lastUpdated: number;
}

/**
 * Get browser and OS information
 */
const getBrowserInfo = (): { browser: string; os: string; device: string } => {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Detect browser
  if (ua.indexOf("Firefox") > -1) {
    browser = "Firefox";
  } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
    browser = "Opera";
  } else if (ua.indexOf("Trident") > -1) {
    browser = "Internet Explorer";
  } else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) {
    browser = "Edge";
  } else if (ua.indexOf("Chrome") > -1) {
    browser = "Chrome";
  } else if (ua.indexOf("Safari") > -1) {
    browser = "Safari";
  }

  // Detect OS
  if (ua.indexOf("Windows") > -1) {
    os = "Windows";
  } else if (ua.indexOf("Mac") > -1) {
    os = "MacOS";
  } else if (ua.indexOf("Linux") > -1) {
    os = "Linux";
  } else if (ua.indexOf("Android") > -1) {
    os = "Android";
    device = "Mobile";
  } else if (ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1 || ua.indexOf("iPod") > -1) {
    os = "iOS";
    device = ua.indexOf("iPad") > -1 ? "Tablet" : "Mobile";
  }

  // Detect mobile or tablet
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = "Tablet";
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    device = "Mobile";
  }

  return { browser, os, device };
};

/**
 * Get visitor's location information
 */
const getLocationInfo = async (): Promise<{ country: string | null; city: string | null }> => {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    // Use our proxy endpoint instead of directly calling ipapi.co
    const response = await fetch('/api/ip-info', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.reason || 'IP geolocation failed');
    }
    
    return {
      country: data.country_name || null,
      city: data.city || null
    };
  } catch (error) {
    // Silently fail for geolocation errors to not break the app
    console.warn('IP geolocation service unavailable (this is non-critical):', error instanceof Error ? error.message : 'Unknown error');
    return { country: null, city: null };
  }
};

/**
 * Retry a function with exponential backoff
 */
const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
};

/**
 * Validate data before updates
 */
const validateData = (data: any): boolean => {
  if (!data) return false;
  if (typeof data !== 'object') return false;
  // Add more specific validation as needed
  return true;
};

/**
 * Clean up inactive users
 */
const cleanupInactiveUsers = async (): Promise<void> => {
  const database = getDatabase(app);
  const activeUsersRef = ref(database, 'activeUsers');
  
  try {
    const snapshot = await retry(() => get(activeUsersRef));
    if (!snapshot.exists()) return;

    const now = Date.now();
    const users = snapshot.val();
    
    // First, identify users to remove
    const inactiveUsers = Object.entries(users).filter(([_, user]: [string, any]) => {
      return !user ||
             !user.active ||
             !user.lastActivity ||
             !user.timestamp ||
             now - user.lastActivity > 15000; // 15 seconds threshold
    });
    
    // If we found inactive users, remove them immediately
    if (inactiveUsers.length > 0) {
      console.log('Removing inactive users:', inactiveUsers.length);
      
      const updates = inactiveUsers.reduce((acc, [key]) => {
        acc[key] = null;
        return acc;
      }, {} as Record<string, null>);
      
      await retry(() => update(activeUsersRef, updates));
    }
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
};

/**
 * Update stats for sidebar
 */
const updateSidebarStats = async (database: any): Promise<void> => {
  try {
    const statsRef = ref(database, 'stats');
    await update(statsRef, {
      lastUpdated: serverTimestamp(),
      'sidebar/lastSync': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating sidebar stats:', error);
  }
};

/**
 * Tracks page visits with proper duplicate visit prevention and detailed metrics
 * @param path - The page path being visited
 */
export const trackPageVisit = async (path: string): Promise<void> => {
  try {
    // Get the visitor ID from localStorage or create a new one
    let visitorId = localStorage.getItem('visitor-id');
    let isNewVisitor = false;
    
    // If no visitor ID exists, create one and mark as new visitor
    if (!visitorId) {
      visitorId = uuidv4();
      localStorage.setItem('visitor-id', visitorId);
      isNewVisitor = true;
    }
    
    // Create a key for this specific visit
    const pageKey = `page-visit-${path}`;
    const lastVisitDate = localStorage.getItem(pageKey);
    const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD
    
    // Collect browser and device info
    const { browser, os, device } = getBrowserInfo();
    
    // Get location info
    const { country, city } = await getLocationInfo();
    
    // Create visitor data object
    const visitorData: VisitorData = {
      browser,
      device,
      os,
      country,
      city,
      timestamp: Date.now(),
      path,
      referrer: document.referrer || 'direct'
    };

    const database = getDatabase(app);
    
    // Store the visit in the visits collection
    const visitsRef = ref(database, 'visits');
    const newVisitRef = push(visitsRef);
    await set(newVisitRef, {
      ...visitorData,
      visitorId
    });
    
    // Update visitor record
    const visitorRef = ref(database, `visitors/${visitorId}`);
    await update(visitorRef, {
      lastVisit: Date.now(),
      totalVisits: increment(1),
      lastPath: path,
      browser,
      os,
      device,
      country,
      city
    });
    
    // Only count as a new page view if this page hasn't been visited today by this visitor
    if (lastVisitDate !== today) {
      // Update page-specific analytics
      const pathSafe = path.replace(/\//g, '_') || 'home';
      const pageViewsRef = ref(database, `pageViews/${pathSafe}`);
      
      // Increment the page view counter
      await update(pageViewsRef, {
        count: increment(1),
        lastUpdated: serverTimestamp()
      });
      
      // Update browser statistics
      await update(ref(database, `analytics/browsers/${browser}`), {
        count: increment(1)
      });
      
      // Update device statistics
      await update(ref(database, `analytics/devices/${device}`), {
        count: increment(1)
      });
      
      // Update OS statistics
      await update(ref(database, `analytics/os/${os}`), {
        count: increment(1)
      });
      
      // Update country statistics if available
      if (country) {
        await update(ref(database, `analytics/countries/${country.replace(/\s+/g, '_')}`), {
          count: increment(1)
        });
      }
      
      // Also update overall stats
      const statsRef = ref(database, 'stats/views');
      await update(statsRef, {
        total: increment(1),
        today: increment(1),
        week: increment(1),
        month: increment(1),
        lastUpdated: serverTimestamp()
      });
      
      // If this is a new visitor, increment uniqueVisitors counter
      if (isNewVisitor) {
        await update(ref(database, 'stats/uniqueVisitors'), {
          total: increment(1),
          today: increment(1),
          week: increment(1),
          month: increment(1)
        });
      }
      
      // Mark this page as visited today
      localStorage.setItem(pageKey, today);
      
      console.log(`Page visit recorded for: ${path}`);
    } else {
      console.log(`Page ${path} already visited today by this user`);
    }

    // Start tracking session duration
    startSessionTracking(visitorId);

    // Update sidebar stats
    await updateSidebarStats(database);
    
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
};

// Store the start time of the session
let sessionStartTime = Date.now();
let activeVisitorId: string | null = null;

/**
 * Start tracking session duration
 */
const startSessionTracking = (visitorId: string): void => {
  sessionStartTime = Date.now();
  activeVisitorId = visitorId;
  
  // Add event listener for when user leaves the page
  window.addEventListener('beforeunload', updateSessionDuration);
};

/**
 * Update session duration when user leaves the page
 */
const updateSessionDuration = async (): Promise<void> => {
  if (!activeVisitorId) return;
  
  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000); // in seconds
  const database = getDatabase(app);
  
  try {
    // Update session duration for this visitor
    await update(ref(database, `visitors/${activeVisitorId}`), {
      lastSessionDuration: sessionDuration
    });
    
    // Update average session duration
    const avgSessionRef = ref(database, 'stats/sessionDuration');
    await onValue(avgSessionRef, (snap) => {
      const data = snap.val() || { count: 0, totalDuration: 0 };
      const newCount = data.count + 1;
      const newTotalDuration = data.totalDuration + sessionDuration;
      
      update(avgSessionRef, {
        count: newCount,
        totalDuration: newTotalDuration,
        average: Math.floor(newTotalDuration / newCount)
      });
    }, { onlyOnce: true });
  } catch (error) {
    console.error('Error updating session duration:', error);
  }
};

/**
 * Tracks active users in real-time
 * @returns A cleanup function to remove the user when they leave
 */
// Clear all active users before tracking new ones
const clearAllActiveSessions = async () => {
  const database = getDatabase(app);
  const activeUsersRef = ref(database, 'activeUsers');
  await set(activeUsersRef, null);
};

export const trackActiveUser = async (): Promise<() => void> => {
  // Clear existing sessions first
  await clearAllActiveSessions();
  try {
    const sessionId = uuidv4();
    const database = getDatabase(app);
    const userRef = ref(database, `activeUsers/${sessionId}`);
    
    const { browser, os, device } = getBrowserInfo();
    const { country, city } = await getLocationInfo();
    const visitorId = localStorage.getItem('visitor-id') || uuidv4();

    const now = Date.now();
    const userData = {
      timestamp: now, // Initial session start time
      page: window.location.pathname,
      sessionId,
      browser,
      os,
      device,
      visitorId,
      country,
      city,
      lastActivity: now,
      active: true
    };

    if (!validateData(userData)) {
      throw new Error('Invalid user data');
    }

    const updateStatus = async () => {
      const currentTime = Date.now();
      await retry(() => update(userRef, {
        ...userData,
        lastActivity: currentTime,
        active: true,
        page: window.location.pathname // Update current page
      }));
    };

    // Initial update
    await updateStatus();

    // Update status every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    // Cleanup inactive users every 15 seconds
    const cleanupInterval = setInterval(cleanupInactiveUsers, 15000);
    
    // Do an initial cleanup
    cleanupInactiveUsers();

    // Enhanced cleanup function
    const cleanup = async () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
      try {
        await retry(() => set(userRef, null));
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };

    // Handle visibility and offline/online changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cleanup();
      } else {
        updateStatus();
      }
    });

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', cleanup);

    return cleanup;
  } catch (error) {
    console.error('Error tracking active user:', error);
    return () => {};
  }
};

/**
 * Gets the current count of active users
 * @param callback - Function to call with the active user count
 * @returns Function to unsubscribe from updates
 */
export const getActiveUserCount = (callback: (count: number) => void): () => void => {
  const database = getDatabase(app);
  let retryTimeout: NodeJS.Timeout;

  const fetchCount = async () => {
    try {
      const snapshot = await retry(() => get(ref(database, 'activeUsers')));
      if (!snapshot.exists()) {
        console.log('No active users found');
        callback(0);
        return;
      }

      const now = Date.now();
      const data = snapshot.val();
      const activeUsers = Object.values(data).filter((user: any) => {
        if (!user || !user.active || !user.lastActivity) {
          console.log('Filtering out user due to missing required fields:', user);
          return false;
        }
        
        // Only count users with activity in the last 15 seconds
        const timeSinceLastActivity = now - user.lastActivity;
        const isActive = timeSinceLastActivity < 15000; // 15 seconds
        
        if (!isActive) {
          console.log('Filtering out inactive user, last activity:', timeSinceLastActivity, 'ms ago');
        }
        
        return isActive;
      });

      console.log('Active users count:', activeUsers.length);
      console.log('Active users:', activeUsers);
      
      callback(activeUsers.length);
    } catch (error) {
      console.error('Error fetching active users:', error);
      // Retry after 5 seconds on error
      retryTimeout = setTimeout(fetchCount, 5000);
    }
  };

  // Use try-catch to handle potential errors with onValue
  let unsubscribe;
  try {
    unsubscribe = onValue(ref(database, 'activeUsers'), fetchCount, 
      (error) => {
        console.error('Active users subscription error:', error);
        retryTimeout = setTimeout(fetchCount, 5000);
      }
    );
  } catch (error) {
    console.error('Failed to subscribe to active users:', error);
    // Return a no-op function if subscription fails
    unsubscribe = () => {};
    // Try to fetch once anyway
    fetchCount();
  }

  return () => {
    unsubscribe();
    clearTimeout(retryTimeout);
  };
};

/**
 * Get analytics data
 */
export const getAnalyticsData = (callback: (data: AnalyticsData) => void): () => void => {
  try {
    const database = getDatabase(app);
    
    let unsubscribe;
    try {
      unsubscribe = onValue(ref(database, 'analytics'), (snapshot) => {
        const data = snapshot.val() as AnalyticsData || {
          browsers: {},
          devices: {},
          countries: {},
          os: {}
        };
        callback(data);
      });
    } catch (error) {
      console.error('Error subscribing to analytics data:', error);
      unsubscribe = () => {};
      
      // Provide fallback data
      callback({
        browsers: {},
        devices: {},
        countries: {},
        os: {}
      });
    }
    
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from analytics data:', error);
      }
    };
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return () => {};
  }
};

/**
 * Get visitors data
 */
export const getVisitorsData = (callback: (data: Record<string, VisitorInfo>) => void): () => void => {
  try {
    const database = getDatabase(app);
    
    let unsubscribe;
    try {
      unsubscribe = onValue(ref(database, 'visitors'), (snapshot) => {
        const data = snapshot.val() as Record<string, VisitorInfo> || {};
        callback(data);
      });
    } catch (error) {
      console.error('Error subscribing to visitors data:', error);
      unsubscribe = () => {};
      
      // Provide fallback empty data
      callback({});
    }
    
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from visitors data:', error);
      }
    };
  } catch (error) {
    console.error('Error getting visitors data:', error);
    return () => {};
  }
};

/**
 * Get page views data
 */
export const getPageViewsData = (callback: (data: Record<string, PageViewInfo>) => void): () => void => {
  try {
    const database = getDatabase(app);
    
    let unsubscribe;
    try {
      unsubscribe = onValue(ref(database, 'pageViews'), (snapshot) => {
        const data = snapshot.val() as Record<string, PageViewInfo> || {};
        callback(data);
      });
    } catch (error) {
      console.error('Error subscribing to page views data:', error);
      unsubscribe = () => {};
      
      // Provide fallback empty data
      callback({});
    }
    
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from page views data:', error);
      }
    };
  } catch (error) {
    console.error('Error getting page views data:', error);
    return () => {};
  }
};

/**
 * Track resume download event
 */
export const trackResumeDownload = async (): Promise<void> => {
  try {
    const database = getDatabase(app);
    const resumeStatsRef = ref(database, 'resumeStats');
    
    // Update download count
    await update(resumeStatsRef, {
      downloads: increment(1),
      lastDownload: serverTimestamp()
    });

    // Add to download history with visitor info
    const { browser, os, device } = getBrowserInfo();
    const { country, city } = await getLocationInfo();
    
    const downloadHistoryRef = ref(database, 'resumeDownloads');
    await push(downloadHistoryRef, {
      timestamp: serverTimestamp(),
      browser,
      os,
      device,
      country,
      city,
      path: window.location.pathname
    });

    console.log('Resume download tracked successfully');
  } catch (error) {
    console.error('Error tracking resume download:', error);
  }
};