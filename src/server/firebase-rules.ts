import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

export async function deployFirebaseRules() {
  const rules = `
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow read access to all documents
        match /{document=**} {
          allow read: if true;
          
          // Allow write access only to authenticated users
          allow write: if request.auth != null;
        }
        
        // Projects collection specific rules
        match /projects/{projectId} {
          allow read: if true;
          allow write: if request.auth != null;
        }
        
        // Skills collection specific rules
        match /skills/{skillId} {
          allow read: if true;
          allow write: if request.auth != null;
        }
        
        // Contact messages collection specific rules
        match /contact_messages/{messageId} {
          allow read: if request.auth != null;
          allow create: if true;
          allow update, delete: if request.auth != null;
        }
        
        // Resumes collection specific rules
        match /resumes/{resumeId} {
          allow read: if true;
          allow write: if request.auth != null;
        }
      }
    }
  `;

  try {
    await db.setRules(rules);
    return { success: true, message: 'Firebase rules deployed successfully' };
  } catch (error) {
    console.error('Error deploying Firebase rules:', error);
    throw error;
  }
} 