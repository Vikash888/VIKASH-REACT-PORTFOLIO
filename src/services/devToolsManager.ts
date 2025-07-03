import { database } from '../config/firebase';
import { ref, set, get, increment } from 'firebase/database';

export const initDevToolsProtection = () => {
  // Disable right click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    logDevToolsAttempt('CONTEXTMENU');
  });

  // Disable keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      // DevTools shortcuts
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.key === 'F12') ||
      // View source shortcuts
      (e.ctrlKey && e.key.toLowerCase() === 'u')
    ) {
      e.preventDefault();
      e.stopPropagation();
      logDevToolsAttempt('KEYBOARD');
      redirectToRestricted();
      return false;
    }
  }, true);

  // Additional detection methods
  setInterval(checkDevTools, 1000);
  window.addEventListener('resize', checkDevTools);
};

export const detectDevTools = () => {
  // Size-based detection
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;
  
  // Feature-based detection
  const devToolsPresent = widthThreshold || 
                         heightThreshold || 
                         isConsoleOpen() ||
                         isSourceMapEnabled();
  
  if (devToolsPresent) {
    logDevToolsAttempt('MENU');
    redirectToRestricted();
    return true;
  }
  return false;
};

const isConsoleOpen = () => {
  const startTime = performance.now();
  console.profile();
  console.profileEnd();
  const endTime = performance.now();
  return (endTime - startTime) > 20;
};

const isSourceMapEnabled = () => {
  try {
    throw new Error('DevTools Detection');
  } catch (err: unknown) {
    if (err instanceof Error) {
      return typeof err.stack === 'string' && err.stack.includes('source-map');
    }
    return false;
  }
};

const checkDevTools = () => {
  if (detectDevTools()) {
    redirectToRestricted();
  }
};

const redirectToRestricted = () => {
  if (window.location.pathname !== '/access-restricted') {
    window.location.href = '/access-restricted';
  }
};

const logDevToolsAttempt = async (method = 'MENU') => {
  if (!database) return;

  try {
    const timestamp = Date.now();
    const uid = 'anonymous';
    
    await set(ref(database, `devToolsDetection/${uid}`), {
      timestamp,
      blocked: true,
      attempts: increment(1),
      lastAttemptMethod: method
    });

    await set(ref(database, `securityLogs/${timestamp}`), {
      type: 'DEVTOOLS_DETECTED',
      timestamp,
      ip: window.localStorage.getItem('userIp') || 'unknown',
      userAgent: navigator.userAgent,
      method
    });
  } catch (error) {
    console.error('Error logging dev tools attempt:', error);
  }
};

export const isUserBlocked = async (uid: string) => {
  if (!database) return false;
  
  try {
    const snapshot = await get(ref(database, `devToolsDetection/${uid}`));
    return snapshot.exists() && snapshot.val().blocked;
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
};