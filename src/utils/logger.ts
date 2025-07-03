/**
 * Logger utility to control console output based on environment
 * This allows you to easily turn off development logs in production
 */

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV === true || import.meta.env.MODE === 'development';

// Get log level from environment variables or default based on environment
enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  ALL = 5
}

// Parse log level from environment variable or use default based on environment
const getLogLevelFromEnv = (): LogLevel => {
  const envLogLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
  
  if (envLogLevel) {
    switch (envLogLevel) {
      case 'none': return LogLevel.NONE;
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      case 'all': return LogLevel.ALL;
      default: return isDevelopment ? LogLevel.ALL : LogLevel.ERROR;
    }
  }
  
  // Default log levels
  return isDevelopment ? LogLevel.ALL : LogLevel.ERROR;
};

// These categories will never be logged in production or development (security-sensitive)
const SECURITY_SENSITIVE_CATEGORIES = [
  'firebase',
  'cloudinary', 
  'emailjs',
  'config-init',
  'auth-debug',
  'api-keys'
];

// These categories will never be logged in production
const PRODUCTION_SILENT_CATEGORIES = [
  'firebase-init', 
  'data-fetch', 
  'route-debug',
  'analytics-verbose',
  'analytics'
];

// These categories will always be logged, even in production
const ALWAYS_LOG_CATEGORIES = [
  'error', 
  'critical', 
  'security-critical'
];

// These categories emit in development but not production
const DEV_ONLY_CATEGORIES = [
  'route-trace', 
  'component-render', 
  'state-update',
  'theme-debug',
  'projects-debug'
];

// Current log level
const currentLogLevel = getLogLevelFromEnv();

// Create a custom logger that respects environment settings
const logger = {
  /**
   * Enhanced console log that can be disabled in production
   * @param category - Log category (for filtering)
   * @param args - Arguments to log
   */
  log: (category: string, ...args: any[]) => {
    // Never log security-sensitive categories
    if (SECURITY_SENSITIVE_CATEGORIES.includes(category)) {
      return;
    }

    // Always log if forced by category
    if (ALWAYS_LOG_CATEGORIES.includes(category)) {
      console.log(`[${category}]`, ...args);
      return;
    }

    // Skip categories that should never appear in production
    if (!isDevelopment && PRODUCTION_SILENT_CATEGORIES.includes(category)) {
      return;
    }

    // Skip dev-only categories in production
    if (!isDevelopment && DEV_ONLY_CATEGORIES.includes(category)) {
      return;
    }

    // Check if current log level allows info messages
    if (currentLogLevel >= LogLevel.INFO) {
      console.log(`[${category}]`, ...args);
    }
  },

  /**
   * Debug level logger - for detailed diagnostics
   */
  debug: (category: string, ...args: any[]) => {
    // Never log security-sensitive categories
    if (SECURITY_SENSITIVE_CATEGORIES.includes(category)) {
      return;
    }

    // Skip in production unless forced
    if (!isDevelopment && !ALWAYS_LOG_CATEGORIES.includes(category)) {
      return;
    }

    // Check if current log level allows debug messages
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.debug(`[${category}]`, ...args);
    }
  },

  /**
   * Info level logger - for general information
   */
  info: (category: string, ...args: any[]) => {
    // Never log security-sensitive categories
    if (SECURITY_SENSITIVE_CATEGORIES.includes(category)) {
      return;
    }

    // Always log if forced by category
    if (ALWAYS_LOG_CATEGORIES.includes(category)) {
      console.info(`[${category}]`, ...args);
      return;
    }
    
    // Check if current log level allows info messages
    if (currentLogLevel >= LogLevel.INFO) {
      console.info(`[${category}]`, ...args);
    }
  },

  /**
   * Error logger - always enabled but can be filtered
   */
  error: (category: string, ...args: any[]) => {
    // Skip if log level is NONE
    if (currentLogLevel === LogLevel.NONE) {
      return;
    }
    
    // Always log errors but with category for possible filtering
    console.error(`[${category}]`, ...args);
  },

  /**
   * Warning logger - enabled in development, configurable in production
   */
  warn: (category: string, ...args: any[]) => {
    // Always log if forced by category
    if (ALWAYS_LOG_CATEGORIES.includes(category)) {
      console.warn(`[${category}]`, ...args);
      return;
    }

    // Check if current log level allows warning messages
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(`[${category}]`, ...args);
    }
  }
};

export default logger;
