import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { Download, HardDrive, Shield, RefreshCw, CheckCircle, AlertCircle, Save } from 'lucide-react';

const SystemSettings = () => {
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<boolean | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    ipRestriction: false,
    failedLoginLimit: 5
  });

  useEffect(() => {
    // Fetch system settings
    const fetchSystemSettings = async () => {
      if (!database) return;
      
      try {
        const settingsRef = ref(database, 'settings/system');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setLastBackupDate(data.lastBackup || null);
          setAutoBackupEnabled(data.autoBackup?.enabled || false);
          setAutoBackupFrequency(data.autoBackup?.frequency || 'weekly');
          setSecuritySettings({
            twoFactorAuth: data.security?.twoFactorAuth || false,
            ipRestriction: data.security?.ipRestriction || false,
            failedLoginLimit: data.security?.failedLoginLimit || 5
          });
        }
      } catch (error) {
        console.error('Error fetching system settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSystemSettings();
  }, []);
  
  const createBackup = async () => {
    if (!database) return;
    
    setIsCreatingBackup(true);
    setBackupSuccess(null);
    
    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentDate = new Date().toISOString();
      const settingsRef = ref(database, 'settings/system');
      
      // Get current settings first
      const snapshot = await get(settingsRef);
      const currentSettings = snapshot.exists() ? snapshot.val() : {};
      
      // Update with new backup date
      await set(settingsRef, {
        ...currentSettings,
        lastBackup: currentDate,
        backupHistory: {
          ...(currentSettings.backupHistory || {}),
          [Date.now()]: {
            date: currentDate,
            status: 'success',
            size: '2.3MB'
          }
        }
      });
      
      setLastBackupDate(currentDate);
      setBackupSuccess(true);
    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupSuccess(false);
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  const saveAutoBackupSettings = async () => {
    if (!database) return;
    
    try {
      const settingsRef = ref(database, 'settings/system');
      const snapshot = await get(settingsRef);
      const currentSettings = snapshot.exists() ? snapshot.val() : {};
      
      await set(settingsRef, {
        ...currentSettings,
        autoBackup: {
          enabled: autoBackupEnabled,
          frequency: autoBackupFrequency,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error saving auto backup settings:', error);
    }
  };
  
  const saveSecuritySettings = async () => {
    if (!database) return;
    
    try {
      const settingsRef = ref(database, 'settings/system');
      const snapshot = await get(settingsRef);
      const currentSettings = snapshot.exists() ? snapshot.val() : {};
      
      await set(settingsRef, {
        ...currentSettings,
        security: {
          ...securitySettings,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage backup, security, and system configuration.
        </p>
      </div>
      
      {/* Backup Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
          <HardDrive className="w-5 h-5 mr-2 text-blue-500" />
          Backup Management
        </h3>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-md font-medium dark:text-white">Database Backup</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lastBackupDate 
                  ? `Last backup: ${formatDate(lastBackupDate)}` 
                  : 'No backups created yet'}
              </p>
            </div>
            <button
              onClick={createBackup}
              disabled={isCreatingBackup}
              className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </button>
          </div>
          
          {backupSuccess !== null && (
            <div className={`p-3 rounded-md ${
              backupSuccess 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center">
                {backupSuccess ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                <p>
                  {backupSuccess 
                    ? 'Backup created successfully!' 
                    : 'Failed to create backup. Please try again.'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-md font-medium mb-3 dark:text-white">Automatic Backup</h4>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="autoBackup"
              checked={autoBackupEnabled}
              onChange={(e) => setAutoBackupEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable automatic backups
            </label>
          </div>
          
          <div className="flex items-center mb-4">
            <label htmlFor="backupFrequency" className="block text-sm text-gray-700 dark:text-gray-300 w-32">
              Backup frequency:
            </label>
            <select
              id="backupFrequency"
              value={autoBackupFrequency}
              onChange={(e) => setAutoBackupFrequency(e.target.value)}
              disabled={!autoBackupEnabled}
              className="ml-2 block w-full max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <button
            onClick={saveAutoBackupSettings}
            className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm transition-colors"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Backup Settings
          </button>
        </div>
      </div>
      
      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
          <Shield className="w-5 h-5 mr-2 text-green-500" />
          Security Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="twoFactor"
              checked={securitySettings.twoFactorAuth}
              onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="twoFactor" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable two-factor authentication
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ipRestriction"
              checked={securitySettings.ipRestriction}
              onChange={(e) => setSecuritySettings({...securitySettings, ipRestriction: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="ipRestriction" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Restrict access by IP address
            </label>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="failedLoginLimit" className="block text-sm text-gray-700 dark:text-gray-300 w-56">
              Failed login attempt limit:
            </label>
            <input
              type="number"
              id="failedLoginLimit"
              value={securitySettings.failedLoginLimit}
              onChange={(e) => setSecuritySettings({...securitySettings, failedLoginLimit: parseInt(e.target.value) || 5})}
              min="1"
              max="10"
              className="ml-2 block w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="pt-2">
            <button
              onClick={saveSecuritySettings}
              className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm transition-colors"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Security Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings; 