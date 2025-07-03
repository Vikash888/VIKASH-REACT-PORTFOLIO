import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeContext } from '../contexts/ThemeContext';
import { useContext } from 'react';
import AccessRestricted from './AccessRestricted';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children
}) => {
  const { user, loading, error } = useAuth();
  const { darkMode } = useContext(ThemeContext);
  const location = useLocation();

  // Log access attempts for security monitoring
  useEffect(() => {
    console.log('Protected route access attempt:', {
      path: location.pathname,
      user: user?.email || 'Anonymous',
      timestamp: new Date().toISOString()
    });
  }, [location.pathname, user?.email]);

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`p-8 rounded-lg shadow-md w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`text-center mt-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Verifying access...</p>
        </div>
      </div>
    );
  }

  // Check for authentication error
  if (error) {
    console.warn('Authentication error in ProtectedRoute:', error);
    return <AccessRestricted email={user?.email || 'Authentication Error'} darkMode={darkMode} />;
  }

  // Check if user exists and is the authorized admin
  if (user?.email === 'vikash.jmbox@gmail.com' && user.emailVerified !== false) {
    return <>{children}</>;
  }

  // For all other cases (no user, non-admin email, unverified email, or any other scenario)
  const accessEmail = user?.email || 'Unauthorized Access Attempt';
  console.warn('Unauthorized access attempt:', { email: accessEmail, path: location.pathname });
  
  return <AccessRestricted email={accessEmail} darkMode={darkMode} />;
};

export default ProtectedRoute;