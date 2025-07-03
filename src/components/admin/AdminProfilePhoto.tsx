import React, { useState, useEffect } from 'react';
import { auth } from '../../config/firebase';

interface AdminProfilePhotoProps {
  size?: 'sm' | 'md' | 'lg';
}

const AdminProfilePhoto: React.FC<AdminProfilePhotoProps> = ({ size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const [adminUser, setAdminUser] = useState({
    email: auth?.currentUser?.email || 'Admin',
    photoURL: auth?.currentUser?.photoURL || ''
  });

  // Get admin user info when auth state changes
  useEffect(() => {
    if (auth?.currentUser) {
      setAdminUser({
        email: auth.currentUser.email || 'Admin',
        photoURL: auth.currentUser.photoURL || ''
      });
    }
  }, [auth?.currentUser]);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };
  
  if (adminUser.photoURL && !imgError) {
    return (
      <img 
        src={adminUser.photoURL} 
        alt="Admin" 
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-blue-500`}
        onError={() => setImgError(true)}
      />
    );
  }
  
  // Display fallback with first letter of email
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold ${textSizes[size]}`}>
      {adminUser.email.charAt(0).toUpperCase()}
    </div>
  );
};

export default AdminProfilePhoto; 