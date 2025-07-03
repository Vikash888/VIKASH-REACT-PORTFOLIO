import { database } from '../config/firebase';
import { ref, push, set, get } from 'firebase/database';

export interface VisitorData {
  ip: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  timestamp: number;
  sessionId: string;
  path: string;
  referrer: string;
}

class VisitorTrackingService {
  private sessionId: string;
  private hasTracked: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Track visitor with IP-based geolocation
   */
  async trackVisitor(): Promise<void> {
    // Prevent multiple tracking calls per session
    if (this.hasTracked) return;

    try {
      const visitorData = await this.collectVisitorData();
      await this.saveVisitorData(visitorData);
      this.hasTracked = true;
      console.log('Visitor tracked successfully:', visitorData.country);
    } catch (error) {
      console.error('Error tracking visitor:', error);
    }
  }

  /**
   * Collect visitor data including IP-based location
   */
  private async collectVisitorData(): Promise<VisitorData> {
    // Get IP and location data
    const locationData = await this.getLocationFromIP();
    
    // Get browser and device info
    const userAgent = navigator.userAgent;
    const browserInfo = this.getBrowserInfo(userAgent);
    const deviceInfo = this.getDeviceInfo(userAgent);

    return {
      ip: locationData.ip,
      country: locationData.country,
      city: locationData.city,
      lat: locationData.lat,
      lng: locationData.lng,
      userAgent: userAgent,
      browser: browserInfo.browser,
      os: browserInfo.os,
      device: deviceInfo,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      path: window.location.pathname,
      referrer: document.referrer || 'direct'
    };
  }

  /**
   * Get location data from IP address using external service
   */
  private async getLocationFromIP(): Promise<{
    ip: string;
    country: string;
    city: string;
    lat: number;
    lng: number;
  }> {
    try {
      // Skip IP geolocation in development due to CORS issues
      if (import.meta.env.DEV) {
        return {
          ip: '127.0.0.1',
          country: 'Development',
          city: 'Localhost',
          lat: 0,
          lng: 0
        };
      }

      // Using ipapi.co for IP geolocation (free tier available)
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('https://ipapi.co/json/', {
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
          ip: data.ip || 'unknown',
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          lat: parseFloat(data.latitude) || 0,
          lng: parseFloat(data.longitude) || 0
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError; // Re-throw to be handled by outer catch
      }
    } catch (error) {
      // Silently fail for geolocation errors to not break the app
      console.warn('IP geolocation service unavailable (this is non-critical):', error instanceof Error ? error.message : 'Unknown error');
      
      // Return default values without attempting fallback services
      // This prevents cascading failures and CORS issues
      return {
        ip: 'unknown',
        country: 'Unknown',
        city: 'Unknown',
        lat: 0,
        lng: 0
      };
    }
  }

  /**
   * Extract browser and OS information
   */
  private getBrowserInfo(userAgent: string): { browser: string; os: string } {
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux') && !userAgent.includes('Android')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return { browser, os };
  }

  /**
   * Detect device type
   */
  private getDeviceInfo(userAgent: string): string {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Save visitor data to Firebase
   */
  private async saveVisitorData(visitorData: VisitorData): Promise<void> {
    if (!database) {
      throw new Error('Firebase database not initialized');
    }

    try {
      // Save to visitorGeoData for map visualization
      const geoDataRef = ref(database, 'visitorGeoData');
      await push(geoDataRef, {
        lat: visitorData.lat,
        lng: visitorData.lng,
        country: visitorData.country,
        city: visitorData.city,
        timestamp: visitorData.timestamp,
        ip: this.anonymizeIP(visitorData.ip), // Anonymize IP for privacy
        browser: visitorData.browser,
        os: visitorData.os,
        device: visitorData.device,
        sessionId: visitorData.sessionId,
        path: visitorData.path,
        referrer: visitorData.referrer
      });

      // Save to analytics data
      const analyticsRef = ref(database, `analytics/${new Date().toISOString().split('T')[0]}`);
      await push(analyticsRef, visitorData);

      // Update session tracking
      const sessionRef = ref(database, `activeSessions/${visitorData.sessionId}`);
      await set(sessionRef, {
        country: visitorData.country,
        city: visitorData.city,
        browser: visitorData.browser,
        device: visitorData.device,
        startTime: visitorData.timestamp,
        lastActivity: visitorData.timestamp,
        isActive: true
      });

    } catch (error) {
      console.error('Error saving visitor data to Firebase:', error);
      throw error;
    }
  }

  /**
   * Anonymize IP address for privacy
   */
  private anonymizeIP(ip: string): string {
    if (!ip || ip === 'unknown') return ip;
    
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4: Replace last octet with 0
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    // For IPv6 or other formats, return first part only
    return ip.split(':')[0] + ':0000::0';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update activity for current session
   */
  async updateActivity(): Promise<void> {
    if (!database || !this.hasTracked) return;

    try {
      const sessionRef = ref(database, `activeSessions/${this.sessionId}`);
      const snapshot = await get(sessionRef);
      
      if (snapshot.exists()) {
        await set(sessionRef, {
          ...snapshot.val(),
          lastActivity: Date.now(),
          isActive: true,
          path: window.location.pathname
        });
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Mark session as inactive when user leaves
   */
  async endSession(): Promise<void> {
    if (!database || !this.hasTracked) return;

    try {
      const sessionRef = ref(database, `activeSessions/${this.sessionId}`);
      const snapshot = await get(sessionRef);
      
      if (snapshot.exists()) {
        const sessionData = snapshot.val();
        await set(sessionRef, {
          ...sessionData,
          endTime: Date.now(),
          isActive: false,
          duration: Date.now() - sessionData.startTime
        });
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
}

// Create singleton instance
export const visitorTracker = new VisitorTrackingService();

// Auto-track when service is imported (only in browser)
if (typeof window !== 'undefined') {
  // Track visitor on page load
  window.addEventListener('load', () => {
    visitorTracker.trackVisitor();
  });

  // Update activity on page interactions
  ['click', 'scroll', 'keydown'].forEach(event => {
    document.addEventListener(event, () => {
      visitorTracker.updateActivity();
    }, { passive: true, once: false });
  });

  // End session when user leaves
  window.addEventListener('beforeunload', () => {
    visitorTracker.endSession();
  });

  // Handle visibility changes (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      visitorTracker.updateActivity();
    }
  });
}
