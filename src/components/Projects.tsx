import React, { useEffect, useState, useRef } from 'react';
import { Github as GitHubIcon, ExternalLink, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProjects, Project } from '../services/projectService';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import FullscreenView from './common/FullscreenView';
import { getOptimizedImageUrl, getOptimizedVideoUrl } from '../config/cloudinary';
import logger from '../utils/logger';

// Create an extended project interface for the frontend that includes the image field
interface FrontendProject extends Project {
    image: string;  // Mapped from mainImage for backward compatibility
    videoLink?: string; // Additional field for older projects
    highlighted?: boolean; // Additional field for UI highlighting
}

interface ProjectsProps {
    darkMode: boolean;
}

const Projects: React.FC<ProjectsProps> = ({ darkMode }) => {
    const [projects, setProjects] = useState<FrontendProject[]>([]);
    const [loading, setLoading] = useState(true);
    const sectionRef = useRef<HTMLElement>(null);
    const isVisible = useIntersectionObserver(sectionRef, { threshold: 0.1 });

    // Load projects once with added protection against unnecessary re-renders
    useEffect(() => {
        let isMounted = true;
        
        const loadProjects = async () => {
            setLoading(true);
            try {
                // Add retry mechanism in case of initial failure
                let projectsList: Project[] = [];
                let retryCount = 0;
                const maxRetries = 2;
                
                while (projectsList.length === 0 && retryCount <= maxRetries) {
                    try {
                        // Directly fetch projects from Firebase RTDB
                        const rtdbProjects = await getProjects();
                        
                        // Map projects with image field for backward compatibility
                        projectsList = rtdbProjects.map(project => {
                            // For each project, try to get the mainImage or fallback to first image in media
                            const firstMediaImage = project.media?.find(m => m.type === 'image');
                            
                            return {
                                ...project,
                                // Map mainImage to image for backward compatibility
                                image: project.mainImage || (firstMediaImage ? firstMediaImage.url : '')
                            };
                        });
                        
                        if (projectsList.length === 0 && retryCount < maxRetries) {
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s between retries
                            console.log(`Retrying project fetch (${retryCount}/${maxRetries})...`);
                        }
                    } catch (fetchError) {
                        console.error('Error in fetch attempt:', fetchError);
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s between retries
                        }
                    }
                }
                
                if (!isMounted) return;
                
                // Filter out projects that are marked as not visible
                const visibleProjects = projectsList.filter(project => 
                    project.visible === undefined || project.visible === true
                );
                
                // Sort by order if available
                visibleProjects.sort((a, b) => {
                    const orderA = a.order !== undefined ? a.order : 999;
                    const orderB = b.order !== undefined ? b.order : 999;
                    return orderA - orderB;
                });
                
                if (isMounted) {
                    logger.debug('projects-debug', `Loaded ${visibleProjects.length} projects successfully`);
                    
                    // Convert to FrontendProject with image field
                    const frontendProjects: FrontendProject[] = visibleProjects.map(project => {
                        // For each project, map to our frontend format with image field
                        const firstMediaImage = project.media?.find(m => m.type === 'image');
                        
                        return {
                            ...project,
                            // Map mainImage to image for backward compatibility
                            image: project.mainImage || (firstMediaImage ? firstMediaImage.url : '')
                        };
                    });
                    
                    // Log image sources for debugging
                    frontendProjects.forEach(project => {
                      logger.debug('projects-debug', `Project ${project.id} (${project.title}) image sources:`, {
                        mainImage: project.mainImage || 'none',
                        imageField: project.image || 'none', 
                        mediaImages: project.media?.filter(m => m.type === 'image').length || 0,
                        hasVideo: project.media?.some(m => m.type === 'video') || !!project.videoUrl
                      });
                    });
                    
                    setProjects(frontendProjects);
                }
            } catch (error) {
                console.error('Error loading projects:', error);
                if (isMounted) {
                    setProjects([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        
        loadProjects();
        
        return () => {
            isMounted = false;
        };
    }, []);

    const ProjectCard: React.FC<{ project: FrontendProject }> = ({ project }) => {
      const [isImageLoaded, setIsImageLoaded] = useState(false);
      const [imageError, setImageError] = useState(false);
      const [videoAvailable, setVideoAvailable] = useState(false);
      const [isFullscreen, setIsFullscreen] = useState(false);
      const [fullscreenMedia, setFullscreenMedia] = useState<{type: 'image' | 'video', url: string} | null>(null);
      const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
      const [infoModalMedia, setInfoModalMedia] = useState<{type: 'image' | 'video', url: string, index: number} | null>(null);
      const videoRef = React.useRef<HTMLVideoElement>(null);
      const infoVideoRef = React.useRef<HTMLVideoElement>(null);
      const abortControllerRef = React.useRef<AbortController | null>(null);
      const cardRef = React.useRef<HTMLDivElement>(null);

      // Cleanup function for video loading
      useEffect(() => {
        return () => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        };
      }, []);

      // Video availability check
      useEffect(() => {
        // Check if we have a video in media array or a videoUrl property
        const mediaVideo = project.media?.find(m => m.type === 'video');
        const videoSource = mediaVideo?.url || project.videoUrl;
        
        if (!videoSource) {
          setVideoAvailable(false);
          return;
        }
        
        let isMounted = true;
        
        const checkVideoAvailability = async () => {
          try {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            
            // Use a more generous timeout
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Get optimized video URL
            const videoUrl = getOptimizedVideoUrl(videoSource);
            
            // First try to quickly check if the video exists with a HEAD request
            try {
              const response = await fetch(videoUrl, {
                method: 'HEAD',
                signal: controller.signal
              });
              
              if (response.ok) {
                if (isMounted) {
                  setVideoAvailable(true);
                }
                clearTimeout(timeoutId);
                return;
              }
            } catch (e) {
              // If HEAD request fails, fallback to image check
            }
            
            // Fallback: Check for thumbnail image existence
            const img = new Image();
            img.src = videoUrl.replace(/\.(mp4|webm|mov)$/i, '.jpg');
            
            const available = await new Promise<boolean>(resolve => {
              img.onload = () => resolve(true);
              img.onerror = () => {
                // Try direct video availability as last resort
                const video = document.createElement('video');
                video.src = videoUrl;
                video.onloadedmetadata = () => resolve(true);
                video.onerror = () => resolve(false);
                // Set a small timeout just in case
                setTimeout(() => resolve(false), 2000);
              };
            });
            
            clearTimeout(timeoutId);
            
            if (isMounted) {
              setVideoAvailable(available);
            }
          } catch (error) {
            if (isMounted) {
              setVideoAvailable(false);
            }
          }
        };
        
        checkVideoAvailability();
        
        return () => {
          isMounted = false;
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        };
      }, [project.videoUrl, project.media]);

      // Video playback handling
      useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || !videoAvailable) {
          return;
        }
        
        videoElement.preload = "auto";
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.playsInline = true;
        
        const attemptAutoplay = () => {
          if (videoElement.paused) {
            videoElement.play().catch(() => {
              setTimeout(() => {
                if (videoElement) {
                  videoElement.muted = true;
                  videoElement.play().catch(() => {});
                }
              }, 100);
            });
          }
        };
        
        attemptAutoplay();
        
        const handleVisibilityChange = () => {
          if (!document.hidden && videoElement) {
            attemptAutoplay();
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          if (videoElement) {
            videoElement.pause();
          }
        };
      }, [videoAvailable]);
      
      const handleImageLoad = () => {
        setIsImageLoaded(true);
        setImageError(false);
      };
        
      const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        console.warn(`Image loading error for project ${project.id}:`, project.title);
        
        // Try to find a fallback image in the media array if main image failed
        if (!imageError && project.media && project.media.length > 0) {
          const firstImage = project.media.find(m => m.type === 'image');
          if (firstImage && firstImage.url) {
            console.log(`Using fallback image from media array for project ${project.id}`);
            e.currentTarget.src = getOptimizedImageUrl(firstImage.url);
            return;
          }
        }
        
        // If no fallback found or fallback also failed, use error image
        setImageError(true);
        setIsImageLoaded(true);
        e.currentTarget.src = "/assets/404 Error.gif";
      };

      const handleFullscreen = React.useCallback((type: 'image' | 'video') => {
        // Get the appropriate media source based on type
        const hasImage = !!project.image || (project.media && project.media.some(m => m.type === 'image'));
        const hasVideo = videoAvailable && (!!project.media?.find(m => m.type === 'video') || !!project.videoUrl);
        
        if ((type === 'image' && !hasImage) || (type === 'video' && !hasVideo)) {
          return;
        }
        
        // Find the right media URL to use
        let mediaUrl = '';
        if (type === 'image') {
          // First try project.image, then try media array
          if (project.image) {
            mediaUrl = getOptimizedImageUrl(project.image);
          } else if (project.media && project.media.length > 0) {
            // Try to find first image in media array
            const firstImage = project.media.find(m => m.type === 'image');
            if (firstImage) {
              mediaUrl = getOptimizedImageUrl(firstImage.url);
            }
          }
          
          // Log what we're using for debugging
          console.log(`Project ${project.id} fullscreen image URL:`, {
            projectImageField: project.image || 'none',
            finalImageUrl: mediaUrl,
            hasMediaImages: project.media?.some(m => m.type === 'image')
          });
        } else {
          // For video, try to find in media array first, then fall back to videoUrl
          const videoMedia = project.media?.find(m => m.type === 'video');
          const videoSource = videoMedia?.url || project.videoUrl || '';
          mediaUrl = getOptimizedVideoUrl(videoSource);
        }
        
        setFullscreenMedia({
          type,
          url: mediaUrl
        });
        
        if (type === 'video' && videoRef.current) {
          videoRef.current.muted = false;
        }
        
        setIsFullscreen(true);
      }, [project.image, project.videoUrl, project.media, project.id, videoAvailable]);

      const handleCloseFullscreen = () => {
        setIsFullscreen(false);
        setFullscreenMedia(null);
      };

      const handleCloseInfoModal = () => {
        setIsInfoModalOpen(false);
        setInfoModalMedia(null);
        if (infoVideoRef.current) {
          infoVideoRef.current.pause();
        }
      };

      const getAllMediaItems = () => {
        const items: Array<{type: 'image' | 'video', url: string}> = [];
        
        // Add main image
        if (project.image) {
          items.push({ type: 'image', url: project.image });
        }
        
        // Add media array items
        if (project.media && project.media.length > 0) {
          project.media.forEach(media => {
            if (media.url && media.url !== project.image) { // Avoid duplicates
              items.push({ type: media.type, url: media.url });
            }
          });
        }
        
        // Add video URL if different from media array
        if (project.videoUrl && !project.media?.some(m => m.url === project.videoUrl)) {
          items.push({ type: 'video', url: project.videoUrl });
        }
        
        return items;
      };

      const handleInfoModalNext = () => {
        const allMedia = getAllMediaItems();
        if (infoModalMedia && infoModalMedia.index < allMedia.length - 1) {
          const nextIndex = infoModalMedia.index + 1;
          const nextMedia = allMedia[nextIndex];
          setInfoModalMedia({
            type: nextMedia.type,
            url: nextMedia.url,
            index: nextIndex
          });
        }
      };

      const handleInfoModalPrevious = () => {
        const allMedia = getAllMediaItems();
        if (infoModalMedia && infoModalMedia.index > 0) {
          const prevIndex = infoModalMedia.index - 1;
          const prevMedia = allMedia[prevIndex];
          setInfoModalMedia({
            type: prevMedia.type,
            url: prevMedia.url,
            index: prevIndex
          });
        }
      };

      const handleInfoMediaZoom = () => {
        if (infoModalMedia) {
          setFullscreenMedia({
            type: infoModalMedia.type,
            url: infoModalMedia.url
          });
          setIsFullscreen(true);
          handleCloseInfoModal();
        }
      };

      const handleNextProject = () => {
        const currentIndex = projects.findIndex(p => p.id === project.id);
        if (currentIndex < projects.length - 1) {
          const nextProject = projects[currentIndex + 1];
          
          // Prepare media URL based on type
          let mediaUrl = '';
          
          if (fullscreenMedia?.type === 'image') {
            mediaUrl = getOptimizedImageUrl(nextProject.image);
          } else {
            // For videos, try media array first, then fall back to videoUrl
            const videoMedia = nextProject.media?.find(m => m.type === 'video');
            const videoSource = videoMedia?.url || nextProject.videoUrl || '';
            mediaUrl = getOptimizedVideoUrl(videoSource);
          }
          
          setFullscreenMedia({
            type: fullscreenMedia?.type || 'image',
            url: mediaUrl
          });
        }
      };

      const handlePreviousProject = () => {
        const currentIndex = projects.findIndex(p => p.id === project.id);
        if (currentIndex > 0) {
          const prevProject = projects[currentIndex - 1];
          
          // Prepare media URL based on type
          let mediaUrl = '';
          
          if (fullscreenMedia?.type === 'image') {
            mediaUrl = getOptimizedImageUrl(prevProject.image);
          } else {
            // For videos, try media array first, then fall back to videoUrl
            const videoMedia = prevProject.media?.find(m => m.type === 'video');
            const videoSource = videoMedia?.url || prevProject.videoUrl || '';
            mediaUrl = getOptimizedVideoUrl(videoSource);
          }
          
          setFullscreenMedia({
            type: fullscreenMedia?.type || 'image',
            url: mediaUrl
          });
        }
      };

      const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleFullscreen('image');
      };

      const handlePlayVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleFullscreen('video');
      };

      const handleMouseEnter = () => {
        if (videoAvailable && project.videoUrl && videoRef.current) {
          videoRef.current.style.opacity = '1';
          videoRef.current.play().catch(() => {});
        }
        
        // Add a subtle animation to the card for better UX
        if (cardRef.current) {
          cardRef.current.classList.add('card-hover');
          
          // Add special golden glow effect for featured projects
          if (project.featured) {
            cardRef.current.classList.add('featured-hover');
          }
        }
      };
      
      const handleMouseLeave = () => {
        if (videoRef.current && isFullscreen) {
          videoRef.current.pause();
        }
        
        // Remove the hover animation classes
        if (cardRef.current) {
          cardRef.current.classList.remove('card-hover');
          cardRef.current.classList.remove('featured-hover');
        }
      };

      return (
        <div 
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`group relative overflow-hidden rounded-xl transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl 
            ${project.featured ? 'featured-card border border-transparent' : 'border border-gray-200 dark:border-gray-700/50'} 
            bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg h-full w-full flex flex-col ${isImageLoaded ? 'loaded' : 'image-loading'}`}
        >
          {/* Modern gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50/30 to-gray-100/50 dark:via-gray-800/30 dark:to-gray-900/50 opacity-70"></div>
          
          {/* Featured star for featured projects in bottom right corner */}
          {project.featured && (
            <div className="absolute bottom-3 right-3 z-20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="url(#gold-gradient)" className="w-6 h-6 filter drop-shadow-lg animate-pulse-subtle">
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FFDF00" />
                    <stop offset="100%" stopColor="#F0C000" />
                  </linearGradient>
                </defs>
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          {/* Media - Image/Video display with consistent aspect ratio */}
          <div className="aspect-[16/9] w-full overflow-hidden flex-shrink-0 relative">
            {/* Check if we have a video in the media array or a videoUrl */}
            {((project.media && project.media.find(m => m.type === 'video')) || project.videoUrl) && videoAvailable ? (
              <div 
                className="relative w-full h-full cursor-pointer group/media"
                onClick={handlePlayVideo}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110"
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                >
                  {/* Find video source - first try media array, then fall back to videoUrl */}
                  {(() => {
                    const mediaVideo = project.media?.find(m => m.type === 'video');
                    const videoSource = mediaVideo?.url || project.videoUrl || '';
                    const optimizedVideoUrl = getOptimizedVideoUrl(videoSource);
                    
                    return (
                      <>
                        <source src={optimizedVideoUrl} type="video/mp4" />
                        {/* Add a second source format for better compatibility */}
                        <source src={optimizedVideoUrl.replace('.mp4', '.webm')} type="video/webm" />
                      </>
                    );
                  })()}
                </video>
              </div>
            ) : (
              <div 
                className="relative w-full h-full cursor-pointer group/media"
                onClick={handleImageClick}
              >
                {(() => {
                  // First try project.image, then try to find an image in the media array
                  let imageSource = project.image;
                  
                  // If no image source yet, try to get from media array
                  if (!imageSource && project.media && project.media.length > 0) {
                    const firstImage = project.media.find(m => m.type === 'image');
                    if (firstImage) {
                      imageSource = firstImage.url;
                    }
                  }
                  
                  return (
                    <img
                      src={imageError ? "/assets/404 Error.gif" : getOptimizedImageUrl(imageSource)}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      loading="lazy"
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Content area with fixed height for consistent card size */}
          <div className="p-5 relative z-10 flex-grow flex flex-col">
            {/* Project title */}
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-1">
              {project.title}
            </h3>
            
            {/* Tools/technologies tags */}
            {project.tools && project.tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {project.tools.slice(0, 3).map((tool, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-800/50"
                  >
                    {tool}
                  </span>
                ))}
                {project.tools.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-600/50">
                    +{project.tools.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Project description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 text-justify flex-grow">
              {project.description}
            </p>
            
            {/* Action buttons */}
            <div className="flex gap-3 mt-auto justify-center">
              {/* Info button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInfoModalOpen(true);
                  // Initialize with first media item if available
                  const allMedia = getAllMediaItems();
                  if (allMedia.length > 0) {
                    setInfoModalMedia({
                      type: allMedia[0].type,
                      url: allMedia[0].url,
                      index: 0
                    });
                  }
                }}
                className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                  ${darkMode ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-100'}`}
                aria-label="View project details"
              >
                <Info className={`w-6 h-6 ${darkMode ? 'text-indigo-300 hover:text-indigo-100' : 'text-indigo-600 hover:text-indigo-800'}`} />
              </button>
              
              {project.githubLink && (
                <a
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                    ${darkMode ? 'hover:bg-purple-900/30' : 'hover:bg-purple-100'}`}
                  aria-label="View source code on GitHub"
                >
                  <GitHubIcon className={`w-6 h-6 ${darkMode ? 'text-purple-300 hover:text-purple-100' : 'text-purple-600 hover:text-purple-800'}`} />
                </a>
              )}
              {project.demoLink && (
                <a
                  href={project.demoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                    ${darkMode ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'}`}
                  aria-label="View live demo"
                >
                  <ExternalLink className={`w-6 h-6 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-500 hover:text-blue-700'}`} />
                </a>
              )}
            </div>
          </div>

          <FullscreenView
            isOpen={isFullscreen}
            onClose={handleCloseFullscreen}
            mediaType={fullscreenMedia?.type || 'image'}
            url={fullscreenMedia?.url || ''}
            title={project.title}
            onNext={handleNextProject}
            onPrevious={handlePreviousProject}
            hasNext={projects.findIndex(p => p.id === project.id) < projects.length - 1}
            hasPrevious={projects.findIndex(p => p.id === project.id) > 0}
          />

          {/* Info Modal */}
          {isInfoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                  </div>
                  <button
                    onClick={handleCloseInfoModal}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all duration-200 group"
                  >
                    <X className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row max-h-[calc(95vh-100px)]">
                  {/* Media Section */}
                  <div className="lg:w-1/2 p-6 bg-gray-50 dark:bg-gray-800/50">
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden aspect-video mb-6 shadow-lg">
                      {infoModalMedia ? (
                        <>
                          {infoModalMedia.type === 'image' ? (
                            <img
                              src={getOptimizedImageUrl(infoModalMedia.url)}
                              alt={`${project.title} media`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                              onClick={handleInfoMediaZoom}
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                ref={infoVideoRef}
                                src={getOptimizedVideoUrl(infoModalMedia.url)}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted={false}
                                playsInline
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mb-3 mx-auto">
                              <Info className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-sm">No media available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Media Navigation */}
                    {(() => {
                      const allMedia = getAllMediaItems();
                      return allMedia.length > 1 && (
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                          <button
                            onClick={handleInfoModalPrevious}
                            disabled={!infoModalMedia || infoModalMedia.index === 0}
                            className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          
                          <div className="text-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {infoModalMedia ? infoModalMedia.index + 1 : 1} of {allMedia.length}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {infoModalMedia?.type === 'video' ? 'Video' : 'Image'}
                            </p>
                          </div>
                          
                          <button
                            onClick={handleInfoModalNext}
                            disabled={!infoModalMedia || infoModalMedia.index === allMedia.length - 1}
                            className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Details Section */}
                  <div className="lg:w-1/2 p-6 overflow-y-auto bg-white dark:bg-gray-900">
                    <div className="space-y-6">
                      {/* Category */}
                      {project.category && (
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                            Category
                          </h4>
                          <span className="inline-block px-4 py-2 bg-blue-500 text-white text-sm rounded-full font-medium shadow-sm">
                            {project.category}
                          </span>
                        </div>
                      )}

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                            Technologies
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, idx) => (
                              <span 
                                key={idx}
                                className="inline-block px-3 py-1 bg-green-500 text-white text-sm rounded-full font-medium shadow-sm hover:bg-green-600 transition-colors"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Development Tools */}
                      {project.tools && project.tools.length > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                            Development Tools
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {project.tools.map((tool, idx) => (
                              <span 
                                key={idx}
                                className="inline-block px-3 py-1 bg-purple-500 text-white text-sm rounded-full font-medium shadow-sm hover:bg-purple-600 transition-colors"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    if (loading) {
        return (
            <section 
                ref={sectionRef}
                id="projects" 
                className={`py-24 ${darkMode 
                    ? 'bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden' 
                    : 'bg-gradient-to-b from-gray-50 to-white relative overflow-hidden'}`}
            >
                {/* Background decoration - abstract shapes */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
                    
                    {/* Grid pattern background */}
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className={`text-center mb-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
                            Projects
                        </h2>
                        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto mb-8"></div>
                        <p className="text-lg max-w-3xl mx-auto dark:text-gray-300 mb-8">
                            Explore my latest projects and technical achievements.
                        </p>
                    </div>
                    <div className="flex justify-center items-center min-h-[300px]">
                        <div className="text-gray-500 dark:text-gray-400 text-center">
                            <div className="mb-4">
                                <img 
                                    src="/assets/404 Error.gif" 
                                    alt="Loading projects" 
                                    className="h-48 mx-auto"
                                />
                            </div>
                            <p className="text-xl font-semibold mt-4">Loading Projects</p>
                            <p className="text-sm mt-2">Please wait while we fetch the latest projects...</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
      <section 
        ref={sectionRef}
        id="projects" 
        className={`py-20 relative overflow-hidden isolate z-0 ${darkMode 
            ? 'bg-gradient-to-b from-gray-900 via-gray-850 to-gray-800' 
            : 'bg-gradient-to-b from-gray-50 via-gray-100 to-white'}`}
      >
        {/* Enhanced background with subtle patterns */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`mb-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex flex-col items-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">
                Projects
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mb-8"></div>
              <p className="text-lg max-w-3xl mx-auto text-center text-gray-700 dark:text-gray-300 mb-8">
                Explore my latest work and technical achievements that showcase my skills and experience.
              </p>
            </div>
          </div>

          {projects.length > 0 ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 transition-all duration-1000 mx-auto ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {projects.map((project, index) => (
                <div 
                  key={`project-${project.id || index}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up"
                >
                  <div className="h-full min-h-[450px]">
                    <ProjectCard project={project} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="text-gray-500 dark:text-gray-400 text-center">
                <div className="mb-4">
                  <img 
                    src="/assets/404 Error.gif" 
                    alt="No projects found" 
                    className="h-48 mx-auto"
                  />
                </div>
                <p className="text-xl font-semibold mt-4">No Projects Found</p>
                <p className="text-sm mt-2">Check back later for new content</p>
              </div>
            </div>
          )}
        </div>        
        {/* Projects component styles */}
        <style>{`
            /* Scoped CSS for Projects component */
            #projects .text-gradient {
              background-clip: text;
              -webkit-background-clip: text;
              color: transparent;
              background-image: linear-gradient(to right, #3b82f6, #8b5cf6);
            }
            
            #projects .bg-grid-pattern {
              background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
              background-size: 20px 20px;
            }
            
            @keyframes fade-in-up {
              0% {
                opacity: 0;
                transform: translateY(20px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            #projects .animate-fade-in-up {
              animation: fade-in-up 0.6s ease-out forwards;
              opacity: 0;
            }
            
            /* Equal height project cards */
            @media (min-width: 768px) {
              #projects .grid {
                display: grid;
                grid-auto-rows: 1fr;
              }
              
              /* All project cards have equal height and width */
              #projects .grid > div {
                height: 100%;
                display: flex;
                width: 100%;
              }
              
              /* Modern card effect */
              #projects .grid > div > div {
                transition: all 0.4s ease;
                display: flex;
                flex-direction: column;
                width: 100%;
              }

              /* Make all cards the same size */
              #projects .min-h-[450px] {
                min-height: 450px;
                max-width: 100%;
                width: 100%;
              }
            }
            
            /* Card hover effects */
            #projects .group:hover {
              box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1),
                          0 5px 15px -5px rgba(0, 0, 0, 0.05);
            }
            
            /* Ensure consistent image heights */
            #projects .aspect-\[16\/9\] {
              aspect-ratio: 16/9;
            }
            
            /* Fixed card heights for consistency */
            @media (min-width: 768px) {
              #projects .min-h-\[450px\] {
                min-height: 450px;
              }
            }
            
            /* Special hover effect class */
            #projects .card-hover {
              transform: translateY(-8px) !important;
              box-shadow: 0 22px 40px -10px rgba(0, 0, 0, 0.15),
                          0 10px 20px -10px rgba(0, 0, 0, 0.1) !important;
              transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            }
            
            /* Featured project golden border effect */
            #projects .featured-card {
              position: relative;
              z-index: 0;
            }
            
            #projects .featured-card::before {
              content: '';
              position: absolute;
              z-index: -1;
              inset: 0;
              padding: 1px;
              border-radius: 0.75rem;
              background: linear-gradient(220deg, 
                #FFD700, #F0C000, 
                #FFDF00, #DAA520, 
                #FFF8DC, #FFD700);
              background-size: 200% 200%;
              -webkit-mask: 
                 linear-gradient(#fff 0 0) content-box, 
                 linear-gradient(#fff 0 0);
              mask: 
                 linear-gradient(#fff 0 0) content-box, 
                 linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              animation: border-shimmer 4s ease infinite;
              box-shadow: 0 0 10px -2px rgba(255, 215, 0, 0.5);
            }
            
            @keyframes border-shimmer {
              0% { background-position: 0% 50% }
              50% { background-position: 100% 50% }
              100% { background-position: 0% 50% }
            }
            
            /* Subtle star pulse animation */
            @keyframes pulse-subtle {
              0% { opacity: 0.8; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.1); }
              100% { opacity: 0.8; transform: scale(1); }
            }
            
            #projects .animate-pulse-subtle {
              animation: pulse-subtle 3s infinite ease-in-out;
            }
            
            /* Special hover effect for featured cards */
            #projects .featured-hover {
              box-shadow: 0 10px 25px -5px rgba(255, 215, 0, 0.2),
                          0 5px 15px -5px rgba(255, 215, 0, 0.1) !important;
            }
            
            #projects .featured-hover::before {
              background-size: 100% 100%;
              box-shadow: 0 0 15px -2px rgba(255, 215, 0, 0.7);
              animation: border-shimmer 2s ease infinite;
            }
            
            /* Responsive container adjustments */
            @media (min-width: 2000px) {
              #projects .grid {
                grid-template-columns: repeat(4, 1fr);
                max-width: 1920px;
                margin-left: auto;
                margin-right: auto;
              }
            }
            
            /* Info Modal Animations */
            #projects .fixed.inset-0 {
              animation: modal-backdrop-fade-in 0.3s ease-out;
            }
            
            #projects .fixed.inset-0 > div {
              animation: modal-slide-up 0.3s ease-out;
            }
            
            @keyframes modal-backdrop-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes modal-slide-up {
              from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to { 
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            
            /* Media thumbnail hover effects */
            #projects .grid.grid-cols-4 > div {
              transition: all 0.2s ease;
            }
            
            #projects .grid.grid-cols-4 > div:hover {
              transform: scale(1.05);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            /* Video play button hover */
            #projects .absolute.inset-0.flex.items-center.justify-center button:hover {
              transform: scale(1.1);
            }
        `}</style>
      </section>
    );
};

export default Projects;
