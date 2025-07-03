import { db, database, app } from '../config/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Connection status types
export const ConnectionStatus = {
  CHECKING: 'checking',
  CONNECTED: 'connected',
  FIRESTORE_ERROR: 'firestore_error',
  REALTIME_DB_ERROR: 'realtime_db_error',
  AUTH_ERROR: 'auth_error',
  NETWORK_ERROR: 'network_error',
  BLOCKED: 'blocked',
  UNKNOWN_ERROR: 'unknown_error'
};

// Check if Firebase is properly initialized
export const isFirebaseInitialized = () => {
  return !!app;
};

// Check if the connection is being blocked by browser extensions
export const isConnectionBlocked = async () => {
  try {
    // Create an image element and try to load a Firebase resource
    const img = document.createElement('img');
    
    // Set up event handlers
    const imgPromise = new Promise((resolve) => {
      img.onload = () => resolve(false); // Not blocked
      img.onerror = (e) => {
        // Check if it's a security error or blocked by client
        const errorEvent = e;
        const isBlocked = errorEvent.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                          errorEvent.message?.includes('security') ||
                          !navigator.onLine;
        resolve(isBlocked);
      };
    });
    
    // Set source to a Firebase resource
    img.src = 'https://firestore.googleapis.com/favicon.ico?cachebust=' + Date.now();
    
    // Wait for result with timeout
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(true), 2000));
    return await Promise.race([imgPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Error checking if Firebase connection is blocked:', error);
    return true; // Assume blocked if there's an error
  }
};

// Test Firestore connection
export const testFirestoreConnection = async () => {
  if (!db) return false;
  
  try {
    // Try to fetch a single document from any collection
    const testQuery = query(collection(db, 'projects'), limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
};

// Test Realtime Database connection
export const testRealtimeDatabaseConnection = async () => {
  if (!database) return false;
  
  try {
    // Try to fetch the root reference
    const rootRef = ref(database);
    await get(rootRef);
    return true;
  } catch (error) {
    console.error('Realtime Database connection test failed:', error);
    return false;
  }
};

// Test authentication
export const testAuthentication = async () => {
  try {
    const auth = getAuth();
    // Just check if auth is initialized instead of trying to sign in
    return !!auth;
  } catch (error) {
    console.error('Authentication test failed:', error);
    return false;
  }
};

// Comprehensive connection check
export const checkFirebaseConnection = async () => {
  // First check if Firebase is initialized
  if (!isFirebaseInitialized()) {
    return {
      status: ConnectionStatus.UNKNOWN_ERROR,
      message: 'Firebase is not properly initialized. Check your configuration.'
    };
  }
  
  // Check if connection is being blocked
  const blocked = await isConnectionBlocked();
  if (blocked) {
    return {
      status: ConnectionStatus.BLOCKED,
      message: 'Firebase connection appears to be blocked by browser extensions or network settings.'
    };
  }
  
  // Check network connectivity
  if (!navigator.onLine) {
    return {
      status: ConnectionStatus.NETWORK_ERROR,
      message: 'No internet connection. Please check your network settings.'
    };
  }
  
  // Test Firestore
  const firestoreConnected = await testFirestoreConnection();
  if (!firestoreConnected) {
    return {
      status: ConnectionStatus.FIRESTORE_ERROR,
      message: 'Cannot connect to Firestore. Check your project configuration and network.'
    };
  }
  
  // Test Realtime Database
  const realtimeDbConnected = await testRealtimeDatabaseConnection();
  if (!realtimeDbConnected) {
    return {
      status: ConnectionStatus.REALTIME_DB_ERROR,
      message: 'Cannot connect to Realtime Database. Check your project configuration and network.'
    };
  }
  
  // Test Authentication
  const authWorking = await testAuthentication();
  if (!authWorking) {
    return {
      status: ConnectionStatus.AUTH_ERROR,
      message: 'Authentication service is not working properly. Check your Firebase configuration.'
    };
  }
  
  // All tests passed
  return {
    status: ConnectionStatus.CONNECTED,
    message: 'Connected to Firebase successfully.'
  };
};

// Export a function to get diagnostic information
export const getFirebaseDiagnostics = async () => {
  const connectionStatus = await checkFirebaseConnection();
  
  return {
    ...connectionStatus,
    firebaseInitialized: isFirebaseInitialized(),
    networkOnline: navigator.onLine,
    firestoreAvailable: !!db,
    realtimeDatabaseAvailable: !!database,
    authAvailable: !!getAuth(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
};
