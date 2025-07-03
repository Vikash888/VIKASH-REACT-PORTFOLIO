import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

interface AccessRestrictedProps {
  User?: string;
  ipAddress?: string;
  darkMode?: boolean;
}

const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  User = 'Unknown',
  ipAddress: initialIpAddress
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countDown, setCountDown] = useState(10);
  const [ipAddress, setIpAddress] = useState(initialIpAddress || 'Loading...');
  const gridElements = Array(100).fill(null);

  // Get user from location state if available
  const stateUser = location.state?.User;

  useEffect(() => {
    // Get IP address if not provided
    if (!initialIpAddress) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setIpAddress(data.ip))
        .catch(() => setIpAddress('Unknown'));
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountDown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, initialIpAddress]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-red-900/40 relative overflow-hidden" data-testid="access-restricted">
      {/* Background grid animation */}
      <div className="absolute inset-0 z-0">
        <div className="grid grid-cols-10 h-full w-full">
          {gridElements.map((_, index) => (
            <div
              key={index}
              className="border border-red-200/20 dark:border-red-900/20 flex items-center justify-center"
            >
              {index % 7 === 0 && (
                <Lock
                  className="text-red-500/10 dark:text-red-900/10 animate-pulse"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    width: '50%',
                    height: '50%'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-lg w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-fade-in border border-red-100 dark:border-red-900/50">
          {/* Top decorative banner */}
          <div className="h-3 bg-gradient-to-r from-red-500 via-red-600 to-red-700"></div>

          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* Alert Icon */}
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 animate-pulse">
                <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
                Access Restricted
              </h1>

              <div className="h-1.5 w-24 bg-gradient-to-r from-red-500 to-orange-500 mx-auto rounded-full mb-6"></div>

              {/* Security alert box */}
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r mb-6 text-left w-full">
                <div className="flex">
                  <AlertTriangle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-400">Critical Security Alert</p>
                    <p className="text-sm text-red-600 dark:text-red-300 text-justify">
                      Unauthorized access attempt detected and logged. All administrative access attempts are monitored, recorded, and reported to system administrators. This incident has been logged with your IP address, browser information, and timestamp for security purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4 w-full text-left mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your attempt to access administrative features has been denied and recorded with the following details:
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-gray-500 dark:text-gray-400">User:</div>
                    <div className="col-span-2 font-medium text-gray-800 dark:text-gray-200">{stateUser || User}</div>

                    <div className="text-gray-500 dark:text-gray-400">IP Address:</div>
                    <div className="col-span-2 font-medium text-gray-800 dark:text-gray-200">{ipAddress}</div>

                    <div className="text-gray-500 dark:text-gray-400">Time:</div>
                    <div className="col-span-2 font-medium text-gray-800 dark:text-gray-200">
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown and button */}
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  You will be redirected to the home page in {countDown} seconds.
                </p>

                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Return to Home Page
                </button>
              </div>
            </div>
          </div>

          {/* Bottom decorative banner */}
          <div className="h-3 bg-gradient-to-r from-red-700 via-red-600 to-red-500"></div>
        </div>
      </div>
    </div>
  );
};

export default AccessRestricted;