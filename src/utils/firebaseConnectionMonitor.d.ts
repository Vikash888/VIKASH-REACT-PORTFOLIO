export const ConnectionStatus: {
  CHECKING: string;
  CONNECTED: string;
  FIRESTORE_ERROR: string;
  REALTIME_DB_ERROR: string;
  AUTH_ERROR: string;
  NETWORK_ERROR: string;
  BLOCKED: string;
  UNKNOWN_ERROR: string;
};

export interface ConnectionResult {
  status: string;
  message: string;
}

export interface DiagnosticResult extends ConnectionResult {
  firebaseInitialized: boolean;
  networkOnline: boolean;
  firestoreAvailable: boolean;
  realtimeDatabaseAvailable: boolean;
  authAvailable: boolean;
  userAgent: string;
  timestamp: string;
}

export function isFirebaseInitialized(): boolean;
export function isConnectionBlocked(): Promise<boolean>;
export function testFirestoreConnection(): Promise<boolean>;
export function testRealtimeDatabaseConnection(): Promise<boolean>;
export function testAuthentication(): Promise<boolean>;
export function checkFirebaseConnection(): Promise<ConnectionResult>;
export function getFirebaseDiagnostics(): Promise<DiagnosticResult>;
