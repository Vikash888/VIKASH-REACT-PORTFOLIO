import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [shouldRender, setShouldRender] = useState(isLoading);

  useEffect(() => {
    if (!isLoading) {
      // Start fade out
      setIsVisible(false);
      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsVisible(true);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div className={`loading-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="loader">
        <span className="loader-dot-1"></span>
        <span className="loader-dot-2"></span>
        <span className="loader-dot-3"></span>
        <span className="loader-dot-4"></span>
      </div>
    </div>
  );
};

export default LoadingScreen;
