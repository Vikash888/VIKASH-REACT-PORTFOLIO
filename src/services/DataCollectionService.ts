import { ref, get, Database } from 'firebase/database';
import { collection, query, where, getDocs, Firestore, orderBy, limit } from 'firebase/firestore';
import { db, database } from '../config/firebase';

interface SecurityData {
  blockedIPs: number;
  activeThreats: number;
  securityScore: number;
  devToolsAttempts: number;
  recentEvents?: any[];
}

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  browsers?: Record<string, any>;
  devices?: Record<string, any>;
  os?: Record<string, any>;
  countries?: Record<string, any>;
}

const dataCollectionService = {
  /**
   * Get security data from Firebase
   */
  getSecurityData: async (): Promise<SecurityData | null> => {
    try {
      // Get blocked IPs count
      const blockedIPsRef = ref(database as Database, 'blockedIPs');
      const blockedSnapshot = await get(blockedIPsRef);
      const blockedIPs = blockedSnapshot.exists() ? Object.keys(blockedSnapshot.val()).length : 0;

      // Get dev tools attempts and status
      const devToolsRef = ref(database as Database, 'security/devToolsDetection');
      const devToolsSnapshot = await get(devToolsRef);
      const devToolsAttemptsCount = devToolsSnapshot.exists() ? Object.keys(devToolsSnapshot.val()).length : 0;

      // Get DevTools protection status
      const devToolsSettingsRef = ref(database as Database, 'settings/devTools');
      const devToolsSettingsSnapshot = await get(devToolsSettingsRef);
      const isBlocked = devToolsSettingsSnapshot.exists() ? devToolsSettingsSnapshot.val().blocked : false;

      // Get threats from visitors collection
      const visitorsRef = collection(db as Firestore, 'visitors');
      const threatsQuery = query(visitorsRef, where('threatLevel', '==', 'high'));
      const threatsSnapshot = await getDocs(threatsQuery);
      const activeThreats = threatsSnapshot.size;

      // Calculate security score (example algorithm)
      const maxScore = 100;
      const threatPenalty = activeThreats * 10;
      const blockBonus = blockedIPs * 5;
      const devToolsBonus = isBlocked ? 20 : 0;
      const securityScore = Math.max(0, Math.min(maxScore - threatPenalty + blockBonus + devToolsBonus, 100));

      // Get recent security events
      const eventsRef = collection(db as Firestore, 'securityEvents');
      const eventsQuery = query(eventsRef, orderBy('timestamp', 'desc'), limit(5));
      const eventsSnapshot = await getDocs(eventsQuery);

      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        blockedIPs,
        activeThreats,
        securityScore,
        devToolsAttempts: devToolsAttemptsCount,
        recentEvents: events
      };
    } catch (error) {
      console.error('Error fetching security data:', error);
      return null;
    }
  },

  /**
   * Get analytics data from Firebase
   */
  getAnalyticsData: async (): Promise<AnalyticsData | null> => {
    try {
      // Get page views
      const pageViewsRef = ref(database as Database, 'analytics/pageViews');
      const pageViewsSnapshot = await get(pageViewsRef);
      const pageViews = pageViewsSnapshot.exists() ? pageViewsSnapshot.val().total || 0 : 0;

      // Get unique visitors
      const visitorsRef = ref(database as Database, 'analytics/visitors');
      const visitorsSnapshot = await get(visitorsRef);
      const uniqueVisitors = visitorsSnapshot.exists() ? Object.keys(visitorsSnapshot.val()).length : 0;

      // Get browser data
      const browsersRef = ref(database as Database, 'analytics/browsers');
      const browsersSnapshot = await get(browsersRef);
      const browsers = browsersSnapshot.exists() ? browsersSnapshot.val() : {};

      // Get device data
      const devicesRef = ref(database as Database, 'analytics/devices');
      const devicesSnapshot = await get(devicesRef);
      const devices = devicesSnapshot.exists() ? devicesSnapshot.val() : {};

      // Get OS data
      const osRef = ref(database as Database, 'analytics/os');
      const osSnapshot = await get(osRef);
      const os = osSnapshot.exists() ? osSnapshot.val() : {};

      // Get country data
      const countriesRef = ref(database as Database, 'analytics/countries');
      const countriesSnapshot = await get(countriesRef);
      const countries = countriesSnapshot.exists() ? countriesSnapshot.val() : {};

      return {
        pageViews,
        uniqueVisitors,
        browsers,
        devices,
        os,
        countries
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return null;
    }
  },

  /**
   * Get visitor data for the visitor map
   */
  getVisitorMapData: async () => {
    try {
      const visitorGeoRef = ref(database as Database, 'visitorGeoData');
      const snapshot = await get(visitorGeoRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching visitor map data:', error);
      return null;
    }
  }
};

export default dataCollectionService;
