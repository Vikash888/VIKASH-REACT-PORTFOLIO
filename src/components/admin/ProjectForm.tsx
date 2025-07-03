import React, { useState, useRef, useEffect } from 'react';
import { createProject, updateProject, ProjectUploadData, Project } from '../../services/projectService';
import { X, Upload, Check, Edit } from 'lucide-react';
import { getOptimizedImageUrl } from '../../config/cloudinary';
import { validateMediaFile } from '../../utils/projectUtils';
// Admin permission checks removed - anyone in the admin panel can create projects

interface ProjectFormProps {
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
  existingProject?: Project; // Add this to support editing
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSuccess, onCancel, existingProject }) => {
  // ALL HOOKS MUST BE DECLARED FIRST - BEFORE ANY CONDITIONAL LOGIC
  // const { user } = useAuth(); // Commented out as not used - permission check removed
  // Permission check removed - anyone in admin panel can create projects

  const [formData, setFormData] = useState<ProjectUploadData>({
    title: existingProject?.title || '',
    description: existingProject?.description || '',
    category: existingProject?.category || '',
    technologies: existingProject?.technologies || [],
    tools: existingProject?.tools || [],
    githubLink: existingProject?.githubLink || '',
    demoLink: existingProject?.demoLink || '',
    featured: existingProject?.featured || false,
    visible: existingProject?.visible !== undefined ? existingProject.visible : true,
    createdAt: existingProject?.createdAt || new Date().toISOString(),
  });
  
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(existingProject?.mainImage || null);
  const [mediaPreviewList, setMediaPreviewList] = useState<Array<{ file: File, preview: string, type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [techInput, setTechInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize existing project media for edit mode
  useEffect(() => {
    if (existingProject?.media && existingProject.media.length > 0) {
      // Create previews for existing media items
      const existingMediaPreviews = existingProject.media.map(media => ({
        existingMedia: true,
        public_id: media.public_id,
        preview: getOptimizedImageUrl(media.url),
        type: media.type,
        url: media.url
      }));
      
      // @ts-ignore - we're adding custom properties for existing media
      setMediaPreviewList(existingMediaPreviews);
    }
  }, [existingProject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && techInput) {
      e.preventDefault();
      handleAddTech();
    }
  };

  const handleAddTech = () => {
    if (techInput && !formData.technologies.includes(techInput)) {
      setFormData(prev => ({
        ...prev,
        technologies: [...prev.technologies, techInput]
      }));
      setTechInput('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech)
    }));
  };

  const handleToolKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && toolInput) {
      e.preventDefault();
      handleAddTool();
    }
  };

  const handleAddTool = () => {
    if (toolInput && !formData.tools.includes(toolInput)) {
      setFormData(prev => ({
        ...prev,
        tools: [...prev.tools, toolInput]
      }));
      setToolInput('');
    }
  };

  const handleRemoveTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter(t => t !== tool)
    }));
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setError(`Main image validation failed: ${validation.error}`);
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Main image must be an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMainImagePreview(reader.result as string);
      setFormData(prev => ({ ...prev, mainImageFile: file }));
      setError(null); // Clear any previous errors
    };
    reader.readAsDataURL(file);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newMediaFiles: File[] = [];
    const validationErrors: string[] = [];
    
    // Validate each file
    Array.from(files).forEach((file, index) => {
      const validation = validateMediaFile(file);
      if (validation.valid) {
        newMediaFiles.push(file);
      } else {
        validationErrors.push(`File ${index + 1}: ${validation.error}`);
      }
    });
    
    // Show validation errors if any
    if (validationErrors.length > 0) {
      setError(`Media validation failed:\n${validationErrors.join('\n')}`);
      return;
    }
    
    const mediaFiles = formData.mediaFiles ? [...formData.mediaFiles, ...newMediaFiles] : newMediaFiles;
    
    // Generate previews
    const newPreviewPromises = newMediaFiles.map((file) => {
      return new Promise<{ file: File, preview: string, type: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            file,
            preview: reader.result as string,
            type: file.type.startsWith('video/') ? 'video' : 'image'
          });
        };
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(newPreviewPromises).then(newPreviews => {
      setMediaPreviewList(prev => [...prev, ...newPreviews]);
      setFormData(prev => ({ ...prev, mediaFiles }));
      setError(null); // Clear any previous errors
    });
  };

  const handleRemoveMediaPreview = (index: number) => {
    setMediaPreviewList(prev => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    setFormData(prev => {
      if (!prev.mediaFiles) return prev;
      const newMediaFiles = [...prev.mediaFiles];
      newMediaFiles.splice(index, 1);
      return { ...prev, mediaFiles: newMediaFiles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form fields first before setting loading state
    if (!formData.title || !formData.description || !formData.category) {
      setError('Please fill all required fields: title, description, and category');
      return;
    }
    
    // Main image is now optional for both new and existing projects
    // Remove the validation requirement
    
    setLoading(true);
    
    try {
      // Determine if we're creating or updating
      const isUpdating = !!existingProject;
      
      // Enhanced debug information before upload attempt
      console.log(`Attempting to ${isUpdating ? 'update' : 'create'} project with:`, {
        title: formData.title,
        hasMainImage: !!formData.mainImageFile,
        mainImageSize: formData.mainImageFile ? `${(formData.mainImageFile.size / 1024).toFixed(2)} KB` : 'N/A',
        mainImageType: formData.mainImageFile?.type,
        mediaCount: formData.mediaFiles?.length || 0,
        mainImageName: formData.mainImageFile?.name || 'N/A'
      });
      
      // Log supported image types if we're uploading a main image
      if (formData.mainImageFile) {
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(formData.mainImageFile.type)) {
          console.warn(`Potentially unsupported image type: ${formData.mainImageFile.type}. This may cause issues with Cloudinary.`);
        }
      }
      
      let result;
      if (isUpdating) {
        result = await updateProject(existingProject.id, formData);
      } else {
        result = await createProject(formData);
      }
      
      onSuccess(result.id);
    } catch (err: any) {
      console.error('Project creation error:', err);
      
      // Create a more detailed error message
      let errorMessage = err.message || 'An error occurred while creating the project';
      
      // Check for specific upload errors
      if (errorMessage.includes('Failed to upload')) {
        errorMessage = 'Failed to upload image to Cloudinary. Please check that your image file is valid and try again.';
      } else if (errorMessage.includes('permission_denied')) {
        errorMessage = 'Firebase permission denied. Please check your authentication status.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-8 py-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          {existingProject ? (
            <>
              <Edit className="w-8 h-8" />
              Edit Project: {existingProject.title}
            </>
          ) : (
            <>
              <Upload className="w-8 h-8" />
              Add New Project
            </>
          )}
        </h2>
        <p className="text-blue-100 mt-2">
          {existingProject ? 'Update your project details and media' : 'Create a new project entry for your portfolio'}
        </p>
      </div>
      
      <div className="p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                  <p className="font-medium mb-1">Troubleshooting tips:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Verify your image file is valid and not corrupted</li>
                    <li>Check your Cloudinary configuration</li>
                    <li>Ensure you have proper Firebase permissions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="Enter your project title..."
                  required
                />
              </div>
              
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                >
                  <option value="">Choose a category...</option>
                  <option value="web">🌐 Web Development</option>
                  <option value="mobile">📱 Mobile App</option>
                  <option value="desktop">💻 Desktop Application</option>
                  <option value="ai">🤖 AI/Machine Learning</option>
                  <option value="design">🎨 UI/UX Design</option>
                  <option value="game">🎮 Game Development</option>
                  <option value="other">🔧 Other</option>
                </select>
              </div>
              
              {/* Project Date - only show for existing projects */}
              {existingProject && (
                <div>
                  <label htmlFor="createdAt" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Project Date
                  </label>
                  <input
                    type="date"
                    id="createdAt"
                    name="createdAt"
                    value={formData.createdAt ? new Date(formData.createdAt).toISOString().split('T')[0] : ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    This will update the project's creation date
                  </p>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                placeholder="Describe your project in detail..."
                required
              ></textarea>
            </div>
          </div>
          
          {/* Technologies & Tools Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
              Technologies & Tools
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Technologies */}
              <div>
                <label htmlFor="technologies" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  🔧 Technologies Used
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    id="tech-input"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={handleTechKeyDown}
                    placeholder="Add technology and press Enter"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    Add
                  </button>
                </div>
                {formData.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-800 dark:to-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700 shadow-sm"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() => handleRemoveTech(tech)}
                          className="ml-2 inline-flex text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 transition-colors duration-200"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Tools */}
              <div>
                <label htmlFor="tools" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  🛠️ Development Tools
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    id="tool-input"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyDown={handleToolKeyDown}
                    placeholder="Add tool and press Enter"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={handleAddTool}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    Add
                  </button>
                </div>
                {formData.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.tools.map((tool, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-800 dark:to-green-900 dark:text-green-100 border border-green-200 dark:border-green-700 shadow-sm"
                      >
                        {tool}
                        <button
                          type="button"
                          onClick={() => handleRemoveTool(tool)}
                          className="ml-2 inline-flex text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100 transition-colors duration-200"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Links & Settings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              Links & Settings
            </h3>
            
            <div className="space-y-4">
              {/* Links */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="githubLink" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🐙 GitHub Repository
                  </label>
                  <input
                    type="url"
                    id="githubLink"
                    name="githubLink"
                    value={formData.githubLink}
                    onChange={handleChange}
                    placeholder="https://github.com/username/repo"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label htmlFor="demoLink" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🌐 Live Demo
                  </label>
                  <input
                    type="url"
                    id="demoLink"
                    name="demoLink"
                    value={formData.demoLink}
                    onChange={handleChange}
                    placeholder="https://your-demo-site.com"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
              
              {/* Project Settings */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-all duration-200"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    ⭐ Featured Project
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="visible"
                    checked={formData.visible}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded transition-all duration-200"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">
                    👁️ Visible to Public
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Media Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
              Project Media
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📸 Main Project Image (Optional)
                </label>
                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200">
                  {mainImagePreview ? (
                    <div className="relative">
                      <img 
                        src={mainImagePreview} 
                        alt="Main image preview" 
                        className="w-full h-40 object-cover rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                        onClick={() => {
                          setMainImagePreview(null);
                          setFormData(prev => ({ ...prev, mainImageFile: undefined }));
                          if (mainImageInputRef.current) mainImageInputRef.current.value = '';
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <label
                        htmlFor="main-image-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                      >
                        Choose Image
                        <input 
                          id="main-image-upload"
                          name="main-image-upload"
                          type="file"
                          ref={mainImageInputRef}
                          className="sr-only"
                          onChange={handleMainImageChange}
                          accept="image/*"
                        />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        PNG, JPG, GIF supported
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Additional Media Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  🎬 Additional Media (Images/Videos)
                </label>
                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200">
                  <div className="text-center py-8">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      Choose Files
                      <input 
                        id="media-upload"
                        name="media-upload" 
                        type="file"
                        multiple
                        ref={mediaInputRef}
                        className="sr-only"
                        onChange={handleMediaChange}
                        accept="image/*,video/*"
                      />
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      PNG, JPG, GIF, MP4, WebM supported
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Media Previews */}
            {mediaPreviewList.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Media Previews</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {mediaPreviewList.map((media, index) => (
                    <div key={index} className="relative group">
                      {media.type === 'image' ? (
                        <img 
                          src={media.preview} 
                          alt={`Media preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200"
                        />
                      ) : (
                        <video 
                          src={media.preview}
                          className="w-full h-20 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200" 
                          controls={false}
                          muted
                        />
                      )}
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                        onClick={() => handleRemoveMediaPreview(index)}
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md">
                        {media.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-all duration-200 hover:shadow-md"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    {existingProject ? (
                      <>
                        <Edit size={20} />
                        <span>Update Project</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>Create Project</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
