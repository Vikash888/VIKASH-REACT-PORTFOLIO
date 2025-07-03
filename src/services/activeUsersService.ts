import { ref, onValue, set, get, onDisconnect, update, getDatabase, remove } from 'firebase/database';
import { app } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

// Initialize database
const database = getDatabase(app);

// Visitor status types
type VisitorStatus = 'active' | 'inactive' | 'blocked';

interface ActiveUser {
  timestamp: number;
  sessionId: string;
  visitorId: string;
  ipAddress: string; // Added IP address field
  browser: string;
  os: string;
  device: string;
  country?: string;
  city?: string;
  page: string;
  lastActivity: number;
  active: boolean;
  status: VisitorStatus; // Added status field
  totalVisits?: number; // Track total number of visits
  firstVisit?: number; // Track first visit timestamp
}

interface VisitorCount {
  count: number;
  timestamp: number;
}

interface ActiveUserStats {
  current: number;
  history: VisitorCount[];
}

interface BlockedVisitor {
  visitorId: string;
  ipAddress: string;
  country?: string;
  reason?: string;
  timestamp: number;
  blockedBy?: string;
}

interface BlockedCountry {
  countryCode: string;
  countryName?: string;
  reason?: string;
  timestamp: number;
  blockedBy?: string;
}

/**
 * Gets browser and device information from user agent
 */
const getBrowserInfo = (): { browser: string; os: string; device: string } => {
  const ua = navigator.userAgent;
  
  // Browser detection
  let browser = "Unknown";
  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Browser";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
  else if (ua.indexOf("Edge") > -1) browser = "Edge";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";
  else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident/") > -1) browser = "Internet Explorer";
  
  // OS detection
  let os = "Unknown";
  if (ua.indexOf("Windows") > -1) os = "Windows";
  else if (ua.indexOf("Mac") > -1) os = "MacOS";
  else if (ua.indexOf("Android") > -1) os = "Android";
  else if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) os = "iOS";
  else if (ua.indexOf("Linux") > -1) os = "Linux";
  
  // Device detection
  let device = "Desktop";
  if (ua.indexOf("Mobile") > -1) device = "Mobile";
  else if (ua.indexOf("Tablet") > -1 || ua.indexOf("iPad") > -1) device = "Tablet";
  
  return { browser, os, device };
};

/**
 * Gets user location and IP information
 */
const getLocationInfo = async (): Promise<{ ipAddress: string; country: string; city: string }> => {
  try {
    // Using ipinfo.io for IP-based geolocation
    const response = await fetch('https://ipinfo.io/json');
    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }
    const data = await response.json();
    return {
      ipAddress: data.ip || 'Unknown',
      country: data.country || 'Unknown', 
      city: data.city || 'Unknown'
    };
  } catch (error) {
    console.error('Error fetching location info:', error);
    return { ipAddress: 'Unknown', country: 'Unknown', city: 'Unknown' };
  }
};

/**
 * Starts tracking the current user as active
 * Updates their status every 10 seconds and removes them when they leave
 * Checks if visitor or their country is blocked before tracking
 */
export const trackActiveUser = async (): Promise<() => void> => {
  try {
    // Create a unique session ID for this visit
    const sessionId = uuidv4();
    
    // Get or create a persistent visitor ID
    let visitorId = localStorage.getItem('visitor-id');
    if (!visitorId) {
      visitorId = uuidv4();
      localStorage.setItem('visitor-id', visitorId);
    }
    
    // Get user info
    const { browser, os, device } = getBrowserInfo();
    const { ipAddress, country, city } = await getLocationInfo();
    
    // Check if the user or their country is blocked
    const blockedVisitorRef = ref(database, `blockedVisitors/${visitorId}`);
    const blockedIpRef = ref(database, `blockedIps/${ipAddress.replace(/\./g, '_')}`);
    const blockedCountryRef = ref(database, `blockedCountries/${country}`);
    
    const [visitorBlocked, ipBlocked, countryBlocked] = await Promise.all([
      get(blockedVisitorRef),
      get(blockedIpRef),
      get(blockedCountryRef)
    ]);
    
    // If blocked, don't track and return empty cleanup function
    if (visitorBlocked.exists() || ipBlocked.exists() || countryBlocked.exists()) {
      console.log('Visitor blocked from tracking', { visitorId, ipAddress, country });
      return () => {};
    }
    
    // Set up database reference
    const userRef = ref(database, `activeUsers/${sessionId}`);
    
    // Check visit history for this visitor
    const visitorHistoryRef = ref(database, `visitorHistory/${visitorId}`);
    const historySnap = await get(visitorHistoryRef);
    const history = historySnap.exists() ? historySnap.val() : { totalVisits: 0, firstVisit: Date.now() };
    
    // Update visit count
    const visitorHistory = {
      totalVisits: history.totalVisits + 1,
      firstVisit: history.firstVisit,
      lastVisit: Date.now()
    };
    
    await set(visitorHistoryRef, visitorHistory);
    
    // Initial user data
    const now = Date.now();
    const userData: ActiveUser = {
      timestamp: now,
      sessionId,
      visitorId,
      ipAddress,
      browser,
      os,
      device,
      country,
      city,
      page: window.location.pathname,
      lastActivity: now,
      status: 'active',
      active: true,
      totalVisits: visitorHistory.totalVisits,
      firstVisit: visitorHistory.firstVisit
    };
    
    // Initial database update
    await set(userRef, userData);
    
    // Set up automatic removal when connection is lost
    onDisconnect(userRef).remove();
    
    // Update active status every 10 seconds
    // Update more frequently for real-time data (every 3 seconds)
    const interval = setInterval(async () => {
      const currentTime = Date.now();
      await update(userRef, {
        lastActivity: currentTime,
        active: true,
        page: window.location.pathname // Update current page if user navigates
      });
    }, 3000);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Mark user as inactive when tab is hidden
        update(userRef, { active: false, status: 'inactive' });
      } else {
        // Mark as active again when tab becomes visible
        update(userRef, { 
          active: true,
          status: 'active',
          lastActivity: Date.now() 
        });
      }
    });
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      remove(userRef); // Remove user when component unmounts
    };
  } catch (error) {
    console.error('Failed to track active user:', error);
    return () => {}; // Empty cleanup function
  }
};

/**
 * Subscribes to real-time active users count 
 * Returns an unsubscribe function
 */
export const subscribeToActiveUsers = (callback: (stats: ActiveUserStats) => void): () => void => {
  // Reference to active users in database
  const activeUsersRef = ref(database, 'activeUsers');
  const historyRef = ref(database, 'activeUsersHistory');
  
  // Keep history of active user counts for the chart
  const recordHistory = async (count: number) => {
    try {
      // Get current history
      const snapshot = await get(historyRef);
      let history: VisitorCount[] = snapshot.exists() ? snapshot.val() : [];
      
      // Add new data point
      const newDataPoint: VisitorCount = {
        count,
        timestamp: Date.now()
      };

      // For real-time visualization, maintain more frequent data points
      // but trim older ones to prevent performance issues
      
      // If we have too many points in the last minute, we can skip recording
      // to avoid overwhelming the database and visualization
      const lastMinute = Date.now() - 60000;
      const recentPoints = history.filter(point => point.timestamp > lastMinute);
      
      // If we have more than 20 points in the last minute and count hasn't changed much, skip
      const shouldSkip = recentPoints.length > 20 && 
                        recentPoints.some(point => Math.abs(point.count - count) < 2);
      
      if (!shouldSkip) {
        // Prioritize keeping very recent data (last 5 minutes) at higher resolution
        const fiveMinutesAgo = Date.now() - 300000;
        const recentHistory = history.filter(point => point.timestamp > fiveMinutesAgo);
        
        // Keep older data at lower resolution (one point per minute)
        const olderHistory = history
          .filter(point => point.timestamp <= fiveMinutesAgo)
          .reduce((acc: VisitorCount[], point) => {
            // Keep approximately one point per minute for older data
            const minuteBucket = Math.floor(point.timestamp / 60000);
            if (!acc.some(p => Math.floor(p.timestamp / 60000) === minuteBucket)) {
              acc.push(point);
            }
            return acc;
          }, []);
        
        // Combine histories and add new data point
        history = [...olderHistory, ...recentHistory, newDataPoint].slice(-200);
        
        // Update database
        await set(historyRef, history);
      }
    } catch (error) {
      console.error('Error updating active users history:', error);
    }
  };
  
  // Subscribe to changes
  const unsubscribe = onValue(activeUsersRef, async (snapshot) => {
    try {
      // Default to empty object if no data
      const data = snapshot.val() || {};
      console.log("Raw data from Firebase:", data);
      
      // Current time to check for activity
      const now = Date.now();
      
      // Filter for active users with activity in the last 30 seconds
      const activeUsers = Object.values(data).filter((user: any) => {
        if (!user || !user.lastActivity || !user.active) {
            console.log("Filtering out user due to missing data or inactive status:", user);
            return false;
        }
        
        // Filter out blocked users
        if (user.status === 'blocked') {
            console.log("Filtering out blocked user:", { sessionId: user.sessionId, visitorId: user.visitorId });
            return false;
        }
        
        const timeSinceActivity = now - user.lastActivity;
        
        const isRecentlyActive = timeSinceActivity < 30000; // 30 seconds
        if (!isRecentlyActive) {
            console.log("Filtering out user due to inactivity:", { sessionId: user.sessionId, timeSinceActivity });
            return false;
        }

        const hasRequiredFields = typeof user.sessionId === 'string' &&
                                  typeof user.visitorId === 'string' &&
                                  typeof user.browser === 'string' &&
                                  typeof user.device === 'string';

        if (!hasRequiredFields) {
            console.log("Filtering out user due to missing fields:", user);
            return false;
        }

        return true;
      });
      
      // Deduplicate by visitorId
      const uniqueUsersMap = new Map();
      activeUsers.forEach((user: any) => {
        // Use visitorId as a unique key
        if (user.visitorId) {
          uniqueUsersMap.set(user.visitorId, user);
        }
      });
      const uniqueActiveUsers = Array.from(uniqueUsersMap.values());
      console.log('Filtered unique active users:', uniqueActiveUsers);
      // Count active users - use deduplicated count
      const count = uniqueActiveUsers.length;
      
      // Record for history
      await recordHistory(count);
      
      // Get history for chart
      const historySnapshot = await get(historyRef);
      const history: VisitorCount[] = historySnapshot.exists() ? historySnapshot.val() : [];
      
      // Call the callback with current stats
      callback({
        current: count,
        history
      });
      
    } catch (error) {
      console.error('Error processing active users data:', error);
      // Provide fallback data
      callback({
        current: 0,
        history: []
      });
    }
  });
  
  // Return unsubscribe function
  return unsubscribe;
};

/**
 * Cleans up inactive users older than 30 seconds
 * Should be called periodically by a background process
 * Preserves historical visitor data while cleaning up active sessions
 */
export const cleanupInactiveUsers = async (): Promise<void> => {
  try {
    const activeUsersRef = ref(database, 'activeUsers');
    const snapshot = await get(activeUsersRef);
    
    if (!snapshot.exists()) return;
    
    const data = snapshot.val();
    const now = Date.now();
    const inactiveThreshold = 30000; // 30 seconds
    
    // Keep track of sessions to remove
    const updates: Record<string, null> = {};
    // Keep track of visitor data to preserve in history
    const visitorHistoryUpdates: Record<string, any> = {};
    
    // Find users who haven't been active for more than 30 seconds
    // OR have invalid/incomplete data structure
    Object.entries(data).forEach(([sessionId, user]: [string, any]) => {
      // Check for inactivity
      const timeSinceActivity = now - (user?.lastActivity || user?.timestamp || 0);
      
      // Check for valid data structure
      const isValidUser = user && 
                         typeof user.sessionId === 'string' &&
                         typeof user.visitorId === 'string' &&
                         typeof user.browser === 'string' &&
                         typeof user.device === 'string' &&
                         typeof user.lastActivity === 'number';
      
      // Need to remove if:
      // 1. User inactive for too long
      // 2. Invalid data structure
      // 3. User is blocked
      const needsRemoval = timeSinceActivity > inactiveThreshold || 
                          !isValidUser || 
                          user.status === 'blocked';
      
      if (needsRemoval) {
        updates[sessionId] = null; // Mark session for removal
        
        // If we have valid visitor ID, update history
        if (isValidUser && user.visitorId) {
          // Track last activity in visitor history to maintain visitor stats
          visitorHistoryUpdates[`visitorHistory/${user.visitorId}/lastVisit`] = 
            Math.max(user.lastActivity || user.timestamp, now - inactiveThreshold);
        }
      }
    });
    
    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      console.log(`Cleaning up ${Object.keys(updates).length} inactive or invalid entries`);
      await update(activeUsersRef, updates);
    }
    
    // Update visitor history
    if (Object.keys(visitorHistoryUpdates).length > 0) {
      await update(ref(database), visitorHistoryUpdates);
    }
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
};

/**
 * Starts background cleanup process
 * Returns a function to stop the cleanup
 */
export const startAutoCleanup = (): () => void => {
  const interval = setInterval(cleanupInactiveUsers, 5000); // Run more frequently (every 5 seconds) for real-time updates
  return () => clearInterval(interval);
};

/**
 * Debug function to clean up the active users database
 * This does a thorough cleanup of all invalid entries
 * Also handles updating visitor history for reporting
 */
export const debugAndFixActiveUsers = async (): Promise<void> => {
  try {
    console.log("Starting database cleanup for active users...");
    const activeUsersRef = ref(database, 'activeUsers');
    const historyRef = ref(database, 'activeUsersHistory');
    const visitorHistoryRef = ref(database, 'visitorHistory');
    
    // Get all entries
    const activeSnapshot = await get(activeUsersRef);
    if (!activeSnapshot.exists()) {
      console.log("No active users data found");
      return;
    }
    
    const data = activeSnapshot.val();
    const entries = Object.entries(data);
    console.log(`Found ${entries.length} total entries in active users database`);
    
    // Check each entry
    let validCount = 0;
    let invalidCount = 0;
    let inactiveCount = 0;
    let blockedCount = 0;
    const now = Date.now();
    const updates: Record<string, null> = {};
    const visitorUpdates: Record<string, any> = {};
    
    // Get blocked lists to check if any active users are now blocked
    const [blockedVisitorsSnap, blockedIpsSnap, blockedCountriesSnap] = await Promise.all([
      get(ref(database, 'blockedVisitors')),
      get(ref(database, 'blockedIps')),
      get(ref(database, 'blockedCountries'))
    ]);
    
    const blockedVisitors = blockedVisitorsSnap.exists() ? blockedVisitorsSnap.val() : {};
    const blockedIps = blockedIpsSnap.exists() ? blockedIpsSnap.val() : {};
    const blockedCountries = blockedCountriesSnap.exists() ? blockedCountriesSnap.val() : {};
    
    entries.forEach(([sessionId, user]: [string, any]) => {
      // Check if it's a valid user object with required fields
      const isValidObject = user && 
                         typeof user === 'object' && 
                         typeof user.sessionId === 'string' && 
                         typeof user.visitorId === 'string' &&
                         typeof user.lastActivity === 'number' &&
                         typeof user.active === 'boolean';
                         
      // Check if it's recently active (last 5 minutes)
      const isRecentlyActive = user && 
                             typeof user.lastActivity === 'number' && 
                             (now - user.lastActivity) < 300000; // 5 minutes
      
      // Check if the visitor or their IP/country is blocked
      const isBlocked = isValidObject && (
        (user.visitorId && blockedVisitors[user.visitorId]) ||
        (user.ipAddress && blockedIps[user.ipAddress.replace(/\./g, '_')]) ||
        (user.country && blockedCountries[user.country])
      );
      
      if (!isValidObject) {
        invalidCount++;
        updates[sessionId] = null; // Remove invalid entry
      } else if (isBlocked) {
        blockedCount++;
        updates[sessionId] = null; // Remove blocked entry
      } else if (!isRecentlyActive) {
        inactiveCount++;
        updates[sessionId] = null; // Remove inactive entry
        
        // Update visitor history
        if (user.visitorId) {
          visitorUpdates[user.visitorId] = {
            lastVisit: user.lastActivity || user.timestamp || now,
            device: user.device,
            browser: user.browser,
            os: user.os,
            country: user.country,
            ipAddress: user.ipAddress
          };
        }
      } else {
        validCount++;
        
        // Ensure status field exists
        if (!user.status) {
          const updatePath = `activeUsers/${sessionId}/status`;
          visitorUpdates[updatePath] = 'active';
        }
        
        // Ensure IP address field exists
        if (!user.ipAddress && user.visitorId) {
          // We'll need to update this next time user connects
          const updatePath = `visitorHistory/${user.visitorId}/needsIpUpdate`;
          visitorUpdates[updatePath] = true;
        }
      }
    });
    
    console.log(`Analysis complete: ${validCount} valid users, ${invalidCount} invalid entries, ${inactiveCount} inactive entries, ${blockedCount} blocked entries`);
    
    // Clean up the database if needed
    if (Object.keys(updates).length > 0) {
      console.log(`Removing ${Object.keys(updates).length} problematic entries`);
      await update(activeUsersRef, updates);
      console.log("Active users cleanup complete");
      
      // Reset history to prevent continuing to show inflated numbers
      console.log("Resetting visitor history to reflect accurate counts");
      const historyData: VisitorCount[] = [{
        count: validCount,
        timestamp: now
      }];
      await set(historyRef, historyData);
      console.log("Active users history reset complete");
    } else {
      console.log("No cleanup needed in active users, all entries are valid");
    }
    
    // Update visitor history records
    if (Object.keys(visitorUpdates).length > 0) {
      console.log(`Updating history for ${Object.keys(visitorUpdates).length} visitors`);
      
      // Get existing visitor history
      const visitorHistorySnap = await get(visitorHistoryRef);
      const visitorHistory = visitorHistorySnap.exists() ? visitorHistorySnap.val() : {};
      
      // Apply updates to visitor history
      for (const [visitorId, data] of Object.entries(visitorUpdates)) {
        if (typeof data === 'object') {
          // This is a visitor record
          if (!visitorHistory[visitorId]) {
            visitorHistory[visitorId] = {
              firstVisit: data.lastVisit,
              totalVisits: 1
            };
          }
          
          // Update with latest visitor data
          visitorHistory[visitorId] = {
            ...visitorHistory[visitorId],
            ...data
          };
        } else {
          // This is a direct update to a path
          // These are applied at the end
        }
      }
      
      // Update visitor history
      await set(visitorHistoryRef, visitorHistory);
      console.log("Visitor history updated");
    }
    
    return;
  } catch (error) {
    console.error("Error in debug function:", error);
  }
};

/**
 * Block a visitor by their visitor ID
 * @param visitorId The unique visitor ID to block
 * @param reason Optional reason for blocking
 * @param blockedBy Optional identifier of who blocked the visitor
 */
export const blockVisitor = async (visitorId: string, reason?: string, blockedBy?: string): Promise<void> => {
  try {
    // Get visitor details first to store with the block record
    const activeUserRef = ref(database, `activeUsers`);
    const activeSnap = await get(activeUserRef);
    
    // Find the most recent active session for this visitor
    let visitorData = { ipAddress: 'Unknown', country: 'Unknown' };
    
    if (activeSnap.exists()) {
      const activeUsers = activeSnap.val();
      const matchingSession = Object.values(activeUsers).find(
        (user: any) => user?.visitorId === visitorId
      );
      
      if (matchingSession) {
        visitorData = {
          ipAddress: (matchingSession as any).ipAddress || 'Unknown',
          country: (matchingSession as any).country || 'Unknown'
        };
      }
    }
    
    // Create block record
    const blockData = {
      visitorId,
      ipAddress: visitorData.ipAddress,
      country: visitorData.country,
      reason: reason || 'Manually blocked',
      timestamp: Date.now(),
      blockedBy: blockedBy || 'admin'
    };
    
    // Add to blocked visitors collection
    await set(ref(database, `blockedVisitors/${visitorId}`), blockData);
    
    // Also block IP address if available
    if (visitorData.ipAddress !== 'Unknown') {
      const safeIpKey = visitorData.ipAddress.replace(/\./g, '_');
      await set(ref(database, `blockedIps/${safeIpKey}`), {
        ...blockData,
        visitorId // reference back to visitor ID
      });
    }
    
    // Remove any active sessions for this visitor
    if (activeSnap.exists()) {
      const updates: Record<string, null> = {};
      const activeUsers = activeSnap.val();
      
      Object.entries(activeUsers).forEach(([sessionId, user]: [string, any]) => {
        if (user?.visitorId === visitorId) {
          updates[sessionId] = null;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(activeUserRef, updates);
      }
    }
  } catch (error) {
    console.error('Error blocking visitor:', error);
    throw new Error('Failed to block visitor');
  }
};

/**
 * Unblock a previously blocked visitor
 * @param visitorId The unique visitor ID to unblock
 */
export const unblockVisitor = async (visitorId: string): Promise<void> => {
  try {
    // Check if visitor is blocked
    const blockedRef = ref(database, `blockedVisitors/${visitorId}`);
    const blockedSnap = await get(blockedRef);
    
    if (blockedSnap.exists()) {
      // Get IP address to unblock that too
      const blockData = blockedSnap.val();
      
      // Remove from blocked visitors
      await remove(blockedRef);
      
      // Also unblock the IP if it exists
      if (blockData.ipAddress) {
        const safeIpKey = blockData.ipAddress.replace(/\./g, '_');
        await remove(ref(database, `blockedIps/${safeIpKey}`));
      }
    }
  } catch (error) {
    console.error('Error unblocking visitor:', error);
    throw new Error('Failed to unblock visitor');
  }
};

/**
 * Block a country from accessing the site
 * @param countryCode The two-letter country code (ISO 3166-1 alpha-2)
 * @param countryName Optional full country name
 * @param reason Optional reason for blocking
 */
export const blockCountry = async (countryCode: string, countryName?: string, reason?: string): Promise<void> => {
  if (!countryCode || countryCode.length !== 2) {
    throw new Error('Invalid country code. Please provide a valid 2-letter country code.');
  }
  
  try {
    await set(ref(database, `blockedCountries/${countryCode}`), {
      countryCode,
      countryName: countryName || countryCode,
      reason: reason || 'Manually blocked',
      timestamp: Date.now()
    });
    
    // Remove active sessions from this country
    const activeUserRef = ref(database, `activeUsers`);
    const activeSnap = await get(activeUserRef);
    
    if (activeSnap.exists()) {
      const updates: Record<string, null> = {};
      const activeUsers = activeSnap.val();
      
      Object.entries(activeUsers).forEach(([sessionId, user]: [string, any]) => {
        if (user?.country === countryCode) {
          updates[sessionId] = null;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(activeUserRef, updates);
      }
    }
  } catch (error) {
    console.error('Error blocking country:', error);
    throw new Error('Failed to block country');
  }
};

/**
 * Unblock a previously blocked country
 * @param countryCode The two-letter country code to unblock
 */
export const unblockCountry = async (countryCode: string): Promise<void> => {
  try {
    await remove(ref(database, `blockedCountries/${countryCode}`));
  } catch (error) {
    console.error('Error unblocking country:', error);
    throw new Error('Failed to unblock country');
  }
};

/**
 * Get a list of all blocked visitors
 */
export const getBlockedVisitors = async (): Promise<Record<string, any>> => {
  try {
    const blockedRef = ref(database, 'blockedVisitors');
    const snapshot = await get(blockedRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error('Error retrieving blocked visitors:', error);
    return {};
  }
};

/**
 * Get a list of all blocked IPs
 */
export const getBlockedIps = async (): Promise<Record<string, any>> => {
  try {
    const blockedRef = ref(database, 'blockedIps');
    const snapshot = await get(blockedRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error('Error retrieving blocked IPs:', error);
    return {};
  }
};

/**
 * Get a list of all blocked countries
 */
export const getBlockedCountries = async (): Promise<Record<string, any>> => {
  try {
    const blockedRef = ref(database, 'blockedCountries');
    const snapshot = await get(blockedRef);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error('Error retrieving blocked countries:', error);
    return {};
  }
};

/**
 * Get all visitor data with their history and status
 */
export const getAllVisitorData = async (): Promise<any[]> => {
  try {
    // Get all the required data
    const [activeUsersSnap, visitorHistorySnap, blockedVisitorsSnap, blockedIpsSnap, blockedCountriesSnap] = await Promise.all([
      get(ref(database, 'activeUsers')),
      get(ref(database, 'visitorHistory')),
      get(ref(database, 'blockedVisitors')),
      get(ref(database, 'blockedIps')),
      get(ref(database, 'blockedCountries'))
    ]);
    
    // Convert to easy to use objects
    const activeUsers = activeUsersSnap.exists() ? activeUsersSnap.val() : {};
    const visitorHistory = visitorHistorySnap.exists() ? visitorHistorySnap.val() : {};
    const blockedVisitors = blockedVisitorsSnap.exists() ? blockedVisitorsSnap.val() : {};
    const blockedIps = blockedIpsSnap.exists() ? blockedIpsSnap.val() : {};
    const blockedCountries = blockedCountriesSnap.exists() ? blockedCountriesSnap.val() : {};
    
    // Create a map of visitor IDs to aggregate all data
    const visitorMap: Record<string, any> = {};
    
    // Process visitor history
    Object.entries(visitorHistory).forEach(([visitorId, data]: [string, any]) => {
      visitorMap[visitorId] = {
        visitorId,
        totalVisits: data.totalVisits || 0,
        firstVisit: data.firstVisit || Date.now(),
        lastVisit: data.lastVisit || Date.now(),
        active: false,
        status: 'inactive',
        sessions: []
      };
    });
    
    // Process active users
    Object.values(activeUsers).forEach((user: any) => {
      if (!user || !user.visitorId) return;
      
      const { visitorId } = user;
      
      if (!visitorMap[visitorId]) {
        visitorMap[visitorId] = {
          visitorId,
          totalVisits: 0,
          firstVisit: user.timestamp,
          active: false,
          status: 'inactive',
          sessions: []
        };
      }
      
      // Update visitor with latest data
      visitorMap[visitorId].lastVisit = Math.max(
        visitorMap[visitorId].lastVisit || 0, 
        user.lastActivity || user.timestamp
      );
      visitorMap[visitorId].ipAddress = user.ipAddress;
      visitorMap[visitorId].browser = user.browser;
      visitorMap[visitorId].os = user.os;
      visitorMap[visitorId].device = user.device;
      visitorMap[visitorId].country = user.country;
      visitorMap[visitorId].city = user.city;
      
      // Add session
      visitorMap[visitorId].sessions.push({
        sessionId: user.sessionId,
        page: user.page,
        timestamp: user.timestamp,
        lastActivity: user.lastActivity
      });
      
      // Set as active if any session is active
      if (user.active) {
        visitorMap[visitorId].active = true;
        visitorMap[visitorId].status = 'active';
      }
    });
    
    // Mark blocked visitors
    Object.keys(blockedVisitors).forEach(visitorId => {
      if (visitorMap[visitorId]) {
        visitorMap[visitorId].status = 'blocked';
        visitorMap[visitorId].blockReason = blockedVisitors[visitorId].reason;
        visitorMap[visitorId].blockedAt = blockedVisitors[visitorId].timestamp;
      }
    });
    
    // Mark visitors with blocked IPs
    Object.values(blockedIps).forEach((data: any) => {
      if (data.visitorId && visitorMap[data.visitorId]) {
        visitorMap[data.visitorId].status = 'blocked';
        visitorMap[data.visitorId].blockReason = data.reason || 'IP address blocked';
        visitorMap[data.visitorId].blockedAt = data.timestamp;
      }
    });
    
    // Mark visitors from blocked countries
    Object.values(visitorMap).forEach((visitor: any) => {
      const country = visitor.country;
      if (country && blockedCountries[country]) {
        visitor.status = 'blocked';
        visitor.blockReason = `Country blocked: ${blockedCountries[country].countryName || country}`;
        visitor.blockedAt = blockedCountries[country].timestamp;
      }
    });
    
    return Object.values(visitorMap);
  } catch (error) {
    console.error('Error retrieving visitor data:', error);
    return [];
  }
};
