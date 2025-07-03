import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeContext } from '../contexts/ThemeContext';
import { useContext } from 'react';
import AccessRestricted from './AccessRestricted';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { user, loading, error } = useAuth();
  const { darkMode } = useContext(ThemeContext);
  const location = useLocation();

  console.log('🔐 AdminRouteGuard - Access Check:', {
    path: location.pathname,
    user: user?.email || 'No user',
    loading,
    error,
    timestamp: new Date().toISOString()
  });

  // Show loading state
  if (loading) {
    console.log('⏳ Still loading authentication...');
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`p-8 rounded-lg shadow-md w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`text-center mt-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Verifying administrative privileges...
          </p>
        </div>
      </div>
    );
  }

  // CRITICAL SECURITY CHECK: Only allow specific admin email
  const isAuthorizedAdmin = user?.email === 'vikash.jmbox@gmail.com' && user?.emailVerified !== false;

  console.log('🛡️ Security Decision:', {
    userEmail: user?.email,
    isAuthorizedAdmin,
    emailVerified: user?.emailVerified,
    willGrantAccess: isAuthorizedAdmin
  });

  // Block access for everyone except the authorized admin
  if (!isAuthorizedAdmin) {
    console.warn('🚨 ACCESS DENIED - Showing AccessRestricted page');
    return <AccessRestricted User={user?.email || 'Unauthorized'} darkMode={darkMode} />;
  }

  // Only reach here if user is the authorized admin
  console.log('✅ ACCESS GRANTED - Authorized admin detected');
  return <>{children}</>;
};

export default AdminRouteGuard;
