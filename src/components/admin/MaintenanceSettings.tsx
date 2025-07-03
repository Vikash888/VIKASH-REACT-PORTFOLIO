import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Settings, Info, RefreshCw } from 'lucide-react';
import MaintenancePage from '../MaintenancePage';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

interface MaintenanceSettingsProps {
  isMaintenanceMode: boolean;
  isLoading?: boolean;
  maintenanceEndTime?: string;
  toggleMaintenanceMode: (value: boolean, message: string, allowAdmin: boolean, endTime: string) => Promise<void>;
}

const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({
  isMaintenanceMode,
  isLoading = false,
  maintenanceEndTime = '',
  toggleMaintenanceMode
}) => {
  const { darkMode } = useContext(ThemeContext);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "We're currently updating our site to bring you a better experience. Please check back soon!"
  );
  const [allowAdminAccess, setAllowAdminAccess] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert ISO string to local datetime-local format
  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  };

  const [endTime, setEndTime] = useState(formatDateTimeLocal(maintenanceEndTime));

  useEffect(() => {
    // Reset error when maintenance mode changes
    setError(null);
  }, [isMaintenanceMode]);

  useEffect(() => {
    // Update endTime when maintenanceEndTime prop changes
    setEndTime(formatDateTimeLocal(maintenanceEndTime));
  }, [maintenanceEndTime]);

  const handleToggle = async () => {
    if (isSaving) return;

    // Validate end time
    if (!endTime && !isMaintenanceMode) {
      setError('Please set a maintenance end time');
      return;
    }

    // Convert datetime-local to ISO string
    const endTimeISO = endTime ? new Date(endTime).toISOString() : '';

    setIsSaving(true);
    setError(null);
    try {
      await toggleMaintenanceMode(!isMaintenanceMode, maintenanceMessage, allowAdminAccess, endTimeISO);
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      setError(`Failed to ${!isMaintenanceMode ? 'enable' : 'disable'} maintenance mode. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Maintenance Mode</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enable maintenance mode to temporarily take down your portfolio site for updates.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-fade-in">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
        isMaintenanceMode ? 'border-amber-500' : 'border-green-500'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            {isMaintenanceMode ? (
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 mr-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            ) : (
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mr-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium dark:text-white">
                {isMaintenanceMode ? 'Maintenance Mode Active' : 'Site Online'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isMaintenanceMode
                  ? 'Your portfolio is currently in maintenance mode'
                  : 'Your portfolio is accessible to visitors'}
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleToggle}
              disabled={isSaving || isLoading}
              className={`relative px-4 py-2 rounded-md text-white font-medium focus:outline-none transition-all duration-300 ${
                isSaving || isLoading ? 'opacity-70 cursor-not-allowed' : ''
              } ${
                isMaintenanceMode
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {isSaving && (
                <RefreshCw className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
              )}
              <span className={isSaving ? 'pl-4' : ''}>
                {isMaintenanceMode ? 'Bring Site Online' : 'Enable Maintenance Mode'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Maintenance Settings
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maintenance Message
            </label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter the message visitors will see during maintenance"
              disabled={isSaving || isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maintenance End Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isSaving || isLoading}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Set when maintenance mode will end. The countdown timer will be displayed to visitors.
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowAdminAccess"
              checked={allowAdminAccess}
              onChange={(e) => setAllowAdminAccess(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              disabled={isSaving || isLoading}
            />
            <label htmlFor="allowAdminAccess" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Allow admin access during maintenance
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Maintenance Page Preview
        </h3>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </button>

          {previewMode && (
            <div className="bg-white dark:bg-gray-900 p-4 overflow-hidden">
              <div className="transform scale-75 origin-top border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-lg">
                <MaintenancePage message={maintenanceMessage} darkMode={darkMode} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSettings;