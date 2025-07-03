import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firestore if not already initialized
const db = getFirestore();

// Middleware to verify admin status
export const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if the user is an admin by querying Firestore
    const userDoc = await db.collection('admins').doc(decodedToken.uid).get();
    
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not an admin user' });
    }
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: true
    };
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: Invalid token',
      error: error.message
    });
  }
};

// Get visitor statistics with optional date filtering
export const getVisitorStats = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    let query = db.collection('visitors');
    
    // Apply date filters if provided
    if (startDate) {
      const startTimestamp = new Date(startDate);
      query = query.where('timestamp', '>=', startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate);
      query = query.where('timestamp', '<=', endTimestamp);
    }
    
    // Order by timestamp descending and limit results
    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const visitors = [];
    snapshot.forEach(doc => {
      visitors.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      });
    });
    
    res.status(200).json({
      success: true,
      count: visitors.length,
      visitors
    });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor statistics',
      error: error.message
    });
  }
};

// Get count of active visitors (last 5 minutes)
export const getActiveVisitors = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const snapshot = await db.collection('visitors')
      .where('timestamp', '>=', fiveMinutesAgo)
      .get();
    
    // Count unique IPs
    const uniqueIPs = new Set();
    snapshot.forEach(doc => {
      const ip = doc.data().ip;
      if (ip) uniqueIPs.add(ip);
    });
    
    res.status(200).json({
      success: true,
      activeVisitors: uniqueIPs.size
    });
  } catch (error) {
    console.error('Error fetching active visitors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active visitors',
      error: error.message
    });
  }
};

// Get daily visitor counts
export const getDailyVisitorCounts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const snapshot = await db.collection('visitors')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();
    
    // Group visitors by day and count unique visitors per day
    const dailyCounts = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate();
      
      if (timestamp) {
        const day = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
        if (!dailyCounts[day]) {
          dailyCounts[day] = new Set();
        }
        dailyCounts[day].add(data.ip || 'unknown');
      }
    });
    
    // Convert to array format with counts
    const result = Object.entries(dailyCounts).map(([date, ipSet]) => ({
      date,
      count: ipSet.size
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    res.status(200).json({
      success: true,
      dailyCounts: result
    });
  } catch (error) {
    console.error('Error fetching daily visitor counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily visitor counts',
      error: error.message
    });
  }
}; 