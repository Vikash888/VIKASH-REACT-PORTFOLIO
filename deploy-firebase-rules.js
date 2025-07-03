#!/usr/bin/env node

/**
 * Firebase Rules Deployment Script
 * 
 * This script helps deploy Firebase security rules to your project.
 * It can be run with Node.js to deploy Firestore, Realtime Database, and Storage rules.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Define __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths to rule files
const FIRESTORE_RULES_PATH = path.join(__dirname, 'firestore-rules.rules');
const RTDB_RULES_PATH = path.join(__dirname, 'firebase-rtdb-rules.json');
const STORAGE_RULES_PATH = path.join(__dirname, 'storage.rules');

// Check if Firebase CLI is installed
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if files exist
function checkRuleFiles() {
  const files = {
    firestore: fs.existsSync(FIRESTORE_RULES_PATH),
    rtdb: fs.existsSync(RTDB_RULES_PATH),
    storage: fs.existsSync(STORAGE_RULES_PATH)
  };
  
  return files;
}

// Deploy rules using Firebase CLI
function deployRules(type) {
  console.log(`\nDeploying ${type} rules...`);
  
  try {
    let command;
    
    switch (type) {
      case 'firestore':
        command = 'firebase deploy --only firestore:rules';
        break;
      case 'rtdb':
        command = 'firebase deploy --only database';
        break;
      case 'storage':
        command = 'firebase deploy --only storage';
        break;
      case 'all':
        command = 'firebase deploy --only firestore:rules,database,storage';
        break;
      default:
        throw new Error(`Unknown rule type: ${type}`);
    }
    
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    console.log(`✅ ${type === 'all' ? 'All' : type.toUpperCase()} rules deployed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error deploying ${type} rules:`, error.message);
    return false;
  }
}

// Display manual instructions
function displayManualInstructions() {
  console.log('\n📋 Manual Deployment Instructions:');
  console.log('1. Log in to the Firebase console: https://console.firebase.google.com/');
  console.log('2. Select your project');
  
  const files = checkRuleFiles();
  
  if (files.firestore) {
    console.log('\n--- Firestore Rules ---');
    console.log('1. Go to Firestore Database > Rules');
    console.log('2. Click "Edit rules"');
    console.log('3. Copy and paste the contents of firestore-rules.rules');
    console.log('4. Click "Publish"');
  }
  
  if (files.rtdb) {
    console.log('\n--- Realtime Database Rules ---');
    console.log('1. Go to Realtime Database > Rules');
    console.log('2. Click "Edit rules"');
    console.log('3. Copy and paste the contents of firebase-rtdb-rules.json');
    console.log('4. Click "Publish"');
  }
  
  if (files.storage) {
    console.log('\n--- Storage Rules ---');
    console.log('1. Go to Storage > Rules');
    console.log('2. Click "Edit rules"');
    console.log('3. Copy and paste the contents of storage.rules');
    console.log('4. Click "Publish"');
  }
}

// Main function
async function main() {
  console.log('🔥 Firebase Rules Deployment Utility 🔥');
  console.log('======================================');
  
  const files = checkRuleFiles();
  const hasFirebaseCLI = checkFirebaseCLI();
  
  // Check if any rule files exist
  if (!files.firestore && !files.rtdb && !files.storage) {
    console.error('❌ No rule files found. Please make sure the following files exist:');
    console.error('   - firestore-rules.rules');
    console.error('   - firebase-rtdb-rules.json');
    console.error('   - storage.rules');
    process.exit(1);
  }
  
  // Display available rule files
  console.log('📁 Found the following rule files:');
  if (files.firestore) console.log('   ✓ Firestore rules');
  if (files.rtdb) console.log('   ✓ Realtime Database rules');
  if (files.storage) console.log('   ✓ Storage rules');
  
  if (hasFirebaseCLI) {
    console.log('\n✅ Firebase CLI detected!');
    
    rl.question('\n🚀 Would you like to deploy rules now? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        rl.question('\n📋 Deploy which rules? (1: Firestore, 2: RTDB, 3: Storage, 4: All): ', (option) => {
          switch (option.trim()) {
            case '1':
              if (files.firestore) {
                deployRules('firestore');
              } else {
                console.error('❌ Firestore rules file not found');
              }
              break;
            case '2':
              if (files.rtdb) {
                deployRules('rtdb');
              } else {
                console.error('❌ RTDB rules file not found');
              }
              break;
            case '3':
              if (files.storage) {
                deployRules('storage');
              } else {
                console.error('❌ Storage rules file not found');
              }
              break;
            case '4':
              deployRules('all');
              break;
            default:
              console.log('❌ Invalid option. Exiting.');
          }
          rl.close();
        });
      } else {
        displayManualInstructions();
        rl.close();
      }
    });
  } else {
    console.log('\n⚠️ Firebase CLI not detected. You can install it with:');
    console.log('   npm install -g firebase-tools');
    console.log('   Then run: firebase login');
    
    displayManualInstructions();
    rl.close();
  }
}

// Run the script
main();