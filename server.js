import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, serverTimestamp } from 'firebase/database';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import API routes
import apiRoutes from './api/index.js';

// ES Module workarounds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCZpRTT97DGwJm_3MW7y6RNwD7vEWne9uE",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "vikash-portfolio-92df4.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "vikash-portfolio-92df4",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "vikash-portfolio-92df4.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "915556336970",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:915556336970:web:8aefa8b09077ffd5c22db3",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://vikash-portfolio-92df4-default-rtdb.firebaseio.com"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const firestore = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 3002;

// Track usage to stay within free tier limits
const usageTracking = {
  rtdbReads: 0,
  rtdbWrites: 0,
  firestoreReads: 0,
  firestoreWrites: 0,
  dailyLimit: {
    rtdbReads: 100000,    // Set conservative limits
    rtdbWrites: 10000,     // to stay within free tier
    firestoreReads: 50000,
    firestoreWrites: 20000
  },
  resetTime: Date.now()
};

// Reset daily counters
setInterval(() => {
  const now = Date.now();
  // Reset counters every 24 hours
  if (now - usageTracking.resetTime >= 24 * 60 * 60 * 1000) {
    console.log('Resetting usage tracking counters');
    usageTracking.rtdbReads = 0;
    usageTracking.rtdbWrites = 0;
    usageTracking.firestoreReads = 0;
    usageTracking.firestoreWrites = 0;
    usageTracking.resetTime = now;
  }
}, 60 * 60 * 1000); // Check every hour

// Helper function to track database operations
const trackOperation = (type, operation) => {
  usageTracking[`${type}${operation}`]++;
  
  // Log if approaching limits
  const percentage = (usageTracking[`${type}${operation}`] / usageTracking.dailyLimit[`${type}${operation}`]) * 100;
  if (percentage >= 80) {
    console.warn(`WARNING: ${type}${operation} at ${percentage.toFixed(2)}% of daily limit`);
  }
  
  // Return true if still within limits
  return usageTracking[`${type}${operation}`] < usageTracking.dailyLimit[`${type}${operation}`];
};

// Configure CORS to allow requests from frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vikash-portfolio.vercel.app', 'https://vikashj.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
  maxAge: 86400 // Cache preflight request for 24 hours
}));

// Middleware
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Local data storage as fallback if db limits reached
let localViewStats = {
  totalViews: 1250,
  uniqueVisitors: 487
};

// Enhanced visitor tracking middleware
app.use(async (req, res, next) => {
  // Skip API routes and static files
  if (req.path.startsWith('/api/') || req.path.includes('.') || req.method !== 'GET') {
    return next();
  }

  try {
    // Get client IP
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               '0.0.0.0';
               
    // Check if IP is blocked
    const blockedRef = ref(database, `blockedIPs/${ip.replace(/\./g, '_')}`);
    const blockedSnapshot = await get(blockedRef);
    
    if (blockedSnapshot.exists()) {
      return res.status(403).json({ 
        error: 'Access Denied', 
        message: 'Your IP address has been blocked.' 
      });
    }
    
    // Get visitor geolocation data
    try {
      const geoData = await axios.get(`https://ipapi.co/${ip}/json/`);
      
      if (geoData.data && geoData.data.country) {
        const timestamp = Date.now();
        
        // Check if we're within usage limits
        if (trackOperation('rtdb', 'Writes')) {
          // Store in Realtime Database
          const rtdbVisitorRef = ref(database, `visitorGeoData/${timestamp}`);
          await set(rtdbVisitorRef, {
            timestamp,
            ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            referrer: req.headers.referer || 'direct',
            country: geoData.data.country_name,
            city: geoData.data.city,
            region: geoData.data.region,
            lat: geoData.data.latitude,
            lng: geoData.data.longitude,
            browser: detectBrowser(req.headers['user-agent']),
            device: detectDevice(req.headers['user-agent']),
            os: detectOS(req.headers['user-agent']),
            screenResolution: req.headers['sec-ch-viewport-width'] 
              ? `${req.headers['sec-ch-viewport-width']}x${req.headers['sec-ch-viewport-height']}`
              : 'unknown',
            language: req.headers['accept-language']?.split(',')[0] || 'unknown'
          });
        }
        
        // Also store in Firestore if within limits
        if (trackOperation('firestore', 'Writes')) {
          const firestoreVisitorDoc = doc(collection(firestore, 'visitors'), timestamp.toString());
          await setDoc(firestoreVisitorDoc, {
            timestamp: firestoreTimestamp(),
            ip,
            userAgent: req.headers['user-agent'],
            path: req.path,
            referrer: req.headers.referer || 'direct',
            country: geoData.data.country_name,
            city: geoData.data.city,
            region: geoData.data.region,
            location: new GeoPoint(geoData.data.latitude, geoData.data.longitude),
            browser: detectBrowser(req.headers['user-agent']),
            device: detectDevice(req.headers['user-agent']),
            os: detectOS(req.headers['user-agent']),
            screenResolution: req.headers['sec-ch-viewport-width'] 
              ? `${req.headers['sec-ch-viewport-width']}x${req.headers['sec-ch-viewport-height']}`
              : 'unknown',
            language: req.headers['accept-language']?.split(',')[0] || 'unknown'
          });
        }
        
        console.log(`Visitor from ${geoData.data.city}, ${geoData.data.country_name} recorded`);
      }
    } catch (geoError) {
      console.error('Error fetching geo data:', geoError.message);
    }
  } catch (error) {
    console.error('Error in visitor tracking middleware:', error);
  }
  
  // Increment view counter
  await incrementViewCount(req);
  next();
});

// Utility functions for device detection
function detectBrowser(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/edge|edg/i.test(userAgent)) return 'Edge';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/opera|opr/i.test(userAgent)) return 'Opera';
  return 'Unknown';
}

function detectDevice(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/ipad/i.test(userAgent)) return 'iPad';
  if (/iphone/i.test(userAgent)) return 'iPhone';
  if (/android/i.test(userAgent)) return 'Android';
  if (/windows phone/i.test(userAgent)) return 'Windows Phone';
  if (/windows|macintosh|linux/i.test(userAgent)) return 'Desktop';
  return 'Unknown';
}

function detectOS(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (/windows/i.test(userAgent)) {
    return /Windows NT 10/.test(userAgent) ? 'Windows 10' : 
           /Windows NT 6.3/.test(userAgent) ? 'Windows 8.1' :
           /Windows NT 6.2/.test(userAgent) ? 'Windows 8' :
           /Windows NT 6.1/.test(userAgent) ? 'Windows 7' :
           'Windows';
  }
  if (/macintosh|mac os x/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  return 'Unknown';
}

// Email functionality removed - now using client-side EmailJS

// Increment view counter
async function incrementViewCount(req) {
  try {
    // Get the IP to track unique visitors
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               '0.0.0.0';
    
    // Try to update Realtime Database first
    if (trackOperation('rtdb', 'Reads') && trackOperation('rtdb', 'Writes')) {
      const viewsRef = ref(database, 'views');
      const snapshot = await get(viewsRef);
      
      let viewData = {
        total: 1,
        unique: 1,
        uniqueIPs: [ip],
        lastUpdated: new Date().toISOString()
      };
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        viewData = {
          total: data.total + 1,
          unique: data.uniqueIPs.includes(ip) ? data.unique : data.unique + 1,
          uniqueIPs: data.uniqueIPs.includes(ip) ? data.uniqueIPs : [...data.uniqueIPs, ip],
          lastUpdated: new Date().toISOString()
        };
      }
      
      await set(viewsRef, viewData);
      
      // Update local fallback data
      localViewStats.totalViews = viewData.total;
      localViewStats.uniqueVisitors = viewData.unique;
    } 
    
    // Also update Firestore if we're within limits
    if (trackOperation('firestore', 'Reads') && trackOperation('firestore', 'Writes')) {
      const viewsDoc = doc(firestore, 'views', 'stats');
      const viewsSnapshot = await getDoc(viewsDoc);
      
      if (viewsSnapshot.exists()) {
        const data = viewsSnapshot.data();
        const uniqueIPs = data.uniqueIPs || [];
        const isUnique = !uniqueIPs.includes(ip);
        
        await updateDoc(viewsDoc, {
          total: (data.total || 0) + 1,
          unique: isUnique ? (data.unique || 0) + 1 : data.unique,
          uniqueIPs: isUnique ? [...uniqueIPs, ip] : uniqueIPs,
          lastUpdated: firestoreTimestamp()
        });
      } else {
        await setDoc(viewsDoc, {
          total: 1,
          unique: 1,
          uniqueIPs: [ip],
          lastUpdated: firestoreTimestamp()
        });
      }
    }
    
    // Always increment local stats as fallback
    localViewStats.totalViews += 1;
    if (!localViewStats.uniqueIPs) {
      localViewStats.uniqueIPs = [ip];
    } else if (!localViewStats.uniqueIPs.includes(ip)) {
      localViewStats.uniqueIPs.push(ip);
      localViewStats.uniqueVisitors += 1;
    }
    
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

// Dummy route for capturing view counts
app.get('/dummy-path-for-view', async (req, res) => {
  await incrementViewCount(req);
  res.status(200).send('View recorded');
});

// API Routes
app.get('/api/stats/views', async (req, res) => {
  try {
    let viewData = localViewStats; // Default to local data
    
    // Try to get data from Realtime Database first
    if (trackOperation('rtdb', 'Reads')) {
      const viewsRef = ref(database, 'views');
      const snapshot = await get(viewsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        viewData = {
          totalViews: data.total,
          uniqueVisitors: data.unique
        };
      }
    } 
    // Fall back to Firestore if RTDB fails or hits limits
    else if (trackOperation('firestore', 'Reads')) {
      const viewsDoc = doc(firestore, 'views', 'stats');
      const viewsSnapshot = await getDoc(viewsDoc);
      
      if (viewsSnapshot.exists()) {
        const data = viewsSnapshot.data();
        viewData = {
          totalViews: data.total,
          uniqueVisitors: data.unique
        };
      }
    }
    
    console.log('Serving view stats:', viewData);
    res.status(200).json({ 
      success: true,
      totalViews: viewData.totalViews,
      uniqueVisitors: viewData.uniqueVisitors
    });
  } catch (error) {
    console.error('Error fetching view stats:', error);
    // Serve local fallback data if databases fail
    res.status(200).json({ 
      success: true,
      totalViews: localViewStats.totalViews,
      uniqueVisitors: localViewStats.uniqueVisitors
    });
  }
});

// Get visitor geolocation stats
app.get('/api/stats/locations', async (req, res) => {
  try {
    let locationData = {
      countries: [],
      devices: [],
      browsers: []
    };
    
    // Try to aggregate from Realtime Database
    if (trackOperation('rtdb', 'Reads')) {
      const visitorRef = ref(database, 'visitorGeoData');
      const snapshot = await get(visitorRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        locationData = aggregateVisitorStats(data);
      } else {
        // Fall back to Firestore
        if (trackOperation('firestore', 'Reads')) {
          // This would be a more complex query in a real app
          // For demo, providing mock data
          locationData = getMockLocationData();
        } else {
          // Use mock data if both databases hit limits
          locationData = getMockLocationData();
        }
      }
    } else {
      // Use mock data if both databases hit limits
      locationData = getMockLocationData();
    }
    
    console.log('Serving location stats');
    res.status(200).json({
      success: true,
      ...locationData
    });
  } catch (error) {
    console.error('Error with location stats:', error);
    // Fall back to mock data on error
    res.status(200).json({ 
      success: true,
      ...getMockLocationData()
    });
  }
});

// Helper function to aggregate visitor stats
function aggregateVisitorStats(data) {
  const countries = {};
  const devices = {};
  const browsers = {};
  
  Object.values(data).forEach(visitor => {
    // Count countries
    if (visitor.country) {
      countries[visitor.country] = (countries[visitor.country] || 0) + 1;
    }
    
    // Count devices
    if (visitor.device) {
      devices[visitor.device] = (devices[visitor.device] || 0) + 1;
    }
    
    // Count browsers
    if (visitor.browser) {
      browsers[visitor.browser] = (browsers[visitor.browser] || 0) + 1;
    }
  });
  
  // Convert to required format
  const totalCountries = Object.values(countries).reduce((sum, count) => sum + count, 0);
  const totalDevices = Object.values(devices).reduce((sum, count) => sum + count, 0);
  const totalBrowsers = Object.values(browsers).reduce((sum, count) => sum + count, 0);
  
  return {
    countries: Object.entries(countries)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / totalCountries) * 100)
      }))
      .sort((a, b) => b.count - a.count),
    devices: Object.entries(devices)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalDevices) * 100)
      }))
      .sort((a, b) => b.count - a.count),
    browsers: Object.entries(browsers)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalBrowsers) * 100)
      }))
      .sort((a, b) => b.count - a.count)
  };
}

// Get mock location data for fallback
function getMockLocationData() {
  return {
    countries: [
      { country: 'United States', count: 45, percentage: 45 },
      { country: 'India', count: 20, percentage: 20 },
      { country: 'United Kingdom', count: 10, percentage: 10 },
      { country: 'Germany', count: 8, percentage: 8 },
      { country: 'Canada', count: 7, percentage: 7 },
      { country: 'Other', count: 10, percentage: 10 }
    ],
    devices: [
      { name: 'Desktop', count: 65, percentage: 65 },
      { name: 'Mobile', count: 30, percentage: 30 },
      { name: 'Tablet', count: 5, percentage: 5 }
    ],
    browsers: [
      { name: 'Chrome', count: 60, percentage: 60 },
      { name: 'Firefox', count: 15, percentage: 15 },
      { name: 'Safari', count: 15, percentage: 15 },
      { name: 'Edge', count: 8, percentage: 8 },
      { name: 'Other', count: 2, percentage: 2 }
    ]
  };
}

// Email API endpoints removed - now using client-side EmailJS

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Firebase free tier with usage tracking to stay within limits`);
});