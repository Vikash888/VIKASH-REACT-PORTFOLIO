import { deployFirebaseRules } from '../server/firebase-rules';

export async function deployRules() {
  try {
    const result = await deployFirebaseRules();
    return { success: true, message: 'Firebase rules deployed successfully' };
  } catch (error) {
    console.error('Error deploying Firebase rules:', error);
    return { success: false, message: 'Failed to deploy Firebase rules' };
  }
} 