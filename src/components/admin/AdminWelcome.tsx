import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';

const AdminWelcome = () => {
  const [displayName, setDisplayName] = useState('Admin');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user information if available
    if (auth && auth.currentUser) {
      setDisplayName(auth.currentUser.displayName || 'Admin');
      setPhotoURL(auth.currentUser.photoURL || '');
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 dark:text-gray-200">Preparing admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-fade-in">
        {/* Top decorative banner */}
        <div className="h-3 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>

        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Welcome Message */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
              Welcome, {displayName}!
            </h1>

            <div className="h-1.5 w-24 bg-gradient-to-r from-green-500 to-blue-500 mx-auto rounded-full mb-6"></div>

            {/* User Photo */}
            {photoURL && (
              <div className="mb-6">
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
                />
              </div>
            )}

            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              You've successfully bypassed maintenance mode with your admin credentials.
              You now have full access to the website and all administrative functions.
            </p>

            {/* Highlighted Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded mb-8 text-left">
              <p className="font-medium">Maintenance Mode is Active</p>
              <p className="text-sm">Regular users will still see the maintenance page, but you have full access to the site.</p>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom decorative banner */}
        <div className="h-3 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"></div>
      </div>
    </div>
  );
};

export default AdminWelcome;