import { database } from '../config/firebase';
import { ref, onValue, off, get, query, orderByChild, startAt } from 'firebase/database';

export interface VisitorGeoData {
  id: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  timestamp: number;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  sessionId: string;
  path: string;
  referrer: string;
}

export interface ProcessedVisitorData {
  locations: {
    lat: number;
    lng: number;
    country: string;
    city: string;
    count: number;
    recentVisits: number;
    lastVisit: string;
  }[];
  countries: {
    [key: string]: {
      count: number;
      percentage: number;
      growth: number;
    };
  };
  stats: {
    totalVisitors: number;
    activeCountries: number;
    topCountry: string;
    recentVisits: number;
    averageSessionTime: number;
    topBrowser: string;
    topDevice: string;
  };
}

export class RealTimeVisitorAnalytics {
  private listeners: { [key: string]: any } = {};
  private cache: ProcessedVisitorData | null = null;
  private lastFetch: number = 0;
  private CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    this.initializeRealTimeListeners();
  }

  /**
   * Initialize real-time listeners for visitor data
   */
  private initializeRealTimeListeners() {
    if (!database) return;

    // Listen for new visitor geo data
    const geoDataRef = ref(database, 'visitorGeoData');
    const geoListener = onValue(geoDataRef, () => {
      this.invalidateCache();
    });

    this.listeners['geoData'] = geoListener;

    // Listen for active users
    const activeUsersRef = ref(database, 'activeUsers');
    const activeUsersListener = onValue(activeUsersRef, () => {
      this.invalidateCache();
    });

    this.listeners['activeUsers'] = activeUsersListener;
  }

  /**
   * Get visitor analytics data with caching
   */
  async getVisitorAnalytics(timeFilter: '24h' | '7d' | '30d' | 'all' = 'all'): Promise<ProcessedVisitorData> {
    const now = Date.now();
    
    // Return cached data if valid
    if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const data = await this.fetchVisitorData(timeFilter);
      this.cache = data;
      this.lastFetch = now;
      return data;
    } catch (error) {
      console.error('Error fetching visitor analytics:', error);
      // Return empty data instead of mock data
      return this.getEmptyData();
    }
  }

  /**
   * Fetch visitor data from Firebase
   */
  private async fetchVisitorData(timeFilter: string): Promise<ProcessedVisitorData> {
    if (!database) {
      throw new Error('Firebase database not initialized');
    }

    const now = Date.now();
    let startTime = 0;

    switch (timeFilter) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = 0;
    }

    // Fetch visitor geo data
    const geoDataRef = ref(database, 'visitorGeoData');
    const geoQuery = startTime > 0 
      ? query(geoDataRef, orderByChild('timestamp'), startAt(startTime))
      : geoDataRef;

    const snapshot = await get(geoQuery);
    
    if (!snapshot.exists()) {
      // Return empty data if no visitors found
      return this.getEmptyData();
    }

    const rawData = snapshot.val();
    return this.processVisitorData(rawData, now);
  }

  /**
   * Process raw visitor data into structured format
   */
  private processVisitorData(rawData: any, currentTime: number): ProcessedVisitorData {
    const locationMap = new Map<string, any>();
    const countryCount: { [key: string]: number } = {};
    const browserCount: { [key: string]: number } = {};
    const deviceCount: { [key: string]: number } = {};
    const sessionTimes: number[] = [];
    
    let totalVisitors = 0;
    let recentVisits = 0;
    const recentThreshold = currentTime - 24 * 60 * 60 * 1000; // 24 hours ago

    // Process each visitor entry
    Object.values(rawData).forEach((entry: any) => {
      if (!entry.lat || !entry.lng || !entry.country) return;

      totalVisitors++;
      const isRecent = entry.timestamp > recentThreshold;
      if (isRecent) recentVisits++;

      const locationKey = `${entry.lat.toFixed(2)},${entry.lng.toFixed(2)}`;
      
      // Update country counts
      countryCount[entry.country] = (countryCount[entry.country] || 0) + 1;
      
      // Update browser counts
      if (entry.browser) {
        browserCount[entry.browser] = (browserCount[entry.browser] || 0) + 1;
      }
      
      // Update device counts
      if (entry.device) {
        deviceCount[entry.device] = (deviceCount[entry.device] || 0) + 1;
      }

      // Calculate session time if available
      if (entry.sessionDuration) {
        sessionTimes.push(entry.sessionDuration);
      }

      // Group visitors by location
      if (locationMap.has(locationKey)) {
        const existingLocation = locationMap.get(locationKey);
        existingLocation.count++;
        if (isRecent) existingLocation.recentVisits++;
        if (entry.timestamp > existingLocation.lastVisitTimestamp) {
          existingLocation.lastVisit = new Date(entry.timestamp).toLocaleDateString();
          existingLocation.lastVisitTimestamp = entry.timestamp;
        }
      } else {
        locationMap.set(locationKey, {
          lat: entry.lat,
          lng: entry.lng,
          country: entry.country,
          city: entry.city || 'Unknown',
          count: 1,
          recentVisits: isRecent ? 1 : 0,
          lastVisit: new Date(entry.timestamp).toLocaleDateString(),
          lastVisitTimestamp: entry.timestamp
        });
      }
    });

    // Calculate additional stats
    const averageSessionTime = sessionTimes.length > 0 
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length 
      : 0;

    const topCountry = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const topBrowser = Object.entries(browserCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const topDevice = Object.entries(deviceCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Convert country counts to percentage format
    const processedCountries: { [key: string]: any } = {};
    Object.entries(countryCount).forEach(([country, count]) => {
      processedCountries[country] = {
        count,
        percentage: (count / totalVisitors) * 100,
        growth: this.calculateGrowth(country) // Mock growth calculation
      };
    });

    return {
      locations: Array.from(locationMap.values()),
      countries: processedCountries,
      stats: {
        totalVisitors,
        activeCountries: Object.keys(countryCount).length,
        topCountry,
        recentVisits,
        averageSessionTime,
        topBrowser,
        topDevice
      }
    };
  }

  /**
   * Calculate growth percentage (mock implementation)
   */
  private calculateGrowth(country: string): number {
    // In a real implementation, this would compare with historical data
    const hash = country.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return (hash % 30) - 15; // Random growth between -15% and 15%
  }

  /**
   * Return empty data structure when no visitors found
   */
  private getEmptyData(): ProcessedVisitorData {
    return {
      locations: [],
      countries: {},
      stats: {
        totalVisitors: 0,
        activeCountries: 0,
        topCountry: 'No data',
        recentVisits: 0,
        averageSessionTime: 0,
        topBrowser: 'No data',
        topDevice: 'No data'
      }
    };
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(callback: (data: ProcessedVisitorData) => void) {
    if (!database) return;

    const geoDataRef = ref(database, 'visitorGeoData');
    const listener = onValue(geoDataRef, async () => {
      try {
        const data = await this.getVisitorAnalytics();
        callback(data);
      } catch (error) {
        console.error('Error in real-time update:', error);
      }
    });

    return () => off(geoDataRef, 'value', listener);
  }

  /**
   * Invalidate cache to force fresh data fetch
   */
  private invalidateCache() {
    this.cache = null;
    this.lastFetch = 0;
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    Object.values(this.listeners).forEach(listener => {
      if (listener) {
        // Remove listeners
        off(listener);
      }
    });
    this.listeners = {};
  }
}

// Export singleton instance
export const visitorAnalytics = new RealTimeVisitorAnalytics();
