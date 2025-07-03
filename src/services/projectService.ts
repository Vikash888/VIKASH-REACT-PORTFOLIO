/**
 * Firebase Realtime Database Project Service
 * 
 * This service manages project metadata in Firebase Realtime Database 
 * and project media files in Cloudinary CDN.
 * 
 * Data Storage Strategy:
 * - Project metadata (title, description, etc.) → Firebase RTDB
 * - Media files (images, videos) → Cloudinary CDN
 * - Media URLs and public_ids → Referenced in RTDB metadata
 * 
 * Permissions:
 * - Any authenticated admin user can create, edit, and delete projects
 * - Public users can only read visible projects
 */

import { ref, push, set, get, remove, update } from 'firebase/database';
import { database, auth } from '../config/firebase';
import { cloudinaryService, CloudinaryUploadResponse } from './cloudinaryService';

/**
 * Check if user is authenticated for Firebase operations
 * @returns boolean indicating if user is authenticated
 */
const isUserAuthenticated = (): boolean => {
  try {
    return !!(auth && auth.currentUser);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Ensure user is authenticated before Firebase write operations
 * @throws Error if user is not authenticated
 */
const ensureAuthenticated = (): void => {
  if (!isUserAuthenticated()) {
    throw new Error('User must be authenticated to perform this operation');
  }
};

/**
 * Project media interface - represents media files stored in Cloudinary
 */
export interface ProjectMedia {
  url: string;        // Cloudinary secure_url
  public_id: string;  // Cloudinary public_id for deletion/management
  type: 'image' | 'video';
  order?: number;     // Display order for media gallery
}

/**
 * Project metadata interface - core project information stored in RTDB
 */
export interface ProjectMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  technologies: string[];
  tools: string[];
  githubLink?: string;
  demoLink?: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  order?: number;
}

/**
 * Complete project interface - combines metadata with media references
 */
export interface Project extends ProjectMeta {
  mainImage: string;          // Main project image URL from Cloudinary
  mainImagePublicId?: string; // Cloudinary public_id for main image
  media: ProjectMedia[];      // Array of additional media files
  views: number;              // View counter
  videoUrl?: string;          // Legacy field for backward compatibility
}

export interface ProjectUploadData {
  title: string;
  description: string;
  category: string;
  technologies: string[];
  tools: string[];
  githubLink?: string;
  demoLink?: string;
  featured: boolean;
  visible: boolean;
  mainImageFile?: File;
  mediaFiles?: File[];
  createdAt?: string; // For setting/editing project creation date
}

/**
 * Get all projects from Firebase Realtime Database
 */
export const getProjects = async (): Promise<Project[]> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    const projectsRef = ref(database, 'projects');
    const snapshot = await get(projectsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    return Object.keys(data).map(key => ({
      ...data[key],
      id: key
    }));
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

/**
 * Get a project by ID from Firebase Realtime Database
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      ...snapshot.val(),
      id: projectId
    };
  } catch (error) {
    console.error(`Error fetching project with ID ${projectId}:`, error);
    throw error;
  }
};

/**
 * Create a new project in Firebase Realtime Database with media uploads to Cloudinary
 * Stores metadata in RTDB and media files in Cloudinary CDN
 */
export const createProject = async (projectData: ProjectUploadData): Promise<Project> => {
  try {
    // Ensure user is authenticated before proceeding
    ensureAuthenticated();

    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Validate project data
    const validationErrors = validateProjectData(projectData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Generate a new project ID in Firebase RTDB
    const projectsRef = ref(database, 'projects');
    const newProjectRef = push(projectsRef);
    const projectId = newProjectRef.key;

    if (!projectId) {
      throw new Error('Failed to generate project ID');
    }

    let mainImageResponse: CloudinaryUploadResponse | null = null;
    const media: ProjectMedia[] = [];

    // Upload main image to Cloudinary if provided
    if (projectData.mainImageFile) {
      try {
        mainImageResponse = await cloudinaryService.uploadProjectMedia(projectData.mainImageFile, projectId);
      } catch (error) {
        throw new Error(`Failed to upload main image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Upload additional media files to Cloudinary if provided
    if (projectData.mediaFiles && projectData.mediaFiles.length > 0) {
      for (let i = 0; i < projectData.mediaFiles.length; i++) {
        const file = projectData.mediaFiles[i];
        try {
          const cloudinaryResponse = await cloudinaryService.uploadProjectMedia(file, projectId);
          
          media.push({
            url: cloudinaryResponse.secure_url,
            public_id: cloudinaryResponse.public_id,
            type: cloudinaryResponse.resource_type === 'video' ? 'video' : 'image',
            order: i
          });
        } catch (error) {
          console.error(`Failed to upload media file ${i + 1}:`, error);
          // Continue with other files if one fails
        }
      }
    }

    // Create project metadata for RTDB storage
    const timestamp = new Date().toISOString();
    const project: Project = {
      id: projectId,
      title: projectData.title.trim(),
      description: projectData.description.trim(),
      category: projectData.category.trim(),
      technologies: projectData.technologies || [],
      tools: projectData.tools || [],
      githubLink: projectData.githubLink?.trim() || '',
      demoLink: projectData.demoLink?.trim() || '',
      featured: projectData.featured || false,
      visible: projectData.visible !== undefined ? projectData.visible : true,
      createdAt: projectData.createdAt || timestamp,
      updatedAt: timestamp,
      mainImage: mainImageResponse ? mainImageResponse.secure_url : '',
      media: media,
      views: 0
    };

    // If a main image was uploaded, add its public ID to the project data
    // This prevents Firebase error: set failed: value argument contains undefined
    if (mainImageResponse && mainImageResponse.public_id) {
      project.mainImagePublicId = mainImageResponse.public_id;
    }

    // Save the project metadata to Firebase RTDB
    await set(newProjectRef, project);

    console.log(`✅ Project created successfully: ${projectId}`);
    console.log(`📊 Metadata stored in Firebase RTDB`);
    console.log(`📁 Media files stored in Cloudinary CDN`);

    return project;
  } catch (error: any) {
    console.error("❌ Error creating project:", error);
    
    // Add more context to the error for better debugging
    const enhancedError = new Error(
      `Failed to create project: ${error.message || 'Unknown error'}`
    );
    
    // Add original error as a property for better debugging
    (enhancedError as any).originalError = error;
    
    throw enhancedError;
  }
};

/**
 * Update an existing project in Firebase Realtime Database
 */
export const updateProject = async (
  projectId: string, 
  projectData: Partial<ProjectUploadData>
): Promise<Project> => {
  try {
    // Ensure user is authenticated before proceeding
    ensureAuthenticated();

    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Get the current project data
    const currentProject = await getProjectById(projectId);
    if (!currentProject) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    let mainImageResponse: CloudinaryUploadResponse | null = null;
    const updatedMedia = [...(currentProject.media || [])];

    // Upload main image if provided
    if (projectData.mainImageFile) {
      mainImageResponse = await cloudinaryService.uploadProjectMedia(projectData.mainImageFile, projectId);
      
      // Delete old main image if we have its public ID
      if (currentProject.mainImagePublicId) {
        try {
          await cloudinaryService.deleteMedia(currentProject.mainImagePublicId);
        } catch (error) {
          console.error("Error deleting old main image:", error);
        }
      }
    }

    // Upload additional media files if provided
    if (projectData.mediaFiles && projectData.mediaFiles.length > 0) {
      for (let i = 0; i < projectData.mediaFiles.length; i++) {
        const file = projectData.mediaFiles[i];
        const cloudinaryResponse = await cloudinaryService.uploadProjectMedia(file, projectId);
        
        updatedMedia.push({
          url: cloudinaryResponse.secure_url,
          public_id: cloudinaryResponse.public_id,
          type: cloudinaryResponse.resource_type === 'video' ? 'video' : 'image',
          order: (currentProject.media?.length || 0) + i
        });
      }
    }

    // Update metadata for the project
    const { mainImageFile, mediaFiles, ...dataWithoutFiles } = projectData;
    
    const updates: Partial<Project> = {
      ...dataWithoutFiles,
      updatedAt: new Date().toISOString(),
      // Only update createdAt if specifically provided, otherwise keep the existing value
      createdAt: dataWithoutFiles.createdAt || currentProject.createdAt,
      media: updatedMedia
    };

    // Update main image if it was uploaded
    if (mainImageResponse) {
      updates.mainImage = mainImageResponse.secure_url;
      updates.mainImagePublicId = mainImageResponse.public_id;
    }

    // Update the project in Firebase RTDB
    const projectRef = ref(database, `projects/${projectId}`);
    await update(projectRef, updates);

    // Get the updated project
    const updatedProject = await getProjectById(projectId);
    if (!updatedProject) {
      throw new Error(`Failed to retrieve updated project with ID ${projectId}`);
    }

    return updatedProject;
  } catch (error) {
    console.error(`Error updating project with ID ${projectId}:`, error);
    throw error;
  }
};

/**
 * Delete a project and its media from Firebase Realtime Database and Cloudinary
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    // Ensure user is authenticated before proceeding
    ensureAuthenticated();

    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Get the project to delete its media
    const project = await getProjectById(projectId);
    if (project) {
      // Delete main image if it exists
      if (project.mainImagePublicId) {
        try {
          await cloudinaryService.deleteMedia(project.mainImagePublicId);
        } catch (error) {
          console.error("Error deleting main image:", error);
        }
      }

      // Delete all media files
      if (project.media && project.media.length > 0) {
        for (const media of project.media) {
          if (media.public_id) {
            try {
              await cloudinaryService.deleteMedia(media.public_id);
            } catch (error) {
              console.error(`Error deleting media with public ID ${media.public_id}:`, error);
            }
          }
        }
      }
    }

    // Delete the project from Firebase RTDB
    const projectRef = ref(database, `projects/${projectId}`);
    await remove(projectRef);
  } catch (error) {
    console.error(`Error deleting project with ID ${projectId}:`, error);
    throw error;
  }
};

/**
 * Remove a specific media item from a project
 */
export const removeProjectMedia = async (projectId: string, mediaPublicId: string): Promise<void> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Get the current project
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    // Filter out the media to remove
    const updatedMedia = project.media.filter(media => media.public_id !== mediaPublicId);

    // Delete the media from Cloudinary
    try {
      await cloudinaryService.deleteMedia(mediaPublicId);
    } catch (error) {
      console.error(`Error deleting media with public ID ${mediaPublicId}:`, error);
    }

    // Update the project with the filtered media array
    const projectRef = ref(database, `projects/${projectId}`);
    await update(projectRef, {
      media: updatedMedia,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error removing media ${mediaPublicId} from project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Update the order of project media items
 */
export const updateProjectMediaOrder = async (
  projectId: string,
  mediaOrderUpdates: { public_id: string; order: number }[]
): Promise<void> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Get the current project
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    // Create a map of public_id to new order
    const orderMap = new Map();
    mediaOrderUpdates.forEach(update => {
      orderMap.set(update.public_id, update.order);
    });

    // Update each media item's order
    const updatedMedia = project.media.map(media => ({
      ...media,
      order: orderMap.has(media.public_id) ? orderMap.get(media.public_id) : media.order
    }));

    // Sort the media by order
    updatedMedia.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Update the project with the new media order
    const projectRef = ref(database, `projects/${projectId}`);
    await update(projectRef, {
      media: updatedMedia,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating media order for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Update the order of projects
 */
export const updateProjectsOrder = async (projectOrders: { id: string; order: number }[]): Promise<void> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    // Update each project's order
    const updates: { [path: string]: number } = {};
    projectOrders.forEach(({ id, order }) => {
      updates[`projects/${id}/order`] = order;
    });

    // Perform a multi-path update
    await update(ref(database), updates);
  } catch (error) {
    console.error("Error updating projects order:", error);
    throw error;
  }
};

/**
 * Increment project view count
 */
export const incrementProjectViews = async (projectId: string): Promise<void> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);

    if (!snapshot.exists()) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const project = snapshot.val();
    const currentViews = project.views || 0;

    await update(projectRef, {
      views: currentViews + 1,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error incrementing views for project ${projectId}:`, error);
  }
};

/**
 * Toggle project visibility
 */
export const toggleProjectVisibility = async (projectId: string): Promise<boolean> => {
  try {
    if (!database) {
      throw new Error('Firebase database is not initialized');
    }

    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const newVisibility = !project.visible;
    
    const projectRef = ref(database, `projects/${projectId}`);
    await update(projectRef, {
      visible: newVisibility,
      updatedAt: new Date().toISOString()
    });

    return newVisibility;
  } catch (error) {
    console.error(`Error toggling visibility for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Validate project data structure
 */
export const validateProjectData = (projectData: ProjectUploadData): string[] => {
  const errors: string[] = [];
  
  if (!projectData.title?.trim()) {
    errors.push('Project title is required');
  }
  
  if (!projectData.description?.trim()) {
    errors.push('Project description is required');
  }
  
  if (!projectData.category?.trim()) {
    errors.push('Project category is required');
  }
  
  if (projectData.technologies && !Array.isArray(projectData.technologies)) {
    errors.push('Technologies must be an array');
  }
  
  if (projectData.tools && !Array.isArray(projectData.tools)) {
    errors.push('Tools must be an array');
  }
  
  if (projectData.githubLink && !isValidUrl(projectData.githubLink)) {
    errors.push('GitHub link must be a valid URL');
  }
  
  if (projectData.demoLink && !isValidUrl(projectData.demoLink)) {
    errors.push('Demo link must be a valid URL');
  }
  
  return errors;
};

/**
 * Helper function to validate URLs
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
