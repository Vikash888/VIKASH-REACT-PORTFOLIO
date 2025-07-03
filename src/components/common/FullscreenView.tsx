import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface FullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: 'image' | 'video';
  url: string;
  title: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const fullscreenStyles = `
  .fullscreen-media-container {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0,0,0,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
  }
  .fullscreen-media {
    max-width: 100vw;
    max-height: 100vh;
    width: auto;
    height: auto;
    object-fit: contain;
    box-shadow: 0 0 32px 0 rgba(0,0,0,0.7);
    background: #000;
    border-radius: 0.5rem;
  }
`;

const FullscreenView: React.FC<FullscreenViewProps> = ({
  isOpen,
  onClose,
  mediaType,
  url,
  title,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Request fullscreen when component mounts
      if (containerRef.current) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    } else {
      document.body.style.overflow = 'unset';
      // Exit fullscreen when component unmounts
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.overflow = 'unset';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    };
  }, [isOpen, onClose, hasNext, hasPrevious, onNext, onPrevious]);

  // Set volume when video is loaded
  useEffect(() => {
    if (isOpen && mediaType === 'video' && mediaRef.current) {
      const videoElement = mediaRef.current as HTMLVideoElement;
      videoElement.volume = 0.5;
      videoElement.muted = false;
    }
  }, [isOpen, mediaType]);

  // Inject styles for fullscreen
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = fullscreenStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleMediaLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setError('Failed to load media');
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fullscreen-media-container"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Title */}
      <div className="absolute top-4 left-4 z-50 text-white text-lg font-medium">
        {title}
      </div>

      {/* Navigation buttons */}
      {hasPrevious && onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {hasNext && onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Media container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-xl font-medium mb-2">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {mediaType === 'image' ? (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={url}
            alt={title}
            className="fullscreen-media"
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={url}
            controls
            autoPlay
            className="fullscreen-media"
            onLoadedData={handleMediaLoad}
            onError={handleMediaError}
            playsInline
          />
        )}
      </div>
    </div>
  );
};

export default FullscreenView;
