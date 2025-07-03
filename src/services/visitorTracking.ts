import { db, database } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, set, get, update, onDisconnect, serverTimestamp } from 'firebase/database';

interface VisitorData {
  ip: string;
  userAgent: string;
  timestamp: number;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  blocked?: boolean;
  lastVisit?: number;
  visitCount?: number;
  path?: string;
}

interface PerformanceMetrics {
  loadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
}

// Function to detect browser
const detectBrowser = (userAgent: string): string => {
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown';
};

// Function to detect OS
const detectOS = (userAgent: string): string => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'MacOS';
  if (userAgent.includes('Linux') && !userAgent.includes('Android')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
};

// Function to detect device type
const detectDevice = (userAgent: string): string => {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
  return 'Desktop';
};

// Get visitor location from IP
const getLocationFromIP = async (ip: string): Promise<{country?: string, city?: string}> => {
  try {
    // Skip for localhost or private IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'Local', city: 'Development' };
    }
    
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    return {
      country: data.country_name,
      city: data.city
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {};
  }
};

export const trackVisitor = async (visitorData: VisitorData) => {
  try {
    // Enhance visitor data with browser, OS, and device info
    const enhancedData = {
      ...visitorData,
      browser: detectBrowser(visitorData.userAgent),
      os: detectOS(visitorData.userAgent),
      device: detectDevice(visitorData.userAgent),
      timestamp: Date.now(),
      lastVisit: Date.now()
    };
    
    // Get location data if not provided
    if (!enhancedData.country || !enhancedData.city) {
      const locationData = await getLocationFromIP(enhancedData.ip);
      enhancedData.country = locationData.country;
      enhancedData.city = locationData.city;
    }
    
    // Store in Firestore for detailed analytics
    const visitorsRef = collection(db, 'visitors');
    await addDoc(visitorsRef, enhancedData);

    // Update realtime stats in RTDB
    const statsRef = ref(database, 'stats/visitors');
    const currentStats = await get(statsRef);
    const stats = currentStats.val() || { total: 0, unique: {}, active: 0 };
    
    stats.total++;
    stats.unique[enhancedData.ip] = Date.now();
    
    await set(statsRef, stats);
    
    // Track active user
    const activeUserRef = ref(database, `activeUsers/${enhancedData.ip.replace(/\./g, '_')}`);
    await set(activeUserRef, {
      timestamp: Date.now(),
      userAgent: enhancedData.userAgent,
      country: enhancedData.country,
      browser: enhancedData.browser,
      os: enhancedData.os,
      device: enhancedData.device
    });
    
    // Remove user when disconnected
    onDisconnect(activeUserRef).remove();
    
    // Update visitor location for map
    if (enhancedData.country) {
      const countryRef = ref(database, `stats/visitorLocations/${enhancedData.country.replace(/\s+/g, '_')}`);
      const countrySnapshot = await get(countryRef);
      const countryData = countrySnapshot.val() || { 
        visits: 0, 
        country: enhancedData.country,
        city: enhancedData.city || 'Unknown',
        latitude: 0, // You would need a geocoding service for precise coordinates
        longitude: 0,
        lastVisit: new Date().toISOString()
      };
      
      countryData.visits++;
      countryData.lastVisit = new Date().toISOString();
      
      await set(countryRef, countryData);
    }

    return true;
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return false;
  }
};

export const blockIP = async (ip: string) => {
  try {
    const blockedIPsRef = ref(database, `blockedIPs/${ip.replace(/\./g, '_')}`);
    await set(blockedIPsRef, {
      blockedAt: Date.now(),
      status: 'blocked'
    });
    return true;
  } catch (error) {
    console.error('Error blocking IP:', error);
    return false;
  }
};

export const unblockIP = async (ip: string) => {
  try {
    const blockedIPsRef = ref(database, `blockedIPs/${ip.replace(/\./g, '_')}`);
    await set(blockedIPsRef, null);
    return true;
  } catch (error) {
    console.error('Error unblocking IP:', error);
    return false;
  }
};

export const isIPBlocked = async (ip: string) => {
  try {
    const blockedIPRef = ref(database, `blockedIPs/${ip.replace(/\./g, '_')}`);
    const snapshot = await get(blockedIPRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking IP block status:', error);
    return false;
  }
};

export const getVisitorStats = async () => {
  try {
    const statsRef = ref(database, 'stats');
    const snapshot = await get(statsRef);
    
    // Ensure we have a valid structure even if the database is empty
    const defaultStats = {
      views: {
        total: 0,
        today: 0,
        week: 0,
        month: 0
      },
      uniqueVisitors: {
        total: 0,
        today: 0,
        week: 0,
        month: 0
      },
      visitors: {
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        unique: {}
      },
      sessionDuration: {
        average: 0,
        count: 0,
        totalDuration: 0
      }
    };
    
    const stats = snapshot.val() || {};
    
    // Merge with default stats to ensure all properties exist
    return {
      ...defaultStats,
      ...stats,
      views: { ...defaultStats.views, ...(stats.views || {}) },
      uniqueVisitors: { ...defaultStats.uniqueVisitors, ...(stats.uniqueVisitors || {}) },
      visitors: { ...defaultStats.visitors, ...(stats.visitors || {}) },
      sessionDuration: { ...defaultStats.sessionDuration, ...(stats.sessionDuration || {}) }
    };
  } catch (error) {
    console.error('Error getting visitor stats:', error);
    return {
      views: { total: 0, today: 0, week: 0, month: 0 },
      uniqueVisitors: { total: 0, today: 0, week: 0, month: 0 },
      visitors: { total: 0, today: 0, week: 0, month: 0, unique: {} },
      sessionDuration: { average: 0, count: 0, totalDuration: 0 }
    };
  }
};

export const trackPerformance = async (metrics: PerformanceMetrics) => {
  try {
    const perfRef = ref(database, 'performance');
    const timestamp = Date.now();
    await set(ref(database, `performance/${timestamp}`), metrics);
    return true;
  } catch (error) {
    console.error('Error tracking performance:', error);
    return false;
  }
};

export const getVisitorMap = async () => {
  try {
    // Try to get data from RTDB first (more reliable)
    if (database) {
      try {
        const statsRef = ref(database, 'analytics/countries');
        const snapshot = await get(statsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const visitorsByCountry = {};
          
          Object.entries(data).forEach(([country, stats]: [string, any]) => {
            const countryName = country.replace(/_/g, ' ');
            visitorsByCountry[countryName] = stats.count || 0;
          });
          
          if (Object.keys(visitorsByCountry).length > 0) {
            return visitorsByCountry;
          }
        }
      } catch (rtdbError) {
        console.error('Error getting visitor map from RTDB:', rtdbError);
      }
    }
    
    // Fallback to Firestore if RTDB fails or returns empty data
    if (db) {
      try {
        const visitorsRef = collection(db, 'countryStats');
        const snapshot = await getDocs(visitorsRef);
        const visitorsByCountry = {};
        
        if (!snapshot.empty) {
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.country) {
              visitorsByCountry[data.country] = data.count || 1;
            }
          });
          
          if (Object.keys(visitorsByCountry).length > 0) {
            return visitorsByCountry;
          }
        }
        
        // Try the visitors collection as a last resort
        const visitorsCollection = collection(db, 'visitors');
        const visitorsSnapshot = await getDocs(visitorsCollection);
        
        if (!visitorsSnapshot.empty) {
          visitorsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.country) {
              visitorsByCountry[data.country] = (visitorsByCountry[data.country] || 0) + 1;
            }
          });
          
          if (Object.keys(visitorsByCountry).length > 0) {
            return visitorsByCountry;
          }
        }
      } catch (firestoreError) {
        console.error('Error getting visitor map from Firestore:', firestoreError);
      }
    }
    
    // Return sample data if both methods fail
    return {
      'United States': 120,
      'India': 85,
      'United Kingdom': 65,
      'Germany': 45,
      'Canada': 35,
      'Australia': 30,
      'France': 25,
      'Brazil': 20,
      'Japan': 15,
      'China': 10
    };
  } catch (error) {
    console.error('Error getting visitor map:', error);
    return {
      'United States': 120,
      'India': 85,
      'United Kingdom': 65,
      'Germany': 45,
      'Canada': 35
    };
  }
};

export const getDeviceStats = async () => {
  try {
    // Try to get data from RTDB first (more reliable)
    if (database) {
      try {
        const analyticsRef = ref(database, 'analytics');
        const snapshot = await get(analyticsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const stats = {
            browsers: {},
            os: {},
            devices: {}
          };
          
          // Process browsers
          if (data.browsers) {
            Object.entries(data.browsers).forEach(([browser, info]: [string, any]) => {
              stats.browsers[browser] = info.count || 0;
            });
          }
          
          // Process OS
          if (data.os) {
            Object.entries(data.os).forEach(([os, info]: [string, any]) => {
              stats.os[os] = info.count || 0;
            });
          }
          
          // Process devices
          if (data.devices) {
            Object.entries(data.devices).forEach(([device, info]: [string, any]) => {
              stats.devices[device] = info.count || 0;
            });
          }
          
          if (Object.keys(stats.browsers).length > 0 || 
              Object.keys(stats.os).length > 0 || 
              Object.keys(stats.devices).length > 0) {
            return stats;
          }
        }
      } catch (rtdbError) {
        console.error('Error getting device stats from RTDB:', rtdbError);
      }
    }
    
    // Fallback to Firestore if RTDB fails or returns empty data
    if (db) {
      try {
        // Try deviceStats collection first
        const deviceStatsRef = collection(db, 'deviceStats');
        const deviceSnapshot = await getDocs(deviceStatsRef);
        
        if (!deviceSnapshot.empty) {
          const stats = {
            browsers: {},
            os: {},
            devices: {}
          };
          
          deviceSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'browser' && data.name) {
              stats.browsers[data.name] = data.count || 1;
            } else if (data.type === 'os' && data.name) {
              stats.os[data.name] = data.count || 1;
            } else if (data.type === 'device' && data.name) {
              stats.devices[data.name] = data.count || 1;
            }
          });
          
          if (Object.keys(stats.browsers).length > 0 || 
              Object.keys(stats.os).length > 0 || 
              Object.keys(stats.devices).length > 0) {
            return stats;
          }
        }
        
        // Try visitors collection as a last resort
        const visitorsRef = collection(db, 'visitors');
        const snapshot = await getDocs(visitorsRef);
        
        if (!snapshot.empty) {
          const stats = {
            browsers: {},
            os: {},
            devices: {}
          };
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.browser) stats.browsers[data.browser] = (stats.browsers[data.browser] || 0) + 1;
            if (data.os) stats.os[data.os] = (stats.os[data.os] || 0) + 1;
            if (data.device) stats.devices[data.device] = (stats.devices[data.device] || 0) + 1;
          });
          
          if (Object.keys(stats.browsers).length > 0 || 
              Object.keys(stats.os).length > 0 || 
              Object.keys(stats.devices).length > 0) {
            return stats;
          }
        }
      } catch (firestoreError) {
        console.error('Error getting device stats from Firestore:', firestoreError);
      }
    }
    
    // Return sample data if both methods fail
    return {
      browsers: {
        'Chrome': 450,
        'Firefox': 200,
        'Safari': 150,
        'Edge': 100,
        'Opera': 50
      },
      os: {
        'Windows': 400,
        'MacOS': 200,
        'Linux': 50,
        'iOS': 150,
        'Android': 150
      },
      devices: {
        'Desktop': 600,
        'Mobile': 300,
        'Tablet': 50
      }
    };
  } catch (error) {
    console.error('Error getting device stats:', error);
    return { 
      browsers: {
        'Chrome': 450,
        'Firefox': 200,
        'Safari': 150
      },
      os: {
        'Windows': 400,
        'MacOS': 200,
        'Linux': 50
      },
      devices: {
        'Desktop': 600,
        'Mobile': 300
      }
    };
  }
};