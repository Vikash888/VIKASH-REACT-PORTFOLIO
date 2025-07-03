import React, { useState, useEffect } from 'react';
import { 
  getFirebaseDiagnostics, 
  ConnectionStatus
} from '../../utils/firebaseConnectionMonitor';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Shield, Wifi } from 'lucide-react';

const FirebaseDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await getFirebaseDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Error running Firebase diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case ConnectionStatus.CHECKING:
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      case ConnectionStatus.BLOCKED:
        return <Shield className="w-5 h-5 text-red-500" />;
      case ConnectionStatus.NETWORK_ERROR:
        return <Wifi className="w-5 h-5 text-red-500" />;
      case ConnectionStatus.FIRESTORE_ERROR:
      case ConnectionStatus.REALTIME_DB_ERROR:
        return <Database className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
      case ConnectionStatus.CHECKING:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    }
  };

  const getFixSuggestion = (status: string) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return null;
      case ConnectionStatus.BLOCKED:
        return (
          <div className="mt-2 text-sm">
            <strong>Suggested fix:</strong> Disable ad blockers or privacy extensions that might be blocking Firebase connections.
          </div>
        );
      case ConnectionStatus.NETWORK_ERROR:
        return (
          <div className="mt-2 text-sm">
            <strong>Suggested fix:</strong> Check your internet connection and make sure you can access other websites.
          </div>
        );
      case ConnectionStatus.FIRESTORE_ERROR:
      case ConnectionStatus.REALTIME_DB_ERROR:
        return (
          <div className="mt-2 text-sm">
            <strong>Suggested fix:</strong> Verify your Firebase configuration in the .env file and make sure your project is properly set up in the Firebase console.
          </div>
        );
      case ConnectionStatus.AUTH_ERROR:
        return (
          <div className="mt-2 text-sm">
            <strong>Suggested fix:</strong> Make sure Authentication is enabled in your Firebase project and check your API keys.
          </div>
        );
      default:
        return (
          <div className="mt-2 text-sm">
            <strong>Suggested fix:</strong> Check your Firebase configuration and make sure all services are properly initialized.
          </div>
        );
    }
  };

  if (loading && !diagnostics) {
    return (
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center space-x-2">
        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
        <span>Running Firebase diagnostics...</span>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        <div className="flex items-center space-x-2">
          <XCircle className="w-5 h-5" />
          <span>Failed to run Firebase diagnostics</span>
        </div>
        <button 
          onClick={runDiagnostics}
          className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 rounded hover:bg-red-200 dark:hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(diagnostics.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon(diagnostics.status)}
          <span className="font-medium">Firebase Status: {diagnostics.status}</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
          <button 
            onClick={runDiagnostics}
            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="mt-2">{diagnostics.message}</div>
      
      {getFixSuggestion(diagnostics.status)}
      
      {expanded && (
        <div className="mt-4 text-sm">
          <h4 className="font-semibold mb-2">Diagnostic Details:</h4>
          <ul className="space-y-1 pl-5 list-disc">
            <li>Firebase Initialized: {diagnostics.firebaseInitialized ? 'Yes' : 'No'}</li>
            <li>Network Online: {diagnostics.networkOnline ? 'Yes' : 'No'}</li>
            <li>Firestore Available: {diagnostics.firestoreAvailable ? 'Yes' : 'No'}</li>
            <li>Realtime Database Available: {diagnostics.realtimeDatabaseAvailable ? 'Yes' : 'No'}</li>
            <li>Auth Available: {diagnostics.authAvailable ? 'Yes' : 'No'}</li>
            <li>Timestamp: {diagnostics.timestamp}</li>
          </ul>
          
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
            <ol className="space-y-1 pl-5 list-decimal">
              <li>Check your Firebase configuration in the .env file</li>
              <li>Make sure your Firebase project is properly set up</li>
              <li>Disable any ad blockers or privacy extensions</li>
              <li>Try using a different browser</li>
              <li>Deploy the updated Firebase rules using <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">npm run deploy-firebase-rules</code></li>
              <li>Check the browser console for specific error messages</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseDiagnostics;
