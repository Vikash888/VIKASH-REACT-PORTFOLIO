#!/usr/bin/env node

/**
 * This script cleans up the active users database to fix incorrect visitor counts.
 * It removes stale entries and resets the history to show accurate numbers.
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update, set } = require('firebase/database');
require('dotenv').config();

// Define Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
};

async function fixActiveUsers() {
  try {
    console.log('\n🔧 Active Users Database Repair Tool\n');
    console.log('Initializing Firebase connection...');
    
    // Check if environment variables are set
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
      console.error('❌ ERROR: Missing Firebase configuration.');
      console.log('Make sure your .env file contains all necessary Firebase variables.');
      process.exit(1);
    }
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    
    // Database references
    const activeUsersRef = ref(database, 'activeUsers');
    const historyRef = ref(database, 'activeUsersHistory');
    
    // Step 1: Get all current data
    console.log('\n📊 Analyzing database entries...');
    const snapshot = await get(activeUsersRef);
    
    if (!snapshot.exists()) {
      console.log('✅ No active users data found. Nothing to fix.');
      process.exit(0);
    }
    
    // Step 2: Analyze and categorize entries
    const data = snapshot.val();
    const entries = Object.entries(data);
    console.log(`Found ${entries.length} total entries in active users database`);
    
    // Step 3: Validate each entry
    const now = Date.now();
    let validCount = 0;
    let invalidCount = 0;
    let inactiveCount = 0;
    let malformedCount = 0;
    const updates = {};
    
    entries.forEach(([key, user]) => {
      // Check if it's a properly structured user object
      const isValidStructure = user && 
                            typeof user === 'object' && 
                            typeof user.sessionId === 'string' && 
                            typeof user.visitorId === 'string' &&
                            typeof user.browser === 'string' &&
                            typeof user.device === 'string' &&
                            typeof user.lastActivity === 'number' &&
                            typeof user.active === 'boolean';
      
      if (!isValidStructure) {
        malformedCount++;
        updates[key] = null;
        return;
      }
      
      // Check if it's an active user with recent activity (last 30 seconds)
      const timeSinceActivity = now - user.lastActivity;
      const isRecent = timeSinceActivity < 30000; // 30 seconds
      
      if (!user.active || !isRecent) {
        inactiveCount++;
        updates[key] = null;
        return;
      }
      
      // This is a valid, active user
      validCount++;
    });
    
    // Step 4: Report findings
    console.log('\n📝 Analysis results:');
    console.log(`• ${validCount} valid active users`);
    console.log(`• ${inactiveCount} inactive users (marked for removal)`);
    console.log(`• ${malformedCount} malformed entries (marked for removal)`);
    
    // Step 5: Clean up the database
    const totalToRemove = inactiveCount + malformedCount;
    if (totalToRemove > 0) {
      console.log(`\n🧹 Removing ${totalToRemove} problematic entries...`);
      await update(activeUsersRef, updates);
      
      // Step 6: Reset the history to reflect accurate counts
      console.log('📉 Resetting visitor history to reflect accurate counts...');
      const historyData = [{
        count: validCount,
        timestamp: now
      }];
      await set(historyRef, historyData);
      
      console.log('\n✅ Database repair complete!');
      console.log(`Current active user count: ${validCount}`);
    } else {
      console.log('\n✅ No issues found. Database is clean.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ An error occurred:', error);
    process.exit(1);
  }
}

// Run the fix
fixActiveUsers();
