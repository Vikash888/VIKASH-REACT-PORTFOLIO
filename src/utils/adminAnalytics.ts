import { getDatabase, ref, onValue, get } from 'firebase/database';
import { app } from '../config/firebase';

interface SidebarStats {
  totalVisitors: number;
  activeUsers: number;
  totalPageViews: number;
  averageSessionDuration: number;
}

interface StatsCache {
  [key: string]: {
    data: any;
    timestamp: number;
  }
}

const statsCache: StatsCache = {};
const CACHE_DURATION = 60000; // 1 minute cache

const isCacheValid = (key: string): boolean => {
  const cache = statsCache[key];
  return cache && (Date.now() - cache.timestamp) < CACHE_DURATION;
};

export const getSidebarStats = (callback: (stats: SidebarStats) => void): (() => void) => {
  const database = getDatabase(app);
  const unsubscribers: (() => void)[] = [];

  const updateStats = async () => {
    try {
      const stats: SidebarStats = {
        totalVisitors: 0,
        activeUsers: 0,
        totalPageViews: 0,
        averageSessionDuration: 0
      };

      // Get total visitors
      if (isCacheValid('visitors')) {
        stats.totalVisitors = statsCache['visitors'].data;
      } else {
        const visitorsSnap = await get(ref(database, 'stats/uniqueVisitors/total'));
        stats.totalVisitors = visitorsSnap.val() || 0;
        statsCache['visitors'] = { data: stats.totalVisitors, timestamp: Date.now() };
      }

      // Subscribe to active users
      const activeUsersUnsubscribe = onValue(
        ref(database, 'activeUsers'),
        (snapshot) => {
          const now = Date.now();
          const activeTimeout = now - 60000; // 1 minute
          const activeUsers = Object.values(snapshot.val() || {}).filter(
            (user: any) => user.timestamp > activeTimeout
          ).length;
          stats.activeUsers = activeUsers;
          callback({ ...stats });
        }
      );
      unsubscribers.push(activeUsersUnsubscribe);

      // Get total page views
      const viewsUnsubscribe = onValue(
        ref(database, 'stats/views/total'),
        (snapshot) => {
          stats.totalPageViews = snapshot.val() || 0;
          callback({ ...stats });
        }
      );
      unsubscribers.push(viewsUnsubscribe);

      // Get average session duration
      const durationUnsubscribe = onValue(
        ref(database, 'stats/sessionDuration'),
        (snapshot) => {
          const data = snapshot.val() || { average: 0 };
          stats.averageSessionDuration = data.average || 0;
          callback({ ...stats });
        }
      );
      unsubscribers.push(durationUnsubscribe);

      callback(stats);
    } catch (error) {
      console.error('Error fetching sidebar stats:', error);
    }
  };

  // Initial update
  updateStats();

  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

