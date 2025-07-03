import React, { useState, useEffect, useRef } from 'react';
import { Wrench, Hammer, Clock, RefreshCw, Mail, AlertTriangle, Lock, Moon, Sun, User } from 'lucide-react';
import { auth } from '../config/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface MaintenancePageProps {
  message: string;
  darkMode: boolean;
  toggleDarkMode?: () => void;
  endTime?: string;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ message, darkMode, toggleDarkMode, endTime }) => {
  const [countdown, setCountdown] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [hammerClicks, setHammerClicks] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Use provided end time or set default to 2 hours from now
    const maintenanceEndTime = endTime
      ? new Date(endTime)
      : (() => {
          const defaultEndTime = new Date();
          defaultEndTime.setHours(defaultEndTime.getHours() + 2);
          return defaultEndTime;
        })();

    const timer = setInterval(() => {
      const now = new Date();
      const diff = maintenanceEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('00:00:00');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  // Handle the hammer icon clicks
  const handleHammerClick = () => {
    setHammerClicks(prev => prev + 1);

    // Reset clicks after 3 seconds of inactivity
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      if (hammerClicks === 3) {
        setShowLoginModal(true);
      }
      setHammerClicks(0);
    }, 3000);

    // Show modal after 4 clicks
    if (hammerClicks === 3) {
      setShowLoginModal(true);
      setHammerClicks(0);
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    }
  };

  // Direct Google sign-in without showing modal
  const handleDirectLogin = async () => {
    setAuthenticating(true);

    try {
      if (!auth) {
        console.error('Authentication system not initialized');
        throw new Error('Authentication system not initialized');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);

      if (!result || !result.user) {
        throw new Error('Authentication failed. No user data received.');
      }

      // Check for admin email
      if (result.user.email === 'vikash.jmbox@gmail.com') {
        console.log("Admin authentication successful!");
        setRedirecting(true);

        try {
          // Store auth info in localStorage to persist through redirect
          localStorage.setItem('adminAuthenticated', 'true');
          localStorage.setItem('adminBypassedMaintenance', 'true');

          // Use a short delay to ensure UI updates before redirect
          setTimeout(() => {
            window.location.href = '/admin-welcome';
          }, 1000);
        } catch (error) {
          console.error("Error during redirect:", error);
          window.location.assign('/admin-welcome');
        }
      } else {
        console.log("Not an admin email:", result.user.email);
        setLoginError('You do not have admin privileges');
        setAuthenticating(false);
        setShowLoginModal(true); // Show the modal with error message
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthenticating(false);

      // Only show modal with error if there's a user-facing error
      if (error instanceof Error) {
        const firebaseError = error as { code?: string; message?: string };
        if (firebaseError.code !== 'auth/popup-closed-by-user') {
          setLoginError(firebaseError.message || 'Authentication failed. Please try again.');
          setShowLoginModal(true);
        }
      } else {
        setLoginError('Authentication failed. Please try again.');
        setShowLoginModal(true);
      }
    }
  };

  const handleAdminLogin = async () => {
    setAuthenticating(true);
    setLoginError('');

    try {
      if (!auth) {
        console.error('Authentication system not initialized');
        throw new Error('Authentication system not initialized');
      }

      const provider = new GoogleAuthProvider();

      // Add scopes to request user's email
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);

      if (!result || !result.user) {
        throw new Error('Authentication failed. No user data received.');
      }

      // Check for admin email
      if (result.user.email === 'vikash.jmbox@gmail.com') {
        console.log("Admin authentication successful!");
        setRedirecting(true);

        try {
          // Store auth info in localStorage to persist through redirect
          localStorage.setItem('adminAuthenticated', 'true');
          localStorage.setItem('adminBypassedMaintenance', 'true');

          // Use a short delay to ensure UI updates before redirect
          setTimeout(() => {
            // Redirect to welcome page instead of dashboard
            window.location.href = '/admin-welcome';
          }, 1000);
        } catch (error) {
          console.error("Error during redirect:", error);
          // Fallback direct navigation
          window.location.assign('/admin-welcome');
        }
      } else {
        console.log("Not an admin email:", result.user.email);
        setLoginError('You do not have admin privileges');
        setAuthenticating(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);

      if (error instanceof Error) {
        const firebaseError = error as { code?: string; message?: string };

        // Handle specific Firebase auth errors
        if (firebaseError.code === 'auth/popup-closed-by-user') {
          setLoginError('Sign-in popup was closed. Please try again.');
        } else if (firebaseError.code === 'auth/popup-blocked') {
          setLoginError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        } else if (firebaseError.code === 'auth/cancelled-popup-request') {
          setLoginError('Multiple popup requests were triggered. Please try again.');
        } else if (firebaseError.code === 'auth/network-request-failed') {
          setLoginError('Network error. Please check your internet connection and try again.');
        } else {
          setLoginError(firebaseError.message || 'Authentication failed. Please try again.');
        }
      } else {
        setLoginError('Authentication failed. Please try again.');
      }
      setAuthenticating(false);
    }
  };

  // Show loading screen while redirecting
  if (redirecting) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 dark:text-gray-200">Redirecting to admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Dark Mode Toggle - only show if toggleDarkMode is provided */}
      {toggleDarkMode && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-6 h-6 text-yellow-500" />
            ) : (
              <Moon className="w-6 h-6 text-blue-600" />
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Top decorative banner */}
        <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Wrench className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
              Site Under Maintenance
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mb-6"></div>
          </div>

          {/* Message */}
          <div className="mb-10 text-center">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{message}</p>

            {/* Countdown Timer */}
            {countdown && (
              <div className="mb-8">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Estimated time remaining:</p>
                <div className="flex justify-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {countdown.split(':')[0]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">HOURS</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">:</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {countdown.split(':')[1]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">MINUTES</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">:</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {countdown.split(':')[2]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">SECONDS</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-8">
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-3 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Scheduled Maintenance</span>
              </div>

              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-4 py-3 rounded-lg">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">Back soon</span>
              </div>

              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-4 py-3 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span className="text-sm font-medium">Working on it</span>
              </div>
            </div>
          </div>

          {/* Animation */}
          <div className="flex justify-center mb-10">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-t-4 border-b-4 border-purple-500 rounded-full animate-spin-reverse"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-t-4 border-b-4 border-pink-500 rounded-full animate-spin-slow"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Hammer
                  className="w-12 h-12 text-gray-800 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={handleHammerClick}
                />
              </div>
            </div>
          </div>

          {/* Contact options */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
              Need to get in touch?
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:vikash.jmbox@gmail.com"
                className="flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <Mail className="w-5 h-5" />
                <span>Email Us</span>
              </a>
              <button
                onClick={handleDirectLogin}
                disabled={authenticating}
                className="flex items-center space-x-2 px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors shadow-md hover:shadow-lg dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <User className="w-5 h-5" />
                <span>vikash</span>
                {authenticating && <RefreshCw className="w-4 h-4 ml-2 animate-spin" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom decorative banner */}
        <div className="h-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} | All rights reserved</p>
      </div>

      {/* Admin Login Modal - only shows for errors now */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-fade-in">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
              <h3 className="text-xl font-bold text-white">Admin Authentication</h3>
            </div>
            <div className="p-6">
              {loginError && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  <p>{loginError}</p>
                </div>
              )}
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                This area is restricted to administrators only. Please authenticate to continue.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogin}
                  disabled={authenticating || redirecting}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  {authenticating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;