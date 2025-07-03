// Firebase Rules Deployment Script
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}Firebase Rules Deployment Script${colors.reset}`);
console.log(`${colors.yellow}This script will deploy your Firestore and Realtime Database rules to Firebase.${colors.reset}`);
console.log('');

// Check if Firebase CLI is installed
try {
  console.log(`${colors.blue}Checking if Firebase CLI is installed...${colors.reset}`);
  execSync('firebase --version', { stdio: 'pipe' });
  console.log(`${colors.green}Firebase CLI is installed.${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Firebase CLI is not installed. Please install it with:${colors.reset}`);
  console.error(`${colors.yellow}npm install -g firebase-tools${colors.reset}`);
  process.exit(1);
}

// Check if user is logged in to Firebase
try {
  console.log(`${colors.blue}Checking if you're logged in to Firebase...${colors.reset}`);
  execSync('firebase projects:list', { stdio: 'pipe' });
  console.log(`${colors.green}You're logged in to Firebase.${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}You're not logged in to Firebase. Please login with:${colors.reset}`);
  console.error(`${colors.yellow}firebase login${colors.reset}`);
  process.exit(1);
}

// Check if firebase.json exists
const firebaseConfigPath = path.join(__dirname, 'firebase.json');
if (!fs.existsSync(firebaseConfigPath)) {
  console.log(`${colors.yellow}firebase.json not found. Creating one...${colors.reset}`);
  
  const firebaseConfig = {
    "firestore": {
      "rules": "firestore-rules.rules",
      "indexes": "firestore.indexes.json"
    },
    "database": {
      "rules": "database.rules.json"
    },
    "hosting": {
      "public": "dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    "storage": {
      "rules": "storage.rules"
    }
  };
  
  fs.writeFileSync(firebaseConfigPath, JSON.stringify(firebaseConfig, null, 2));
  console.log(`${colors.green}Created firebase.json${colors.reset}`);
}

// Check if firestore.indexes.json exists
const firestoreIndexesPath = path.join(__dirname, 'firestore.indexes.json');
if (!fs.existsSync(firestoreIndexesPath)) {
  console.log(`${colors.yellow}firestore.indexes.json not found. Creating one...${colors.reset}`);
  
  const firestoreIndexes = {
    "indexes": [],
    "fieldOverrides": []
  };
  
  fs.writeFileSync(firestoreIndexesPath, JSON.stringify(firestoreIndexes, null, 2));
  console.log(`${colors.green}Created firestore.indexes.json${colors.reset}`);
}

// Deploy Firestore rules
console.log(`${colors.blue}Deploying Firestore rules...${colors.reset}`);
try {
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log(`${colors.green}Firestore rules deployed successfully.${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to deploy Firestore rules:${colors.reset}`, error.message);
}

// Deploy Realtime Database rules
console.log(`${colors.blue}Deploying Realtime Database rules...${colors.reset}`);
try {
  execSync('firebase deploy --only database', { stdio: 'inherit' });
  console.log(`${colors.green}Realtime Database rules deployed successfully.${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to deploy Realtime Database rules:${colors.reset}`, error.message);
}

console.log('');
console.log(`${colors.green}Deployment complete!${colors.reset}`);
console.log(`${colors.cyan}Your Firebase rules have been updated.${colors.reset}`);
