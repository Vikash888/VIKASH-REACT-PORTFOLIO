import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

async function deployRules() {
  try {
    // Deploy Realtime Database Rules
    const db = getDatabase();
    const dbRules = readFileSync('./firebase-rtdb-rules.json', 'utf8');
    await db.setRules(dbRules);
    console.log('Successfully deployed Realtime Database rules');

    // Deploy Storage Rules
    const storage = getStorage();
    const storageRules = readFileSync('./storage.rules', 'utf8');
    await storage.setRules(storageRules);
    console.log('Successfully deployed Storage rules');

    process.exit(0);
  } catch (error) {
    console.error('Error deploying rules:', error);
    process.exit(1);
  }
}

deployRules();