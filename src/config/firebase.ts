import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import logger from '../utils/logger';

// Helper function to safely get environment variables with fallbacks
const getEnvVar = (key: string): string => {
  try {
    // Try both with and without VITE_ prefix
    const value = import.meta.env[`VITE_${key}`] || import.meta.env[key];
    
    if (!value && import.meta.env.DEV) {
      console.warn(`Missing environment variable: ${key}`);
      return '';
    }
    
    return value || '';
  } catch (error) {
    console.error(`Error accessing environment variable ${key}:`, error);
    return '';
  }
};

// Check if minimal required Firebase config exists
const hasMinimalConfig = (): boolean => {
  try {
    const apiKey = getEnvVar('FIREBASE_API_KEY');
    const authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN');
    const projectId = getEnvVar('FIREBASE_PROJECT_ID');
    
    const hasAllRequired = !!(apiKey && authDomain && projectId);
    
    if (!hasAllRequired) {
      console.error('Missing required Firebase configuration:', {
        apiKey: !!apiKey,
        authDomain: !!authDomain,
        projectId: !!projectId
      });
    }
    
    return hasAllRequired;
  } catch (error) {
    console.error('Error checking Firebase configuration:', error);
    return false;
  }
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let database: Database | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
  if (hasMinimalConfig()) {
    const firebaseConfig = {
      apiKey: getEnvVar('FIREBASE_API_KEY'),
      authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('FIREBASE_APP_ID'),
      databaseURL: getEnvVar('FIREBASE_DATABASE_URL')
    };

    // Log config for debugging (without sensitive values)
    logger.log('firebase', 'Initializing Firebase with:', {
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL,
      storageBucket: firebaseConfig.storageBucket,
      hasApiKey: !!firebaseConfig.apiKey,
      hasAppId: !!firebaseConfig.appId
    });

    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      database = getDatabase(app);
      db = getFirestore(app);
      storage = getStorage(app);
      
      logger.log('firebase', 'Firebase initialized successfully');
    } catch (initError) {
      logger.error('firebase', 'Firebase service initialization failed:', initError);
    }
  } else {
    console.warn('Missing required Firebase configuration variables. Using mock services.');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

// Create mock services for development if needed
const createMockServices = () => {
  if (!app && import.meta.env.DEV) {
    console.warn('Using mock Firebase instances for development');
    
    // Create a minimal mock implementation of Database
    if (!database) {
      // Simple in-memory database mock
      const mockData = {
        projects: {
          '1': {
            title: 'Network Security Scanner',
            description: 'A comprehensive tool for scanning networks, identifying vulnerabilities, and suggesting remediation steps.',
            image: '/assets/images/projects/project-1.jpg',
            technologies: ['Python', 'Nmap', 'Django', 'ReactJS'],
            category: 'Security',
            githubLink: 'https://github.com',
            demoLink: 'https://demo.com',
            videoLink: 'https://youtube.com',
            highlighted: true
          },
          // Add more mock projects as needed
        },
        stats: {
          views: {
            total: 1500,
            today: 25,
            week: 150,
            month: 450,
            lastUpdated: Date.now()
          },
          uniqueVisitors: {
            total: 800,
            today: 15,
            week: 80,
            month: 250
          },
          sessionDuration: {
            average: 120,
            count: 800,
            totalDuration: 96000
          },
          visitorLocations: {}
        },
        analytics: {
          browsers: {
            Chrome: { count: 450 },
            Firefox: { count: 200 },
            Safari: { count: 150 }
          },
          devices: {
            Desktop: { count: 600 },
            Mobile: { count: 180 },
            Tablet: { count: 20 }
          },
          os: {
            Windows: { count: 400 },
            MacOS: { count: 200 },
            iOS: { count: 100 },
            Android: { count: 100 }
          },
          countries: {
            United_States: { count: 300 },
            India: { count: 150 },
            United_Kingdom: { count: 100 }
          }
        },
        pageViews: {
          home: { count: 500, lastUpdated: Date.now() },
          about: { count: 300, lastUpdated: Date.now() },
          projects: { count: 400, lastUpdated: Date.now() },
          contact: { count: 200, lastUpdated: Date.now() }
        },
        visitors: {},
        activeUsers: {}
      };
      
      // Create a more comprehensive mock implementation
      const mockDatabase = {
        _data: mockData,
        ref: (path: string) => {
          // Parse the path to navigate the mockData object
          const pathParts = path.split('/').filter(Boolean);
          let currentData = mockData;
          
          for (const part of pathParts) {
            if (currentData[part] !== undefined) {
              currentData = currentData[part];
            } else {
              currentData = null;
              break;
            }
          }
          
          return {
            get: () => Promise.resolve({
              exists: () => currentData !== null,
              val: () => currentData
            }),
            on: (event: string, callback: Function) => {
              if (event === 'value' && callback) {
                callback({
                  exists: () => currentData !== null,
                  val: () => currentData
                });
              }
              return () => {};
            },
            off: () => {}
          };
        }
      };
      
      // @ts-ignore - This is a mock implementation
      database = mockDatabase;
    }
    
    // Create mock auth if needed
    if (!auth) {
      // @ts-ignore - This is a mock implementation
      auth = {
        currentUser: null,
        onAuthStateChanged: (callback: any) => {
          callback(null);
          return () => {};
        },
        signInWithPopup: () => Promise.reject(new Error('Mock auth: Sign in not implemented')),
        signOut: () => Promise.resolve()
      };
    }
  }
};

createMockServices();

// Export services
export { app, auth, database, db, storage };

// Export a helper function to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return !!app;
};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};