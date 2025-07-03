/**
 * Enhanced Visitor Analytics - Main Export
 * 
 * This module provides a complete solution for visitor analytics and mapping
 * for admin dashboards with real-time data visualization.
 */

// Main components
export { default as VisitorMap } from './VisitorMap';

// Services
export { visitorAnalytics } from '../../services/realTimeVisitorAnalytics';
export type { 
  ProcessedVisitorData, 
  VisitorGeoData
} from '../../services/realTimeVisitorAnalytics';

// Configuration
export { 
  defaultAnalyticsConfig, 
  mapColorSchemes, 
  mockCountries, 
  AnalyticsEvents 
} from '../../config/visitorAnalyticsConfig';
export type { 
  AnalyticsConfig, 
  AnalyticsEvent 
} from '../../config/visitorAnalyticsConfig';

// Utility functions
export const formatVisitorCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

export const formatGrowth = (growth: number): string => {
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
};

export const getCountryFlag = (countryName: string): string => {
  // Country code mapping (partial list)
  const countryFlags: Record<string, string> = {
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'India': '🇮🇳',
    'Japan': '🇯🇵',
    'Australia': '🇦🇺',
    'Brazil': '🇧🇷',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Canada': '🇨🇦',
    'South Korea': '🇰🇷',
    'China': '🇨🇳',
    'Russia': '🇷🇺',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Switzerland': '🇨🇭'
  };
  
  return countryFlags[countryName] || '🌍';
};
