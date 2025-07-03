import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module workarounds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIEWS_FILE = path.join(__dirname, '../../data/views.json');

// Store view count data
const viewsData = {
  totalViews: 0,
  uniqueIPs: []
};

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory at:', dataDir);
  }
  
  // Create empty views file if it doesn't exist
  if (!fs.existsSync(VIEWS_FILE)) {
    fs.writeFileSync(VIEWS_FILE, JSON.stringify({
      totalViews: 0,
      uniqueIPs: []
    }));
    console.log('Created views file at:', VIEWS_FILE);
  }
};

// Load existing view data from file
const loadViewData = () => {
  ensureDataDirectory();
  
  try {
    const data = fs.readFileSync(VIEWS_FILE, 'utf8');
    const loadedData = JSON.parse(data);
    
    // Update in-memory counter with file data
    viewsData.totalViews = loadedData.totalViews;
    viewsData.uniqueIPs = loadedData.uniqueIPs;
    
    console.log('Loaded views data:', viewsData);
  } catch (error) {
    console.error('Error reading views file:', error);
  }
};

// Save current view data to file
const saveViewData = () => {
  ensureDataDirectory();
  
  try {
    fs.writeFileSync(VIEWS_FILE, JSON.stringify(viewsData, null, 2));
    console.log('Saved views data to file');
  } catch (error) {
    console.error('Error saving views data:', error);
  }
};

// Initialize view data from file
loadViewData();

// Get the current views count
export const getViews = () => {
  return {
    totalViews: viewsData.totalViews,
    uniqueIPs: viewsData.uniqueIPs
  };
};

// Track a new view from an IP address
export const trackView = (ipAddress) => {
  // Normalize IP address for consistency
  const normalizedIP = ipAddress.trim().toLowerCase();
  console.log('Tracking view from IP:', normalizedIP);
  
  // Check if this IP has been recorded before
  if (!viewsData.uniqueIPs.includes(normalizedIP)) {
    viewsData.uniqueIPs.push(normalizedIP);
    viewsData.totalViews += 1;
    
    console.log(`New visitor! Total views: ${viewsData.totalViews}, Unique visitors: ${viewsData.uniqueIPs.length}`);
    
    // Save updated data to file
    saveViewData();
  } else {
    console.log(`Returning visitor. No count change. Current total: ${viewsData.totalViews}`);
  }
  
  return viewsData.totalViews;
};

/**
 * Middleware to count page views
 */
export const viewsCounterMiddleware = (req, res, next) => {
  // Skip API routes to avoid double-counting
  if (req.path.startsWith('/api/') || req.path === '/dummy-path-for-view') {
    // For the dummy view path, increment the view counter
    if (req.path === '/dummy-path-for-view') {
      incrementViewCount(req);
    }
    return next();
  }
  
  // Increment view count for all other routes
  incrementViewCount(req);
  next();
};

/**
 * Increment the view counter
 */
const incrementViewCount = (req) => {
  // Get client IP
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             '0.0.0.0';
  
  // Track the view
  trackView(ip);
}; 