import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { cloudinaryService } from '../../services/cloudinaryService';
import { Plus, Trash, Edit, ExternalLink, Github, Eye, EyeOff, X, Video as VideoIcon, Code, Shield, Lock, Database as DBIcon, ArrowLeft } from 'lucide-react';

// Base64 encoded small placeholder image as ultimate fallback
const fallbackImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  videoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  views: number;
  featured: boolean;
  tools: string[];
  technologies?: string[];
  githubLink?: string;
  demoLink?: string;
  visible: boolean;
}

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  image: string | File;
  videoUrl?: string | File;
  featured: boolean;
  tools: string[];
  technologies?: string[];
  githubLink?: string;
  demoLink?: string;
  visible: boolean;
}

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: '',
    image: '',
    videoUrl: '',
    featured: false,
    tools: [],
    technologies: [],
    githubLink: '',
    demoLink: '',
    visible: true
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [fullscreenProject, setFullscreenProject] = useState<Project | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // const data = await supabaseService.getProjects();
        // setProjects(data);
        setProjects([]);
      } catch (err) {
        setError('Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    // const reorderedItem = projects[result.source.index];
    // const newOrder = result.destination.index;
    // await supabaseService.updateProjectOrder(reorderedItem.id, newOrder);
    const updated = Array.from(projects);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setProjects(updated);
  };

  const handleToggleVisibility = async (project: Project) => {
    try {
      // await supabaseService.updateProject(project.id, {
      //   ...project,
      //   visible: !project.visible
      // });
      // await loadProjects();
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, visible: !p.visible } : p));
    } catch (err) {
      setError('Failed to update project visibility');
    }
  };

  const handleAddClick = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      image: '',
      videoUrl: '',
      featured: false,
      tools: [],
      technologies: [],
      githubLink: '',
      demoLink: '',
      visible: true
    });
    setShowForm(true);
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      category: project.category,
      image: project.image,
      videoUrl: project.videoUrl,
      featured: project.featured,
      tools: project.tools,
      technologies: project.technologies,
      githubLink: project.githubLink,
      demoLink: project.demoLink,
      visible: project.visible
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        // await supabaseService.deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        setError('Failed to delete project');
      }
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'video') => {
    try {
      const result = await cloudinaryService.uploadMedia(file);
      return result.secure_url;
    } catch (err) {
      setError(`Failed to upload ${type}`);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = typeof formData.image === 'string' ? formData.image : '';
      let videoUrl = typeof formData.videoUrl === 'string' ? formData.videoUrl : '';

      // Handle image upload if it's a File object
      if (formData.image instanceof File) {
        imageUrl = await handleMediaUpload(formData.image, 'image');
      }

      // Handle video upload if it's a File object
      if (formData.videoUrl instanceof File) {
        videoUrl = await handleMediaUpload(formData.videoUrl, 'video');
      }

      const projectData: Partial<Project> = {
        ...formData,
        image: imageUrl,
        videoUrl: videoUrl,
      };

      if (editingProject) {
        // await supabaseService.updateProject(editingProject.id, projectData);
        console.log('Update project:', projectData);
      } else {
        // await supabaseService.addProject(projectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
        console.log('Add project:', projectData);
      }
      setShowForm(false);
      // await loadProjects();
      setEditingProject(null);
      setProjects(prev => [...prev]);
    } catch (err) {
      setError('Failed to save project');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, videoUrl: file }));
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Image failed to load, using fallback');
    e.currentTarget.src = '/assets/images/defaults/project-default.jpg';
    e.currentTarget.onerror = () => {
      console.log('Default image failed to load, using base64 fallback');
      e.currentTarget.src = fallbackImageBase64;
      e.currentTarget.onerror = null;
    };
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video failed to load:', e);
    setIsVideoPlaying(false);
    alert('Failed to load video. Please try again later.');
  };

  const getCategoryIcon = (category?: string) => {
    if (!category) return <Code className="h-4 w-4" />;
    
    switch (category.toLowerCase()) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'encryption':
        return <Lock className="h-4 w-4" />;
      case 'authentication':
        return <DBIcon className="h-4 w-4" />;
      case 'monitoring':
        return <Code className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold dark:text-white">Project Management</h2>
        <button
          onClick={handleAddClick}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Project
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Video
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GitHub Link (optional)
                </label>
                <input
                  type="url"
                  value={formData.githubLink}
                  onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Demo Link (optional)
                </label>
                <input
                  type="url"
                  value={formData.demoLink}
                  onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Featured Project
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.visible}
                  onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Visible
                </label>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {editingProject ? 'Save Changes' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="projects">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {projects.map((project, index) => (
                <Draggable
                  key={project.id}
                  draggableId={project.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="group relative rounded-xl border-2 border-transparent overflow-visible transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer bg-white dark:bg-gray-800 hover:border-blue-500/20"
                    >
                      <div className="relative overflow-hidden aspect-video rounded-xl">
                        {project.videoUrl ? (
                          <video
                            src={project.videoUrl}
                            className="w-full h-full object-cover rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-105"
                            muted
                            autoPlay
                            loop
                            playsInline
                            onClick={() => {
                              setFullscreenProject(project);
                              setIsFullscreen(true);
                            }}
                          />
                        ) : (
                          <img
                            src={project.image}
                            alt={project.title}
                            onError={handleImageError}
                            className="w-full h-full object-cover rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-105"
                            onClick={() => {
                              setFullscreenProject(project);
                              setIsFullscreen(true);
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-6 rounded-xl">
                           <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                             {project.featured && (
                               <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-teal-400 text-white text-xs uppercase tracking-wider rounded-full inline-flex items-center mb-2">
                                 {getCategoryIcon(project.category)}
                                 <span className="ml-1">Featured</span>
                               </div>
                             )}
                            <h3 className="text-white text-2xl font-bold">{project.title}</h3>
                            <p className="text-gray-200 mt-2 line-clamp-2">{project.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-3">
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {project.technologies.map((tech, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            {project.githubLink && (
                              <a
                                href={project.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transform hover:scale-125 transition-all duration-300 p-3 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="View source code on GitHub"
                              >
                                <Github className="w-6 h-6 text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100" />
                              </a>
                            )}

                            {project.demoLink && (
                              <a
                                href={project.demoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transform hover:scale-125 transition-all duration-300 p-3 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="View live demo"
                              >
                                <ExternalLink className="w-6 h-6 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100" />
                              </a>
                            )}
                          </div>

                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleVisibility(project);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title={project.visible ? 'Hide project' : 'Unhide project'}
                            >
                              {project.visible ? (
                                <Eye className="h-5 w-5" />
                              ) : (
                                <EyeOff className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(project);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project.id);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Fullscreen Modal */}
      {isFullscreen && fullscreenProject && (
        <div 
          className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }} 
            className="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 p-3 rounded-full transition-colors shadow-lg"
            aria-label="Close fullscreen view"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }} 
            className="absolute top-4 left-4 z-50 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div 
            className="w-full h-full p-2 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenProject.videoUrl && isVideoPlaying ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={fullscreenProject.videoUrl}
                  className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain mx-auto pointer-events-auto"
                  controls
                  playsInline
                  onError={handleVideoError}
                  onEnded={() => setIsVideoPlaying(false)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                <img 
                  src={fullscreenProject.image} 
                  alt={fullscreenProject.title} 
                  className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain mx-auto"
                  onClick={(e) => e.stopPropagation()}
                  onError={handleImageError}
                />
                {fullscreenProject.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVideoPlaying(true);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto shadow-lg transition-transform transform hover:scale-105 pointer-events-auto"
                    >
                      <VideoIcon className="w-6 h-6" /> Play Video
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;