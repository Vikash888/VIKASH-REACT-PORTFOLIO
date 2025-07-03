/**
 * Configuration for visitor analytics and tracking
 */

export interface AnalyticsConfig {
  // Cache settings
  cacheExpiry: number; // in milliseconds
  refreshInterval: number; // in milliseconds
  
  // Map visualization settings
  defaultZoom: number;
  maxZoom: number;
  minZoom: number;
  
  // Data collection settings
  enableRealTimeTracking: boolean;
  enableGeoTracking: boolean;
  enableDeviceTracking: boolean;
  
  // UI settings
  animationDuration: number;
  refreshRate: number;
  
  // Mock data settings (for development)
  useMockData: boolean;
  mockDataUpdateInterval: number;
}

export const defaultAnalyticsConfig: AnalyticsConfig = {
  // Cache for 5 minutes
  cacheExpiry: 5 * 60 * 1000,
  
  // Refresh every 30 seconds
  refreshInterval: 30 * 1000,
  
  // Map zoom levels
  defaultZoom: 1,
  maxZoom: 4,
  minZoom: 1,
  
  // Tracking features
  enableRealTimeTracking: true,
  enableGeoTracking: true,
  enableDeviceTracking: true,
  
  // UI animations
  animationDuration: 300,
  refreshRate: 1000,
  
  // Development settings
  useMockData: false,
  mockDataUpdateInterval: 10 * 1000,
};

/**
 * Color schemes for the map visualization
 */
export const mapColorSchemes = {
  blue: {
    primary: 'rgba(59, 130, 246, 0.8)',
    secondary: 'rgba(59, 130, 246, 0.4)',
    accent: '#3B82F6',
    gradient: ['#6366F1', '#3B82F6', '#0EA5E9']
  },
  green: {
    primary: 'rgba(34, 197, 94, 0.8)',
    secondary: 'rgba(34, 197, 94, 0.4)',
    accent: '#22C55E',
    gradient: ['#10B981', '#22C55E', '#84CC16']
  },
  purple: {
    primary: 'rgba(147, 51, 234, 0.8)',
    secondary: 'rgba(147, 51, 234, 0.4)',
    accent: '#9333EA',
    gradient: ['#8B5CF6', '#9333EA', '#C084FC']
  }
};

/**
 * Default countries for mock data
 */
export const mockCountries = [
  { name: 'United States', lat: 40.7128, lng: -74.0060, city: 'New York' },
  { name: 'United Kingdom', lat: 51.5074, lng: -0.1278, city: 'London' },
  { name: 'India', lat: 28.6139, lng: 77.2090, city: 'Delhi' },
  { name: 'Japan', lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
  { name: 'Australia', lat: -33.8688, lng: 151.2093, city: 'Sydney' },
  { name: 'Brazil', lat: -23.5505, lng: -46.6333, city: 'São Paulo' },
  { name: 'France', lat: 48.8566, lng: 2.3522, city: 'Paris' },
  { name: 'Germany', lat: 52.5200, lng: 13.4050, city: 'Berlin' },
  { name: 'Canada', lat: 43.6532, lng: -79.3832, city: 'Toronto' },
  { name: 'South Korea', lat: 37.5665, lng: 126.9780, city: 'Seoul' }
];

/**
 * Analytics events for tracking
 */
export const AnalyticsEvents = {
  MAP_LOADED: 'map_loaded',
  MAP_ZOOMED: 'map_zoomed',
  COUNTRY_CLICKED: 'country_clicked',
  FILTER_CHANGED: 'filter_changed',
  VIEW_MODE_CHANGED: 'view_mode_changed',
  DATA_REFRESHED: 'data_refreshed'
} as const;

export type AnalyticsEvent = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
