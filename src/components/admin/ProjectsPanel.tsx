import React, { useState, useEffect } from 'react';
import { ExternalLink, Eye, EyeOff, Trash2, PlusCircle, MoveUp, MoveDown, Maximize, Edit, Info, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { 
  getProjects,
  deleteProject, 
  toggleProjectVisibility, 
  updateProjectsOrder,
  Project 
} from '../../services/projectService';
import { getOptimizedImageUrl, getOptimizedVideoUrl } from '../../config/cloudinary';
import FullscreenView from '../common/FullscreenView';
import ProjectForm from './ProjectForm';

// Project card component
interface ProjectCardProps {
  project: Project;
  index: number;
  totalProjects: number;
  handleToggleVisibility: (projectId: string) => void;
  handleDeleteProject: (id: string) => void;
  handleEditProject: (project: Project) => void;
  moveProjectUp: (index: number) => void;
  moveProjectDown: (index: number) => void;
  openFullscreen: (mediaType: 'image' | 'video', url: string, title: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  index,
  totalProjects,
  handleToggleVisibility,
  handleDeleteProject,
  handleEditProject,
  moveProjectUp,
  moveProjectDown,
  openFullscreen
}) => {
  // Info modal states
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalMedia, setInfoModalMedia] = useState<{type: 'image' | 'video', url: string, index: number} | null>(null);
  const infoVideoRef = React.useRef<HTMLVideoElement>(null);

  // Determine if a URL is from YouTube
  const isYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Get media URL for display
  const getVideoUrl = (): string | undefined => {
    // First check if there's a video in the media array
    if (project.media && project.media.length > 0) {
      const videoMedia = project.media.find(m => m.type === 'video');
      if (videoMedia) {
        // Check if we have the URL or public_id
        if (videoMedia.url) return videoMedia.url;
        if (videoMedia.public_id) return videoMedia.public_id;
      }
    }
    
    // Then check for legacy videoUrl field for backward compatibility
    if (project.videoUrl) return project.videoUrl;
    
    return undefined;
  };

  const videoUrl = getVideoUrl();
  // Log for debugging
  if (videoUrl && !isYouTubeUrl(videoUrl)) {
    console.log('Video URL being used:', videoUrl);
  }

  // Helper functions for info modal
  const getAllMediaItems = () => {
    const items: Array<{type: 'image' | 'video', url: string}> = [];
    
    // Add main image
    if (project.mainImage) {
      items.push({ type: 'image', url: project.mainImage });
    }
    
    // Add media array items
    if (project.media && project.media.length > 0) {
      project.media.forEach(media => {
        if (media.url && media.url !== project.mainImage) { // Avoid duplicates
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

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoModalMedia(null);
    if (infoVideoRef.current) {
      infoVideoRef.current.pause();
    }
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
      openFullscreen(infoModalMedia.type, infoModalMedia.url, `${project.title} - Media ${infoModalMedia.index + 1}`);
      handleCloseInfoModal();
    }
  };
  
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${
        project.visible ? '' : 'border-2 border-dashed border-red-400 dark:border-red-600'
      } ${project.featured ? 'ring-2 ring-yellow-400 shadow-yellow-400/20 shadow-2xl border border-yellow-300 bg-gradient-to-br from-white to-yellow-50/30 dark:from-gray-800 dark:to-yellow-900/10' : ''}`}
    >
      <div className="relative">
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          {index > 0 && (
            <button 
              onClick={() => moveProjectUp(index)}
              className="w-7 h-7 flex items-center justify-center bg-black bg-opacity-30 rounded text-white hover:bg-opacity-50"
              title="Move up"
            >
              <MoveUp className="w-4 h-4" />
            </button>
          )}
          {index < totalProjects - 1 && (
            <button 
              onClick={() => moveProjectDown(index)}
              className="w-7 h-7 flex items-center justify-center bg-black bg-opacity-30 rounded text-white hover:bg-opacity-50"
              title="Move down"
            >
              <MoveDown className="w-4 h-4" />
            </button>
          )}
        </div>
        {project.mainImage && !videoUrl && (
          <div className="relative w-full">
            <img 
              src={getOptimizedImageUrl(project.mainImage)} 
              alt={project.title} 
              className="w-full h-56 object-contain cursor-pointer"
              onClick={() => openFullscreen('image', project.mainImage, project.title)}
              onError={(e) => {
                // Fallback image if the optimized URL fails
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                target.src = "/assets/404 Error.gif";
              }}
            />
            <button 
              onClick={() => openFullscreen('image', project.mainImage, project.title)}
              className="absolute bottom-2 right-2 bg-black bg-opacity-60 p-1 rounded text-white hover:bg-opacity-80 transition-all"
              title="View fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        )}
        {videoUrl && (
          <div className="h-56 overflow-hidden relative">
            {isYouTubeUrl(videoUrl) ? (
              <>
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeVideoId(videoUrl)}&controls=0&showinfo=0&rel=0`}
                  className="w-full h-56 object-cover"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                <button 
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${getYouTubeVideoId(videoUrl)}`, '_blank')}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-60 p-1 rounded text-white hover:bg-opacity-80 transition-all"
                  title="View on YouTube"
                >
                  <Maximize size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="cursor-pointer" onClick={() => openFullscreen('video', videoUrl, project.title)}>
                  <video
                    className="w-full h-56 object-contain"
                    muted
                    autoPlay
                    loop
                    playsInline
                    onError={(e) => {
                      // Fallback for video error
                      const target = e.target as HTMLVideoElement;
                      target.onerror = null;
                      console.error("Video failed to load:", videoUrl);
                      
                      // Try to replace with an image if video fails
                      if (project.mainImage) {
                        const parent = target.parentElement;
                        if (parent) {
                          const img = document.createElement('img');
                          img.src = getOptimizedImageUrl(project.mainImage);
                          img.alt = project.title || 'Project image';
                          img.className = "w-full h-44 object-cover";
                          parent.innerHTML = '';
                          parent.appendChild(img);
                        }
                      }
                    }}
                  >
                    <source src={getOptimizedVideoUrl(videoUrl)} type="video/mp4" />
                    <source src={getOptimizedVideoUrl(videoUrl).replace('.mp4', '.webm')} type="video/webm" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <button 
                  onClick={() => openFullscreen('video', videoUrl, project.title)}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-60 p-1 rounded text-white hover:bg-opacity-80 transition-all"
                  title="View fullscreen"
                >
                  <Maximize size={16} />
                </button>
              </>
            )}
          </div>
        )}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            onClick={() => handleToggleVisibility(project.id)}
            className={`p-1.5 rounded-full ${project.visible ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
            aria-label={project.visible ? "Hide project" : "Show project"}
            title={project.visible ? "Hide project from visitors" : "Show project to visitors"}
          >
            {project.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <div className={`p-4 ${project.featured ? 'bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-900/10 dark:to-amber-900/10 border-t-2 border-yellow-400' : ''} ${!project.visible ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg truncate">{project.title}</h3>
            {project.featured && (
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg font-medium">
                ⭐ Featured
              </span>
            )}
            {!project.visible && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Hidden</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditProject(project)}
              className="text-blue-500 hover:text-blue-600 p-1"
              aria-label="Edit project"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDeleteProject(project.id)}
              className="text-red-500 hover:text-red-600 p-1"
              aria-label="Delete project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm text-justify mb-2">
          {project.description}
        </p>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
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
              className="transform hover:scale-125 transition-all duration-300 p-3 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
              aria-label="View project details"
              title="View project details"
            >
              <Info className="w-6 h-6 text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100" />
            </button>
            
            {project.githubLink && (
              <a 
                href={project.githubLink} 
                target="_blank" 
                rel="noreferrer"
                className="transform hover:scale-125 transition-all duration-300 p-3 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
                title="View source code on GitHub"
                aria-label="View source code on GitHub"
              >
                <GitHubIcon className="w-6 h-6 text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100" />
              </a>
            )}
            {project.demoLink && (
              <a 
                href={project.demoLink} 
                target="_blank" 
                rel="noreferrer" 
                className="transform hover:scale-125 transition-all duration-300 p-3 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                title="View live demo"
                aria-label="View live demo"
              >
                <ExternalLink className="w-6 h-6 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100" />
              </a>
            )}
          </div>
        </div>
      </div>

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
                          <button
                            onClick={handleInfoMediaZoom}
                            className="absolute bottom-2 right-2 bg-black bg-opacity-60 p-2 rounded text-white hover:bg-opacity-80 transition-all"
                            title="View fullscreen"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
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

                  {/* Project Dates */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                      Project Timeline
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span className="font-medium">Added:</span>
                        <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '7/1/2025'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Updated:</span>
                        <span>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '7/1/2025'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// GitHub icon component
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor">
    <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
  </svg>
);

// Main ProjectsPanel Component
const ProjectsPanel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', message: string, details?: string} | null>(null);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  
  // Fullscreen media states
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<{type: 'image' | 'video', url: string, title: string} | null>(null);
  
  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);
  
  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectsList = await getProjects();
      
      // Process each project to ensure media is working correctly
      projectsList.forEach(project => {
        // Make sure media array exists
        if (!project.media) {
          project.media = [];
        }
        
        // Handle missing mainImage - try to use the first media item if available
        if (!project.mainImage && project.media && project.media.length > 0) {
          // Find first image in media to use as mainImage
          const firstImage = project.media.find(m => m.type === 'image' && m.url);
          if (firstImage) {
            project.mainImage = firstImage.url;
          }
        }
      });
      
      // Sort by order only (matches the main Projects component sorting)
      // This ensures admin panel shows projects in the same order as visitors see them
      projectsList.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });
      
      setProjects(projectsList);
      setStatusMessage(null);
    } catch (error) {
      console.error('Error loading projects:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to load projects. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle project visibility
  const handleToggleVisibility = async (projectId: string) => {
    try {
      const newVisibility = await toggleProjectVisibility(projectId);
      
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, visible: newVisibility } 
            : project
        )
      );
      
      setStatusMessage({
        type: 'success',
        message: `Project ${newVisibility ? 'visible' : 'hidden'} successfully`
      });
      
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error toggling project visibility:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to update project visibility'
      });
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteProject(projectId);
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      setStatusMessage({
        type: 'success',
        message: 'Project deleted successfully'
      });
      
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting project:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to delete project'
      });
    }
  };

  // Edit project
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowEditForm(true);
  };
  
  // Handle project update success
  const handleProjectUpdated = (_projectId: string) => {
    setShowEditForm(false);
    setSelectedProject(null);
    setStatusMessage({
      type: 'success',
      message: 'Project updated successfully'
    });
    loadProjects();
    
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };
  
  // Open fullscreen image/video view
  const openFullscreen = (mediaType: 'image' | 'video', url: string, title: string) => {
    setFullscreenMedia({
      type: mediaType,
      url: mediaType === 'image' ? getOptimizedImageUrl(url) : getOptimizedVideoUrl(url),
      title
    });
    setIsFullscreenOpen(true);
  };
  
  // Close fullscreen view
  const closeFullscreen = () => {
    setIsFullscreenOpen(false);
    setFullscreenMedia(null);
  };

  // Move project up in order
  const moveProjectUp = async (index: number) => {
    if (index <= 0) return;
    
    const newProjects = [...projects];
    const projectToMove = newProjects[index];
    const projectAbove = newProjects[index - 1];
    
    // Swap order values
    const tempOrder = projectToMove.order || index;
    projectToMove.order = projectAbove.order || (index - 1);
    projectAbove.order = tempOrder;
    
    // Swap positions in array
    newProjects[index] = projectAbove;
    newProjects[index - 1] = projectToMove;
    
    setProjects(newProjects);
    
    try {
      // Update order in database
      await updateProjectsOrder([
        { id: projectToMove.id, order: projectToMove.order },
        { id: projectAbove.id, order: projectAbove.order }
      ]);
    } catch (error) {
      console.error('Error updating project order:', error);
      // Reload projects to restore order
      loadProjects();
    }
  };

  // Move project down in order
  const moveProjectDown = async (index: number) => {
    if (index >= projects.length - 1) return;
    
    const newProjects = [...projects];
    const projectToMove = newProjects[index];
    const projectBelow = newProjects[index + 1];
    
    // Swap order values
    const tempOrder = projectToMove.order || index;
    projectToMove.order = projectBelow.order || (index + 1);
    projectBelow.order = tempOrder;
    
    // Swap positions in array
    newProjects[index] = projectBelow;
    newProjects[index + 1] = projectToMove;
    
    setProjects(newProjects);
    
    try {
      // Update order in database
      await updateProjectsOrder([
        { id: projectToMove.id, order: projectToMove.order },
        { id: projectBelow.id, order: projectBelow.order }
      ]);
    } catch (error) {
      console.error('Error updating project order:', error);
      // Reload projects to restore order
      loadProjects();
    }
  };

  const handleProjectCreated = (_projectId: string) => {
    setShowAddForm(false);
    setStatusMessage({
      type: 'success',
      message: 'Project created successfully'
    });
    loadProjects();
    
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  if (showAddForm) {
    return (
      <ProjectForm 
        onSuccess={handleProjectCreated} 
        onCancel={() => setShowAddForm(false)} 
      />
    );
  }
  
  if (showEditForm && selectedProject) {
    return (
      <ProjectForm 
        onSuccess={handleProjectUpdated}
        onCancel={() => {
          setShowEditForm(false);
          setSelectedProject(null);
        }}
        existingProject={selectedProject}
      />
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Fullscreen media view */}
      {isFullscreenOpen && fullscreenMedia && (
        <FullscreenView
          isOpen={isFullscreenOpen}
          onClose={closeFullscreen}
          mediaType={fullscreenMedia.type}
          url={fullscreenMedia.url}
          title={fullscreenMedia.title}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Project Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {projects.length} projects ({projects.filter(p => p.visible).length} visible, {projects.filter(p => p.featured).length} featured)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHiddenOnly(!showHiddenOnly)}
            className={`flex items-center gap-1 ${
              showHiddenOnly 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            } text-white px-4 py-2 rounded-lg transition-colors`}
            aria-label={showHiddenOnly ? "Show all projects" : "Show hidden projects only"}
          >
            <EyeOff size={16} className={showHiddenOnly ? "text-white" : "text-gray-700 dark:text-gray-300"} />
            <span className={showHiddenOnly ? "text-white" : "text-gray-700 dark:text-gray-300"}>
              {showHiddenOnly ? "Show All" : "Show Hidden"}
            </span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusCircle size={18} />
            <span>Add Project</span>
          </button>
        </div>
      </div>
      
      {/* Project Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">Total Projects</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{projects.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">Visible Projects</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{projects.filter(p => p.visible).length}</div>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">Featured Projects</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{projects.filter(p => p.featured).length}</div>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">Hidden Projects</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {projects.filter(p => !p.visible).length}
          </div>
        </div>
      </div>
      
      {statusMessage && (
        <div 
          className={`p-3 mb-4 rounded ${
            statusMessage.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800' 
              : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800'
          }`}
        >
          <div className="font-medium">{statusMessage.message}</div>
          {statusMessage.details && (
            <div className="mt-1 text-sm opacity-80">{statusMessage.details}</div>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-gray-500 dark:text-gray-400">Loading projects...</span>
        </div>
      ) : (
        <>
          {projects.length === 0 || (showHiddenOnly && projects.filter(p => !p.visible).length === 0) ? (
            <div className="text-center py-12">
              {projects.length === 0 ? (
                <>
                  <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">No projects found.</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Your First Project
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                    No hidden projects found. All projects are currently visible.
                  </p>
                  <button
                    onClick={() => setShowHiddenOnly(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Show All Projects
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects
                .filter(project => showHiddenOnly ? !project.visible : true)
                .map((project) => {
                  // Find the actual index in the full projects array (for correct ordering)
                  const actualIndex = projects.findIndex(p => p.id === project.id);
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={actualIndex}
                      totalProjects={projects.length}
                      handleToggleVisibility={handleToggleVisibility}
                      handleDeleteProject={handleDeleteProject}
                      handleEditProject={handleEditProject}
                      moveProjectUp={moveProjectUp}
                      moveProjectDown={moveProjectDown}
                      openFullscreen={openFullscreen}
                    />
                  );
                })}
            </div>
          )}
        </>
      )}
      
      {/* Fullscreen media viewer */}
      {isFullscreenOpen && fullscreenMedia && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800 bg-opacity-70 text-white hover:bg-opacity-100"
              aria-label="Close fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div className="text-white text-lg font-medium mb-2 text-center">{fullscreenMedia.title}</div>
            
            {fullscreenMedia.type === 'image' ? (
              <img 
                src={fullscreenMedia.url} 
                alt={fullscreenMedia.title} 
                className="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-lg"
                onError={(e) => {
                  // Fallback image if the optimized URL fails
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite loop
                  target.src = "/assets/404 Error.gif";
                }}
              />
            ) : (
              <video
                className="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-lg"
                controls
                autoPlay
                onError={(e) => {
                  // Fallback for video error
                  const target = e.target as HTMLVideoElement;
                  target.onerror = null;
                  console.error("Video failed to load:", fullscreenMedia.url);
                }}
              >
                <source src={fullscreenMedia.url} type="video/mp4" />
                <source src={fullscreenMedia.url.replace('.mp4', '.webm')} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPanel;
